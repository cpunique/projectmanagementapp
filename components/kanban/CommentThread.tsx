'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CardComment, MentionedUser, BoardCollaborator } from '@/types';
import Comment from './Comment';
import MentionAutocomplete from './MentionAutocomplete';

interface MentionUser {
  userId: string;
  email: string;
  isOwner?: boolean;
}

interface CommentThreadProps {
  comments: CardComment[];
  currentUserId: string;
  currentUserEmail: string;
  boardId: string;
  cardId: string;
  onAddComment: (content: string, mentions?: MentionedUser[]) => void;
  onEditComment: (commentId: string, content: string, mentions?: MentionedUser[]) => void;
  onDeleteComment: (commentId: string) => void;
  canComment: boolean;
  // Board info for mentions
  ownerId: string;
  ownerEmail?: string;
  collaborators?: BoardCollaborator[];
}

export default function CommentThread({
  comments,
  currentUserId,
  currentUserEmail,
  boardId,
  cardId,
  onAddComment,
  onEditComment,
  onDeleteComment,
  canComment,
  ownerId,
  ownerEmail,
  collaborators = [],
}: CommentThreadProps) {
  const [newComment, setNewComment] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Mention state
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [trackedMentions, setTrackedMentions] = useState<MentionedUser[]>([]);

  // Build list of mentionable users (owner + collaborators, excluding current user)
  const mentionableUsers: MentionUser[] = [
    // Add owner first if we have their email
    ...(ownerEmail && ownerId !== currentUserId
      ? [{ userId: ownerId, email: ownerEmail, isOwner: true }]
      : []),
    // Add collaborators
    ...collaborators
      .filter((c) => c.userId !== currentUserId)
      .map((c) => ({ userId: c.userId, email: c.email })),
  ];

  // Sort comments by creation time (oldest first)
  const sortedComments = [...comments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Filter mentionable users based on query
  const filteredMentionUsers = mentionableUsers.filter((user) => {
    const query = mentionQuery.toLowerCase();
    const emailName = user.email.split('@')[0].toLowerCase();
    return emailName.includes(query) || user.email.toLowerCase().includes(query);
  });

  // Extract mentions from content
  const extractMentions = useCallback((content: string): MentionedUser[] => {
    const mentions: MentionedUser[] = [];

    // First, check tracked mentions (from autocomplete selection)
    for (const tracked of trackedMentions) {
      if (!mentions.some(m => m.userId === tracked.userId)) {
        const displayName = tracked.email.split('@')[0];
        if (content.includes(`@${displayName}`) || content.includes(`@${tracked.email}`)) {
          mentions.push(tracked);
        }
      }
    }

    // Also check for any @username patterns that match mentionable users
    // This handles cases where user typed manually or we need to match display names
    const mentionPatternRegex = /@(\w+[\w.-]*)/g;
    let match;

    while ((match = mentionPatternRegex.exec(content)) !== null) {
      const mentionText = match[1].toLowerCase();
      // Find user by display name (part before @) or full email
      const user = mentionableUsers.find(u => {
        const displayName = u.email.split('@')[0].toLowerCase();
        return displayName === mentionText || u.email.toLowerCase() === mentionText;
      });
      if (user && !mentions.some(m => m.userId === user.userId)) {
        mentions.push({ userId: user.userId, email: user.email });
      }
    }

    console.log('[CommentThread] Extracted mentions:', mentions, 'from content:', content);
    return mentions;
  }, [mentionableUsers, trackedMentions]);

  const handleSubmit = () => {
    if (newComment.trim()) {
      const mentions = extractMentions(newComment);
      onAddComment(newComment.trim(), mentions.length > 0 ? mentions : undefined);
      setNewComment('');
      setTrackedMentions([]);
      // Scroll to bottom after adding comment
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  // Calculate cursor position for mention menu
  const calculateMentionPosition = useCallback(() => {
    if (!textareaRef.current) return { top: 0, left: 0 };

    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();

    // Get approximate position based on cursor
    // This is a simplified calculation - for accurate positioning, you'd need a more complex solution
    const lineHeight = 20;
    const lines = textarea.value.substring(0, textarea.selectionStart).split('\n');
    const currentLineIndex = lines.length - 1;
    const currentLine = lines[currentLineIndex];

    // Approximate character width (monospace assumption, adjusted for proportional)
    const charWidth = 8;
    const leftOffset = Math.min(currentLine.length * charWidth, textarea.clientWidth - 200);

    return {
      top: rect.top + (currentLineIndex + 1) * lineHeight + 24,
      left: rect.left + Math.max(0, leftOffset),
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setNewComment(value);

    // Check for @ trigger
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if we're in a mention (no spaces after @, or at the very start)
      const hasSpace = textAfterAt.includes(' ');
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      const isValidStart = charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtIndex === 0;

      if (!hasSpace && isValidStart && mentionableUsers.length > 0) {
        setMentionQuery(textAfterAt);
        setMentionStartIndex(lastAtIndex);
        setMentionPosition(calculateMentionPosition());
        setShowMentionMenu(true);
        setSelectedMentionIndex(0);
      } else {
        setShowMentionMenu(false);
      }
    } else {
      setShowMentionMenu(false);
    }
  };

  const handleMentionSelect = (user: MentionUser) => {
    if (mentionStartIndex === -1) return;

    const displayName = user.email.split('@')[0];
    const before = newComment.substring(0, mentionStartIndex);
    const after = newComment.substring(textareaRef.current?.selectionStart || mentionStartIndex);

    // Insert mention with display name
    const newValue = `${before}@${displayName} ${after}`;
    setNewComment(newValue);

    // Track this mention
    setTrackedMentions(prev => {
      if (prev.some(m => m.userId === user.userId)) return prev;
      return [...prev, { userId: user.userId, email: user.email }];
    });

    setShowMentionMenu(false);
    setMentionStartIndex(-1);

    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = before.length + displayName.length + 2; // +2 for @ and space
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentionMenu && filteredMentionUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev =>
          prev < filteredMentionUsers.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev =>
          prev > 0 ? prev - 1 : filteredMentionUsers.length - 1
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleMentionSelect(filteredMentionUsers[selectedMentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowMentionMenu(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey && !showMentionMenu) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [newComment]);

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 mb-3 w-full text-left"
      >
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Comments
        </span>
        {comments.length > 0 && (
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
            {comments.length}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="space-y-4">
          {/* Comments list */}
          {sortedComments.length > 0 ? (
            <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
              {sortedComments.map((comment) => (
                <Comment
                  key={comment.id}
                  comment={comment}
                  currentUserId={currentUserId}
                  onEdit={onEditComment}
                  onDelete={onDeleteComment}
                  canModify={canComment}
                />
              ))}
              <div ref={commentsEndRef} />
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic py-2">
              No comments yet. Be the first to comment!
            </p>
          )}

          {/* Add comment form */}
          {canComment ? (
            <div className="flex gap-3 pt-2 relative">
              {/* User avatar */}
              <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                {currentUserEmail.split('@')[0].slice(0, 2).toUpperCase()}
              </div>

              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={newComment}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={mentionableUsers.length > 0
                    ? "Write a comment... Use @ to mention someone"
                    : "Write a comment... (Enter to send, Shift+Enter for new line)"
                  }
                  className="w-full px-3 py-2 text-sm border rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500"
                  rows={1}
                />
                <div className="flex justify-between items-center mt-2">
                  {mentionableUsers.length > 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      Type @ to mention
                    </span>
                  )}
                  <div className="flex-1" />
                  <button
                    onClick={handleSubmit}
                    disabled={!newComment.trim()}
                    className="px-4 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Comment
                  </button>
                </div>
              </div>

              {/* Mention autocomplete dropdown */}
              {showMentionMenu && typeof window !== 'undefined' && createPortal(
                <MentionAutocomplete
                  isOpen={showMentionMenu}
                  searchQuery={mentionQuery}
                  collaborators={filteredMentionUsers}
                  position={mentionPosition}
                  onSelect={handleMentionSelect}
                  onClose={() => setShowMentionMenu(false)}
                  selectedIndex={selectedMentionIndex}
                />,
                document.body
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic py-2 text-center">
              Sign in to add comments
            </p>
          )}
        </div>
      )}
    </div>
  );
}

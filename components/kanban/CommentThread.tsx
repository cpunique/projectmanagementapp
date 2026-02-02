'use client';

import { useState, useRef, useEffect } from 'react';
import { CardComment } from '@/types';
import Comment from './Comment';

interface CommentThreadProps {
  comments: CardComment[];
  currentUserId: string;
  currentUserEmail: string;
  boardId: string;
  cardId: string;
  onAddComment: (content: string) => void;
  onEditComment: (commentId: string, content: string) => void;
  onDeleteComment: (commentId: string) => void;
  canComment: boolean; // Can the current user add comments?
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
}: CommentThreadProps) {
  const [newComment, setNewComment] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Sort comments by creation time (oldest first)
  const sortedComments = [...comments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const handleSubmit = () => {
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
      // Scroll to bottom after adding comment
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
            <div className="flex gap-3 pt-2">
              {/* User avatar */}
              <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                {currentUserEmail.split('@')[0].slice(0, 2).toUpperCase()}
              </div>

              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Write a comment... (Enter to send, Shift+Enter for new line)"
                  className="w-full px-3 py-2 text-sm border rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500"
                  rows={1}
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleSubmit}
                    disabled={!newComment.trim()}
                    className="px-4 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Comment
                  </button>
                </div>
              </div>
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

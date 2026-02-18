'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import DOMPurify from 'dompurify';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from '@/lib/firebase/AuthContext';
import { useUnreadComments } from '@/lib/hooks/useUnreadComments';
import { type Card as CardType } from '@/types';
import { PRIORITY_LABELS, DESCOPED_COLUMN_KEYWORDS } from '@/lib/constants';
import { formatDate, isOverdue, isLightColor, getDefaultCardColor } from '@/lib/utils';
import CardContextMenu from './CardContextMenu';

const CardModal = dynamic(() => import('./CardModal'), { ssr: false });
const AIPromptModal = dynamic(() => import('./AIPromptModal'), { ssr: false });

interface CardProps {
  card: CardType;
  boardId: string;
  columnId: string;
  onDragStart: (e: React.DragEvent, cardId: string, columnId: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  canEdit: boolean;
}

// Highlight matching text in search results
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-700/60 text-inherit rounded-sm px-0.5">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  );
}

const Card = ({ card, boardId, columnId, onDragStart, onDragEnd, isDragging, canEdit }: CardProps) => {
  const { deleteCard, boards } = useKanbanStore();
  const searchQuery = useKanbanStore((state) => state.searchQuery);
  const { user } = useAuth();
  const { getUnreadCount, markAsSeen } = useUnreadComments();
  const [isHovering, setIsHovering] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [showAILockModal, setShowAILockModal] = useState(false);
  const [showNotesTooltip, setShowNotesTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const notesIconRef = useRef<HTMLDivElement>(null);

  // AI features locked for unauthenticated users or read-only access (can still view existing prompts)
  const isAIFeatureLocked = !user || !canEdit;

  // Detect actual theme from DOM instead of store (since store's darkMode is broken)
  const [actualDarkMode, setActualDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return true;
  });

  // Listen for theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setActualDarkMode(isDark);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  const handleDelete = () => {
    if (!canEdit) return;
    if (confirm(`Delete card "${card.title}"`)) {
      deleteCard(boardId, card.id);
    }
  };

  // Calculate checklist progress
  const checklistItems = card.checklist || [];
  const completedItems = checklistItems.filter((item) => item.completed).length;
  const checklistProgress = checklistItems.length > 0 ? Math.round((completedItems / checklistItems.length) * 100) : 0;

  // Determine if due date is overdue
  const isDue = card.dueDate && isOverdue(card.dueDate);

  // Helper to check if notes have actual content (strip HTML tags)
  const hasNotes = (notes: string | undefined): boolean => {
    if (!notes) return false;
    // Strip HTML tags and check if there's any text content
    const stripped = notes.replace(/<[^>]*>/g, '').trim();
    return stripped.length > 0;
  };

  // Check if card is descoped
  const isDescoped = card.status === 'descoped';

  // Get unread comment count
  const unreadCount = getUnreadCount(card.id, card.comments || []);
  const totalComments = card.comments?.length || 0;

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // Determine text color based on background color
  const defaultColor = getDefaultCardColor(actualDarkMode);
  const cardColor = card.color || defaultColor;
  const isLight = isLightColor(cardColor);
  const textColor = isLight ? 'text-gray-900' : 'text-white';
  const descColor = isLight ? 'text-gray-600' : 'text-gray-200';
  const metaColor = isLight ? 'text-gray-500' : 'text-gray-300';

  return (
    <>
      <motion.div
        layout
        draggable
        data-card-element="true"
        onDragStart={(e) => onDragStart(e as unknown as React.DragEvent<HTMLDivElement>, card.id, columnId)}
        onDragEnd={onDragEnd}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onContextMenu={handleContextMenu}
        onClick={(e) => {
          // Only open modal if not clicking on action buttons
          if (!(e.target as HTMLElement).closest('button')) {
            setIsModalOpen(true);
          }
        }}
        className={`group relative rounded-xl border cursor-pointer transition-all duration-200 ease-out w-60 flex flex-col ${
          isDragging ? 'opacity-50 scale-105' : isDescoped ? 'opacity-60 grayscale-[30%]' : 'opacity-100'
        } border-gray-200/50 dark:border-gray-700/50`}
        style={{
          padding: '1rem',
          gap: '0.5rem',
          backgroundColor: cardColor,
          boxShadow: isDragging
            ? '0 20px 40px rgba(0, 0, 0, 0.25), 0 10px 15px rgba(0, 0, 0, 0.15)'
            : isHovering
              ? '0 8px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.1)'
              : '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)'
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{
          layout: { type: 'spring', stiffness: 350, damping: 35 },
          default: { duration: 0.2 }
        }}
        whileHover={{ y: -4, scale: 1.02 }}
      >
        {/* Descoped Badge - Bottom Right */}
        {isDescoped && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-gray-500 dark:bg-gray-600 text-white text-xs font-medium rounded-full whitespace-nowrap">
            📋 DESCOPED
          </div>
        )}

        {/* Action Buttons */}
        {isHovering && !isDescoped && (
          <div className="absolute top-2 right-2 flex gap-1">
            {/* Generate Instructions Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isAIFeatureLocked && !card.aiPrompt) {
                  // Can view existing instructions, but can't generate new ones
                  setShowAILockModal(true);
                } else {
                  setIsAIModalOpen(true);
                }
              }}
              className={`p-1 rounded transition-colors duration-150 pointer-events-auto relative ${
                isAIFeatureLocked && !card.aiPrompt
                  ? 'opacity-60 cursor-not-allowed text-gray-400 dark:text-gray-600'
                  : card.aiPrompt
                  ? 'text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400'
              }`}
              title={isAIFeatureLocked && !card.aiPrompt ? "Sign up to generate instructions" : (card.aiPrompt ? "View instructions (Pro)" : "Generate instructions (Pro)")}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {/* Pro badge */}
              <span className="absolute -top-1.5 -right-2 text-[8px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 px-1 rounded">Pro</span>
              {isAIFeatureLocked && !card.aiPrompt && <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full border border-white" />}
            </button>

            {/* Edit Button - disabled for viewers */}
            {canEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsModalOpen(true);
                }}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 pointer-events-auto"
                title="Edit card"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}

            {/* Delete Button - disabled for viewers */}
            {canEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 pointer-events-auto"
                title="Delete card"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Card Title */}
        <h4 className={`font-semibold text-sm ${textColor} pr-16 line-clamp-2 leading-tight pointer-events-none`}>
          <HighlightText text={card.title} query={searchQuery} />
        </h4>

        {/* Description Preview */}
        {card.description && (
          <p className={`text-xs ${descColor} line-clamp-2 leading-relaxed pointer-events-none`}>
            {card.description}
          </p>
        )}

        {/* Tags & Priority Row */}
        <div className="flex flex-wrap gap-1.5 pointer-events-none">
          {/* Priority Badge */}
          {card.priority && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                card.priority === 'high'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  : card.priority === 'medium'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              }`}
            >
              {PRIORITY_LABELS[card.priority]}
            </span>
          )}

          {/* Tags */}
          {card.tags && card.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            >
              {tag}
            </span>
          ))}
          {card.tags && card.tags.length > 2 && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              +{card.tags.length - 2}
            </span>
          )}
        </div>

        {/* Checklist Progress Ring */}
        {card.checklist && card.checklist.length > 0 && (
          <div className="flex items-center gap-2.5 pointer-events-none">
            {/* Circular Progress Ring */}
            <div className="relative w-8 h-8 flex-shrink-0">
              <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 36 36">
                {/* Background circle */}
                <circle
                  className={isLight ? 'text-gray-200' : 'text-gray-600'}
                  strokeWidth="3"
                  stroke="currentColor"
                  fill="transparent"
                  r="15"
                  cx="18"
                  cy="18"
                />
                {/* Progress circle */}
                <circle
                  className={checklistProgress === 100 ? 'text-green-500' : 'text-purple-500'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="15"
                  cx="18"
                  cy="18"
                  strokeDasharray={`${checklistProgress * 0.94} 100`}
                  style={{ transition: 'stroke-dasharray 0.3s ease' }}
                />
              </svg>
              {/* Percentage in center */}
              <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${textColor}`}>
                {checklistProgress === 100 ? '✓' : `${checklistProgress}%`}
              </span>
            </div>
            <div className="flex-1">
              <span className={`text-xs ${descColor} font-medium`}>
                {completedItems} of {checklistItems.length} done
              </span>
            </div>
          </div>
        )}

        {/* Metadata Footer */}
        {(card.dueDate || hasNotes(card.notes) || totalComments > 0 || (card.attachments && card.attachments.length > 0)) && (
          <div className={`flex items-center gap-3 pt-2 mt-auto border-t ${isLight ? 'border-gray-100' : 'border-gray-600'}`}>
            {/* Attachments Indicator */}
            {card.attachments && card.attachments.length > 0 && (
              <div className={`flex items-center gap-1 text-xs pointer-events-none ${metaColor}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span>{card.attachments.length}</span>
              </div>
            )}

            {/* Due Date */}
            {card.dueDate && (
              <div className={`flex items-center gap-1 text-xs pointer-events-none ${
                isDue
                  ? 'text-red-600 font-medium'
                  : metaColor
              }`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{formatDate(card.dueDate)}</span>
              </div>
            )}

            {/* Comments Indicator */}
            {totalComments > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsModalOpen(true);
                }}
                className={`flex items-center gap-1 text-xs pointer-events-auto transition-colors ${
                  unreadCount > 0
                    ? 'text-purple-600 dark:text-purple-400 font-medium'
                    : metaColor
                }`}
                title={unreadCount > 0 ? `${unreadCount} new comment${unreadCount !== 1 ? 's' : ''}` : `${totalComments} comment${totalComments !== 1 ? 's' : ''}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>{totalComments}</span>
                {unreadCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}

            {/* Notes Indicator with Hover Tooltip */}
            {hasNotes(card.notes) && (
              <div
                ref={notesIconRef}
                className="pointer-events-auto"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltipPosition({
                    top: rect.top,
                    left: rect.right + 12
                  });
                  setShowNotesTooltip(true);
                }}
                onMouseLeave={() => setShowNotesTooltip(false)}
              >
                <div className={`flex items-center gap-1 text-xs ${metaColor} cursor-help`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* CardModal - Rendered via Portal to avoid z-index issues */}
      {typeof window !== 'undefined' && createPortal(
        <CardModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            // Mark comments as seen when closing the modal
            if (card.comments && card.comments.length > 0) {
              markAsSeen(card.id);
            }
          }}
          card={card}
          boardId={boardId}
        />,
        document.body
      )}

      {/* AI Prompt Modal - Rendered via Portal */}
      {typeof window !== 'undefined' && createPortal(
        <AIPromptModal
          isOpen={isAIModalOpen}
          onClose={() => setIsAIModalOpen(false)}
          card={card}
          boardId={boardId}
        />,
        document.body
      )}

      {/* AI Lock Modal - Rendered via Portal */}
      {showAILockModal && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[9998] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
          >
            <div className="text-center">
              <div className="text-5xl mb-4">⚡</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                AI Features Available with Sign Up
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                Generate AI-powered instructions for your tasks. Sign up to unlock this feature!
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAILockModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowAILockModal(false);
                    // TODO: Navigate to sign up or open auth modal
                  }}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Sign Up Free
                </button>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Notes Tooltip - Rendered via Portal */}
      {showNotesTooltip && hasNotes(card.notes) && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
          }}
        >
          <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg p-4 shadow-xl w-72 max-h-96 overflow-y-auto">
            <div
              className="prose prose-sm prose-invert max-w-none break-words whitespace-normal leading-relaxed [&>*]:break-words [&_p]:m-0 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:m-0 [&_ul]:mb-2 [&_ol]:m-0 [&_ol]:mb-2 [&_h1]:text-base [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:mb-2 [&_h3]:text-xs [&_h3]:mb-1"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(card.notes || '', {
                  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote'],
                  ALLOWED_ATTR: [],
                  KEEP_CONTENT: true
                })
              }}
            />
            {/* Arrow pointing left */}
            <div className="absolute top-3 right-full">
              <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-gray-900 dark:border-r-gray-700"></div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Context Menu - Rendered via Portal */}
      <CardContextMenu
        isOpen={contextMenu !== null}
        position={contextMenu || { x: 0, y: 0 }}
        card={card}
        boardId={boardId}
        columnId={columnId}
        onClose={() => setContextMenu(null)}
        onEditCard={() => setIsModalOpen(true)}
        onDeleteCard={handleDelete}
      />
    </>
  );
};

export default Card;

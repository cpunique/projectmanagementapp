'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useKanbanStore } from '@/lib/store';
import { type Card as CardType } from '@/types';
import { PRIORITY_LABELS } from '@/lib/constants';
import { formatDate, isOverdue, isLightColor, getDefaultCardColor } from '@/lib/utils';
import CardModal from './CardModal';

interface CardProps {
  card: CardType;
  boardId: string;
  columnId: string;
  onDragStart: (e: React.DragEvent, cardId: string, columnId: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

const Card = ({ card, boardId, columnId, onDragStart, onDragEnd, isDragging }: CardProps) => {
  const { deleteCard } = useKanbanStore();
  const [isHovering, setIsHovering] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showNotesTooltip, setShowNotesTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const notesIconRef = useRef<HTMLDivElement>(null);

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
        onDragStart={(e) => onDragStart(e, card.id, columnId)}
        onDragEnd={onDragEnd}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={(e) => {
          // Only open modal if not clicking on action buttons
          if (!(e.target as HTMLElement).closest('button')) {
            setIsModalOpen(true);
          }
        }}
        className={`group relative rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer transition-all duration-200 ease-out w-60 flex flex-col ${
          isDragging ? 'opacity-50 scale-105' : 'opacity-100 scale-100'
        } hover:-translate-y-0.5 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600`}
        style={{
          padding: '1rem',
          gap: '0.5rem',
          backgroundColor: cardColor,
          boxShadow: isDragging ? '0 10px 20px rgba(0, 0, 0, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.08)'
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{
          layout: { type: 'spring', stiffness: 350, damping: 35 },
          default: { duration: 0.25 }
        }}
        whileHover={{ y: -2 }}
      >
        {/* Action Buttons */}
        {isHovering && (
          <div className="absolute top-2 right-2 flex gap-1">
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
          </div>
        )}

        {/* Card Title */}
        <h4 className={`font-semibold text-sm ${textColor} pr-16 line-clamp-2 leading-tight pointer-events-none`}>
          {card.title}
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

        {/* Checklist Progress */}
        {card.checklist && card.checklist.length > 0 && (
          <div className="flex items-center gap-2 pointer-events-none">
            <svg className={`w-3.5 h-3.5 ${metaColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs ${descColor} font-medium`}>{completedItems}/{checklistItems.length}</span>
                <span className={`text-xs ${metaColor}`}>{checklistProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                <div
                  className="bg-green-500 dark:bg-green-600 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${checklistProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Metadata Footer */}
        {(card.dueDate || (card.notes && card.notes.trim())) && (
          <div className={`flex items-center gap-3 pt-2 mt-auto border-t ${isLight ? 'border-gray-100' : 'border-gray-600'}`}>
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

            {/* Notes Indicator with Hover Tooltip */}
            {card.notes && card.notes.trim() && (
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
          onClose={() => setIsModalOpen(false)}
          card={card}
          boardId={boardId}
        />,
        document.body
      )}

      {/* Notes Tooltip - Rendered via Portal */}
      {showNotesTooltip && card.notes && card.notes.trim() && typeof window !== 'undefined' && createPortal(
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
              dangerouslySetInnerHTML={{ __html: card.notes }}
            />
            {/* Arrow pointing left */}
            <div className="absolute top-3 right-full">
              <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-gray-900 dark:border-r-gray-700"></div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default Card;

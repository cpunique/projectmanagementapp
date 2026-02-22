'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/types';
import { useKanbanStore } from '@/lib/store';
import { DESCOPED_COLUMN_KEYWORDS } from '@/lib/constants';

interface CardContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  card: Card;
  boardId: string;
  columnId: string;
  onClose: () => void;
  onEditCard: () => void;
  onDeleteCard: () => void;
}

const CardContextMenu = ({
  isOpen,
  position,
  card,
  boardId,
  columnId,
  onClose,
  onEditCard,
  onDeleteCard,
}: CardContextMenuProps) => {
  const { moveCard, boards, archiveCard } = useKanbanStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Handle click outside to close menu and suppress browser context menu
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Handle Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Prevent browser context menu while our menu is open
    const handleContextMenu = (e: MouseEvent) => {
      if (isOpen) {
        e.preventDefault();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isOpen, onClose]);

  // Adjust position if menu goes off-screen
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const rect = menuRef.current.getBoundingClientRect();
    const { innerWidth, innerHeight } = window;
    const padding = 8;

    let adjustedX = position.x;
    let adjustedY = position.y;

    // Check if menu goes off right edge
    if (position.x + rect.width + padding > innerWidth) {
      adjustedX = Math.max(padding, innerWidth - rect.width - padding);
    }

    // Check if menu goes off bottom edge
    if (position.y + rect.height + padding > innerHeight) {
      adjustedY = Math.max(padding, innerHeight - rect.height - padding);
    }

    setAdjustedPosition({ x: adjustedX, y: adjustedY });
  }, [isOpen, position]);

  // Find the board and current column
  const board = boards.find((b) => b.id === boardId);
  const currentColumn = board?.columns.find((c) => c.id === columnId);
  const isDescopedColumn = currentColumn && DESCOPED_COLUMN_KEYWORDS.some(
    (keyword) => currentColumn.title.toLowerCase().includes(keyword)
  );

  // Find descoped column to move card to
  const descopedColumn = board?.columns.find((col) =>
    DESCOPED_COLUMN_KEYWORDS.some((keyword) =>
      col.title.toLowerCase().includes(keyword)
    )
  );

  const handleMoveToDescoped = () => {
    if (descopedColumn && !isDescopedColumn) {
      moveCard(boardId, card.id, columnId, descopedColumn.id, descopedColumn.cards.length);
      onClose();
    }
  };

  const handleRestoreToActive = () => {
    // Move to first non-descoped, non-completed column (TODO)
    const activeColumn = board?.columns.find(
      (col) =>
        !DESCOPED_COLUMN_KEYWORDS.some((keyword) =>
          col.title.toLowerCase().includes(keyword)
        ) && col.title.toLowerCase() !== 'completed'
    );

    if (activeColumn) {
      moveCard(boardId, card.id, columnId, activeColumn.id, activeColumn.cards.length);
      onClose();
    }
  };

  const handleEdit = () => {
    onEditCard();
    onClose();
  };

  const handleDelete = () => {
    onDeleteCard();
    onClose();
  };

  const handleArchive = () => {
    archiveCard(boardId, card.id);
    onClose();
  };

  const handleDuplicate = () => {
    // Copy card content to clipboard as JSON for manual duplication
    const cardData = {
      title: card.title,
      description: card.description,
      notes: card.notes,
      priority: card.priority,
      tags: card.tags,
    };
    navigator.clipboard.writeText(JSON.stringify(cardData, null, 2));
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            top: `${adjustedPosition.y}px`,
            left: `${adjustedPosition.x}px`,
            zIndex: 1000,
          }}
          className="min-w-[200px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Move to Descoped / Restore to Active */}
          {descopedColumn && (
            <>
              {!isDescopedColumn && (
                <button
                  onClick={handleMoveToDescoped}
                  className="w-full px-4 py-2 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
                  title="Move card to Descoped column"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Move to Descoped
                </button>
              )}

              {isDescopedColumn && (
                <button
                  onClick={handleRestoreToActive}
                  className="w-full px-4 py-2 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
                  title="Restore card to active column"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Restore to Active
                </button>
              )}

              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
            </>
          )}

          {/* Edit Card */}
          <button
            onClick={handleEdit}
            className="w-full px-4 py-2 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
            title="Edit card details"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit Card
          </button>

          {/* Archive Card */}
          <button
            onClick={handleArchive}
            className="w-full px-4 py-2 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors flex items-center gap-3"
            title="Archive this card (can be restored)"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            Archive Card
          </button>

          {/* Duplicate Card */}
          <button
            onClick={handleDuplicate}
            className="w-full px-4 py-2 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
            title="Copy card data to clipboard"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy Card Data
          </button>

          <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

          {/* Delete Card */}
          <button
            onClick={handleDelete}
            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-3"
            title="Delete this card"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Card
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default CardContextMenu;

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
  const { moveCard, boards } = useKanbanStore();
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
                  className="w-full px-4 py-2 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                  title="Move card to Descoped column"
                >
                  <span className="text-base">📋</span>
                  Move to Descoped
                </button>
              )}

              {isDescopedColumn && (
                <button
                  onClick={handleRestoreToActive}
                  className="w-full px-4 py-2 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                  title="Restore card to active column"
                >
                  <span className="text-base">✅</span>
                  Restore to Active
                </button>
              )}

              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
            </>
          )}

          {/* Edit Card */}
          <button
            onClick={handleEdit}
            className="w-full px-4 py-2 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
            title="Edit card details"
          >
            <span className="text-base">✏️</span>
            Edit Card
          </button>

          {/* Duplicate Card */}
          <button
            onClick={handleDuplicate}
            className="w-full px-4 py-2 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
            title="Copy card data to clipboard"
          >
            <span className="text-base">📋</span>
            Copy Card Data
          </button>

          <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

          {/* Delete Card */}
          <button
            onClick={handleDelete}
            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
            title="Delete this card"
          >
            <span className="text-base">🗑️</span>
            Delete Card
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default CardContextMenu;

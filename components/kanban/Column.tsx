'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKanbanStore } from '@/lib/store';
import { type Column as ColumnType } from '@/types';
import Card from './Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface ColumnProps {
  column: ColumnType;
  boardId: string;
  onCardDragStart: (e: React.DragEvent, cardId: string, columnId: string) => void;
  onCardDragEnd: () => void;
  onColumnDrop: (e: React.DragEvent, columnId: string) => void;
  onColumnDragOver: (e: React.DragEvent) => void;
  draggedCardId: string | null;
  onColumnDragStart: (e: React.DragEvent, columnId: string) => void;
  onColumnDragEnd: () => void;
  onColumnDragEnter: (e: React.DragEvent, columnId: string) => void;
  onColumnDragLeave: (e: React.DragEvent) => void;
  onColumnReorder: (e: React.DragEvent, columnId: string) => void;
  isDraggingColumn: boolean;
  isDropTarget: boolean;
}

const Column = ({
  column,
  boardId,
  onCardDragStart,
  onCardDragEnd,
  onColumnDrop,
  onColumnDragOver,
  draggedCardId,
  onColumnDragStart: onColumnDragStartProp,
  onColumnDragEnd: onColumnDragEndProp,
  onColumnDragEnter,
  onColumnDragLeave,
  onColumnReorder,
  isDraggingColumn,
  isDropTarget,
}: ColumnProps) => {
  const { addCard, updateColumn, deleteColumn, boards, reorderCards } = useKanbanStore();
  const currentBoard = boards.find((b) => b.id === boardId);
  const currentColumn = currentBoard?.columns.find((c) => c.id === column.id);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [dropTargetCardId, setDropTargetCardId] = useState<string | null>(null);

  const handleRename = () => {
    if (editTitle.trim() && editTitle !== column.title) {
      updateColumn(boardId, column.id, editTitle);
    }
    setIsEditing(false);
    setEditTitle(column.title);
  };

  const handleDelete = () => {
    const board = boards.find((b) => b.id === boardId);
    // Check if board would be empty after deletion
    if (board && board.columns.length <= 1) {
      alert('Cannot delete the last column');
      return;
    }

    if (confirm(`Delete column "${column.title}"? Cards in this column will be deleted.`)) {
      deleteColumn(boardId, column.id);
    }
  };

  const handleAddCard = () => {
    if (newCardTitle.trim()) {
      addCard(boardId, column.id, {
        title: newCardTitle,
      });
      setNewCardTitle('');
      setIsAddingCard(false);
    }
  };

  const handleCardDragOver = (e: React.DragEvent, targetCardId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const cardId = e.dataTransfer.getData('cardId');
    const fromColumnId = e.dataTransfer.getData('fromColumnId');

    // Only show drop indicator for same-column reordering
    if (fromColumnId === column.id && cardId !== targetCardId) {
      setDropTargetCardId(targetCardId);
    }
  };

  const handleCardDrop = (e: React.DragEvent, targetCardId: string) => {
    e.preventDefault();

    const cardId = e.dataTransfer.getData('cardId');
    const fromColumnId = e.dataTransfer.getData('fromColumnId');

    // Only handle same-column reordering here
    if (fromColumnId === column.id && cardId !== targetCardId && currentColumn) {
      e.stopPropagation(); // Only stop propagation for same-column drops

      const cardIds = currentColumn.cards.map((c) => c.id);
      const fromIndex = cardIds.indexOf(cardId);
      const toIndex = cardIds.indexOf(targetCardId);

      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        // Get the target element to check drop position (upper vs lower half)
        const targetElement = e.currentTarget as HTMLElement;
        const rect = targetElement.getBoundingClientRect();
        const dropY = e.clientY - rect.top;
        const isLowerHalf = dropY > rect.height / 2;

        // Build new order: remove card from old position, insert at new position
        const newCardIds = cardIds.filter((id) => id !== cardId);

        // Calculate where to insert in the filtered array
        // If dropping in lower half, insert AFTER target; otherwise insert BEFORE target
        const filteredToIndex = newCardIds.indexOf(targetCardId);
        const insertIndex = isLowerHalf ? filteredToIndex + 1 : filteredToIndex;

        newCardIds.splice(insertIndex, 0, cardId);

        reorderCards(boardId, column.id, newCardIds);
      }
    }
    // For cross-column drops, don't stop propagation - let it bubble to column handler

    setDropTargetCardId(null);
  };

  const handleCardDragLeave = (e: React.DragEvent) => {
    // Only clear if we're actually leaving the card wrapper
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDropTargetCardId(null);
    }
  };

  const handleColumnDragStart = (e: unknown) => {
    // Don't initiate column drag if we're dragging a card
    const dragEvent = e as React.DragEvent;
    const target = dragEvent.target as HTMLElement;
    const isCardDrag = target.closest('[data-card-element="true"]');

    if (!isCardDrag) {
      onColumnDragStartProp(dragEvent, column.id);
    }
  };

  return (
    <motion.div
      layout
      draggable={true}
      onDragStart={handleColumnDragStart}
      onDragEnd={onColumnDragEndProp}
      onDragEnter={(e) => onColumnDragEnter(e as any, column.id)}
      onDragLeave={(e) => onColumnDragLeave(e as any)}
      onDrop={(e) => {
        const columnId = (e as any).dataTransfer.getData('columnId');
        if (columnId) {
          onColumnReorder(e as any, column.id);
        } else {
          onColumnDrop(e as any, column.id);
        }
      }}
      onDragOver={onColumnDragOver}
      className={`
        w-72 flex-shrink-0 rounded-lg flex flex-col my-4 transition-all overflow-visible h-full
        ${isDraggingColumn
          ? 'opacity-50 cursor-grabbing shadow-2xl scale-105'
          : 'opacity-100 cursor-grab shadow-sm hover:shadow-md'
        }
        ${isDropTarget
          ? 'ring-2 ring-purple-500 ring-offset-2 bg-purple-50 dark:bg-purple-900/20'
          : 'bg-gray-100 dark:bg-gray-800'
        }
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{
        layout: { type: 'spring', stiffness: 300, damping: 30 },
        default: { duration: 0.3 }
      }}
      whileHover={{ y: -2 }}
      style={{
        cursor: isDraggingColumn ? 'grabbing' : 'grab',
      }}
    >
      {/* Column Header */}
      <div className="border-b border-gray-300 dark:border-gray-700" style={{ paddingTop: '1.5rem', paddingBottom: '1.5rem', paddingLeft: '1.5rem', paddingRight: '1rem' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing transition-colors flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="4" cy="4" r="1.5"/>
              <circle cx="4" cy="8" r="1.5"/>
              <circle cx="4" cy="12" r="1.5"/>
              <circle cx="8" cy="4" r="1.5"/>
              <circle cx="8" cy="8" r="1.5"/>
              <circle cx="8" cy="12" r="1.5"/>
            </svg>
          </div>

          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') {
                  setIsEditing(false);
                  setEditTitle(column.title);
                }
              }}
              autoFocus
              onFocus={(e) => e.currentTarget.select()}
              className="h-8 flex-1"
            />
          ) : (
            <h3
              onDoubleClick={() => setIsEditing(true)}
              className="font-bold text-lg text-gray-900 dark:text-white cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex-1"
            >
              {column.title}
            </h3>
          )}
          <button
            onClick={handleDelete}
            className="opacity-50 hover:opacity-100 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 text-sm pointer-events-auto flex-shrink-0"
            title="Delete column"
          >
            ✕
          </button>
        </div>

        {/* Task Count - below column name */}
        <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
          {currentColumn?.cards.length || 0} task{(currentColumn?.cards.length || 0) !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Cards List */}
      <div className="overflow-y-auto overflow-x-visible space-y-1 scrollbar-hide flex-1 pb-6 flex flex-col items-center">
        {(currentColumn?.cards.length || 0) === 0 && !isAddingCard && (
          <div className="text-center py-6 px-4">
            <p className="text-gray-500 dark:text-gray-400 text-xs">
              No cards yet
            </p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {currentColumn?.cards.map((card) => (
            <motion.div
              key={card.id}
              layout
              onDragOver={(e) => handleCardDragOver(e, card.id)}
              onDrop={(e) => handleCardDrop(e, card.id)}
              onDragLeave={handleCardDragLeave}
              className={`w-full flex justify-center transition-all duration-150 ${
                dropTargetCardId === card.id
                  ? 'border-t-2 border-purple-500 pt-2'
                  : ''
              }`}
              style={{
                minHeight: dropTargetCardId === card.id ? '120px' : 'auto'
              }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                layout: { type: 'spring', stiffness: 350, damping: 35 },
                default: { duration: 0.2 }
              }}
            >
              <Card
                card={card}
                boardId={boardId}
                columnId={column.id}
                onDragStart={onCardDragStart}
                onDragEnd={onCardDragEnd}
                isDragging={draggedCardId === card.id}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add Card Input - appears right after cards */}
        {isAddingCard && (
          <div className="mt-1 w-full px-4 flex justify-center">
            <div className="w-60">
              <Input
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCard();
                  if (e.key === 'Escape') {
                    setIsAddingCard(false);
                    setNewCardTitle('');
                  }
                }}
                placeholder="Card title..."
                autoFocus
                className="h-8 text-sm"
              />
              <div className="flex gap-1 mt-1">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleAddCard}
                  className="flex-1 text-xs"
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsAddingCard(false);
                    setNewCardTitle('');
                  }}
                  className="flex-1 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add Task Button - appears right after cards or input */}
        {!isAddingCard && (
          <div className="w-full flex justify-center">
            <button
              onClick={() => setIsAddingCard(true)}
              className="w-60 text-center text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 py-2 px-2 rounded border border-purple-300 dark:border-purple-600 bg-white dark:bg-gray-700 hover:bg-purple-50 dark:hover:bg-gray-600 transition-colors mt-2"
            >
              + Add Task
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Column;

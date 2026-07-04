'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKanbanStore } from '@/lib/store';
import { type Column as ColumnType } from '@/types';
import Card from './Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { DESCOPED_COLUMN_KEYWORDS } from '@/lib/constants';
import ColumnOptionsMenu from './ColumnOptionsMenu';

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
  canEdit: boolean;
  isFirstColumn?: boolean;
  triggerAddCard?: boolean;
  onTriggerAddCardHandled?: () => void;
  isMobileLayout?: boolean;
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
  canEdit,
  isFirstColumn = false,
  triggerAddCard,
  onTriggerAddCardHandled,
  isMobileLayout = false,
}: ColumnProps) => {
  const { addCard, updateColumn, updateColumnWipLimit, deleteColumn, boards, reorderCards } = useKanbanStore();
  const { showToast } = useToast();
  const currentBoard = boards.find((b) => b.id === boardId);
  const currentColumn = currentBoard?.columns.find((c) => c.id === column.id);

  // Board always shows all non-archived cards; search results live in the search panel
  const visibleCards = useMemo(
    () => (currentColumn?.cards || []).filter((c) => !c.archived),
    [currentColumn?.cards]
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [dropTargetCardId, setDropTargetCardId] = useState<string | null>(null);
  const [isEditingWip, setIsEditingWip] = useState(false);
  const [wipInput, setWipInput] = useState('');

  // Exclude archived cards from counts and WIP tracking
  const activeCards = (currentColumn?.cards || []).filter((c) => !c.archived);
  const cardCount = activeCards.length;
  const wipLimit = currentColumn?.wipLimit;
  const isOverWip = wipLimit !== undefined && wipLimit > 0 && cardCount > wipLimit;

  const handleSaveWipLimit = () => {
    const num = parseInt(wipInput, 10);
    if (wipInput === '' || wipInput === '0') {
      updateColumnWipLimit(boardId, column.id, undefined);
    } else if (!isNaN(num) && num > 0) {
      updateColumnWipLimit(boardId, column.id, num);
    }
    setIsEditingWip(false);
  };

  // Check if this is a descoped column (shouldn't allow adding new tasks)
  const isDescopedColumn = DESCOPED_COLUMN_KEYWORDS.some(
    keyword => column.title.toLowerCase().includes(keyword.toLowerCase())
  );

  // Handle keyboard shortcut trigger for adding new card
  useEffect(() => {
    if (triggerAddCard && canEdit && !isDescopedColumn) {
      setIsAddingCard(true);
      onTriggerAddCardHandled?.();
    }
  }, [triggerAddCard, canEdit, isDescopedColumn, onTriggerAddCardHandled]);

  const handleRename = () => {
    if (!canEdit || !editTitle.trim() || editTitle === column.title) {
      setIsEditing(false);
      setEditTitle(column.title);
      return;
    }
    updateColumn(boardId, column.id, editTitle);
    setIsEditing(false);
    setEditTitle(column.title);
  };

  const handleDelete = () => {
    if (!canEdit) return;

    const board = boards.find((b) => b.id === boardId);
    // Check if board would be empty after deletion
    if (board && board.columns.length <= 1) {
      showToast('Cannot delete the last column', 'warning');
      return;
    }

    if (confirm(`Delete column "${column.title}"? Cards in this column will be deleted.`)) {
      deleteColumn(boardId, column.id);
    }
  };

  const handleAddCard = () => {
    if (!canEdit || !newCardTitle.trim()) return;
    addCard(boardId, column.id, {
      title: newCardTitle,
    });
    setNewCardTitle('');
    setIsAddingCard(false);
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
      draggable={canEdit}
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
        ${isMobileLayout
          ? 'w-screen flex-shrink-0 h-full snap-start'
          : 'w-[85vw] sm:w-[270px] flex-shrink-0 snap-center sm:snap-start my-2 sm:my-4 max-h-full'
        }
        flex flex-col transition-all overflow-hidden
        ${isDraggingColumn ? 'opacity-50 cursor-grabbing scale-105' : isMobileLayout ? '' : 'opacity-100 cursor-grab'}
        ${isDropTarget ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-[var(--bg)]' : ''}
      `}
      style={{
        background: isDropTarget ? 'rgba(147,51,234,.12)' : 'var(--surface-1)',
        border: `1px solid ${isDropTarget ? 'rgba(147,51,234,.4)' : 'var(--border)'}`,
        borderRadius: '16px',
        boxShadow: isDraggingColumn ? '0 20px 60px rgba(0,0,0,.6)' : 'var(--shadow-1)',
        cursor: isDraggingColumn ? 'grabbing' : 'grab',
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{
        layout: { type: 'spring', stiffness: 300, damping: 30 },
        default: { duration: 0.3 }
      }}
      whileHover={{ y: -2 }}
    >
      {/* Column Header */}
      <div className="group px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-2">
          {/* Grip + Title + Count grouped together */}
          <div className="flex items-center gap-2">
            <div className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing transition-colors flex-shrink-0 text-xs">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="4" cy="4" r="1.5"/>
                <circle cx="4" cy="8" r="1.5"/>
                <circle cx="4" cy="12" r="1.5"/>
                <circle cx="8" cy="4" r="1.5"/>
                <circle cx="8" cy="8" r="1.5"/>
                <circle cx="8" cy="12" r="1.5"/>
              </svg>
            </div>

            {isEditing && canEdit ? (
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
                className="h-8 text-sm"
              />
            ) : (
              <h3
                onDoubleClick={() => canEdit && setIsEditing(true)}
                className={`font-semibold text-sm ${
                  canEdit ? 'cursor-pointer hover:text-purple-400' : 'cursor-default'
                }`}
                style={{ color: 'var(--text)' }}
              >
                {column.title}
              </h3>
            )}

            {/* Count Badge — adjacent to title */}
            <span
              className="text-[11px] font-medium px-2 py-1 rounded-full flex-shrink-0"
              style={{ background: 'var(--surface-3)', color: 'var(--muted)' }}
            >
              {cardCount}
            </span>
          </div>

          {/* Menu — pushed to the right */}
          <ColumnOptionsMenu
            boardId={boardId}
            columnId={column.id}
            activeCards={activeCards}
            canEdit={canEdit}
            onRename={() => { setIsEditing(true); setEditTitle(column.title); }}
            onSetWipLimit={() => { setWipInput(wipLimit?.toString() || ''); setIsEditingWip(true); }}
            onDelete={handleDelete}
          />
        </div>

        {/* WIP Limit (if set) */}
        {wipLimit !== undefined && wipLimit > 0 && (
          <div className="text-xs font-medium flex items-center gap-2 mt-2" style={{ color: isOverWip ? '#fb7185' : 'var(--muted)' }}>
            Limit: {wipLimit}
            {isOverWip && <span className="text-red-400">⚠</span>}
          </div>
        )}

        {/* WIP Limit Editor - owner/editor only */}
        {canEdit && isEditingWip && (
          <div className="mt-2">
            <input
              type="number"
              min="0"
              max="99"
              value={wipInput}
              onChange={(e) => setWipInput(e.target.value)}
              onBlur={handleSaveWipLimit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveWipLimit();
                  if (e.key === 'Escape') setIsEditingWip(false);
                }}
                autoFocus
                placeholder="Limit"
              className="w-14 px-1.5 py-0.5 text-xs border border-purple-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <div className="flex gap-1 mt-1">
              <button onClick={handleSaveWipLimit} className="text-xs px-2 py-1 rounded bg-purple-600 text-white">Save</button>
              <button onClick={() => setIsEditingWip(false)} className="text-xs px-2 py-1 rounded border border-gray-400">Cancel</button>
            </div>
          </div>
        )}
        {canEdit && !isEditingWip && (
          <button
            onClick={() => { setWipInput(wipLimit !== undefined ? String(wipLimit) : ''); setIsEditingWip(true); }}
            className="text-[10px] text-gray-400 hover:text-purple-400 transition-colors opacity-0 group-hover:opacity-100 mt-1"
            title={wipLimit ? `WIP limit: ${wipLimit} (click to edit)` : 'Set WIP limit'}
          >
            {wipLimit ? 'Edit' : 'Set limit'}
          </button>
        )}
      </div>

      {/* Cards List — scrollable, no bottom padding needed since + Add Task is pinned below */}
      <div className="overflow-y-auto overflow-x-visible space-y-1 flex-1 pb-2 flex flex-col items-center min-h-0">
        {(currentColumn?.cards.length || 0) === 0 && !isAddingCard && (
          <div className="text-center py-6 px-4">
            <p className="text-gray-500 dark:text-gray-400 text-xs">
              No cards yet
            </p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {visibleCards.map((card) => (
            <motion.div
              key={card.id}
              layout
              onDragOver={(e) => handleCardDragOver(e, card.id)}
              onDrop={(e) => handleCardDrop(e, card.id)}
              onDragLeave={handleCardDragLeave}
              className={`w-full flex justify-center transition-all duration-150 ${
                dropTargetCardId === card.id ? 'border-t-2 border-purple-500 pt-2' : ''
              }`}
              style={{ minHeight: dropTargetCardId === card.id ? '120px' : 'auto' }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                layout: { type: 'spring', stiffness: 350, damping: 35 },
                default: { duration: 0.2 },
              }}
            >
              <Card
                card={card}
                boardId={boardId}
                columnId={column.id}
                onDragStart={onCardDragStart}
                onDragEnd={onCardDragEnd}
                isDragging={draggedCardId === card.id}
                canEdit={canEdit}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add Card Input - appears right after cards */}
        {canEdit && isAddingCard && (
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

      </div>

      {/* Add Task Button — pinned to column bottom, always visible regardless of card count */}
      {canEdit && !isAddingCard && !isDescopedColumn && isFirstColumn && (
        <div className="flex-shrink-0" style={{ borderTop: '1px solid var(--border)', marginTop: '2px' }}>
          <button
            onClick={() => setIsAddingCard(true)}
            className="w-full text-center font-medium transition-all"
            style={{
              color: 'var(--purple-l)',
              border: '1px dashed var(--border-2)',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: 500,
              padding: '14px',
              borderRadius: '13px',
              marginTop: '2px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--purple)';
              e.currentTarget.style.background = 'rgba(147,51,234,.08)';
              e.currentTarget.style.boxShadow = '0 0 16px rgba(147,51,234,.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-2)';
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            + Add Task
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default Column;

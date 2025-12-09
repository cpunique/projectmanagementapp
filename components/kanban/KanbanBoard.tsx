'use client';

import { useKanbanStore } from '@/lib/store';
import Column from './Column';
import Container from '@/components/layout/Container';
import { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const KanbanBoard = () => {
  const { boards, activeBoard, moveCard, reorderCards, addColumn } = useKanbanStore();
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [draggedFromColumnId, setDraggedFromColumnId] = useState<string | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const board = boards.find((b) => b.id === activeBoard);

  if (!board) {
    return (
      <Container className="py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No board selected</p>
        </div>
      </Container>
    );
  }

  const handleCardDragStart = (e: React.DragEvent, cardId: string, columnId: string) => {
    setDraggedCardId(cardId);
    setDraggedFromColumnId(columnId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('cardId', cardId);
    e.dataTransfer.setData('fromColumnId', columnId);
  };

  const handleCardDragEnd = () => {
    setDraggedCardId(null);
    setDraggedFromColumnId(null);
  };

  const handleColumnDrop = (e: React.DragEvent, toColumnId: string) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    const fromColumnId = e.dataTransfer.getData('fromColumnId');

    if (!cardId || !fromColumnId) return;

    console.log('📦 Drop detected: card', cardId, 'to column', toColumnId);

    if (fromColumnId === toColumnId) {
      // Same column - reorder
      const column = board.columns.find((c) => c.id === toColumnId);
      if (column) {
        const cardIds = column.cards.map((c) => c.id);
        // For now, keep the same order (can enhance with position tracking)
        reorderCards(board.id, toColumnId, cardIds);
      }
    } else {
      // Different column - move to end
      const toColumn = board.columns.find((c) => c.id === toColumnId);
      const newOrder = toColumn ? toColumn.cards.length : 0;
      moveCard(board.id, cardId, fromColumnId, toColumnId, newOrder);
    }

    setDraggedCardId(null);
    setDraggedFromColumnId(null);
  };

  const handleColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleAddColumn = () => {
    if (newColumnTitle.trim()) {
      addColumn(board.id, newColumnTitle);
      setNewColumnTitle('');
      setIsAddingColumn(false);
    }
  };

  return (
    <div className="bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-[calc(100vh-4rem)] overflow-visible">
      <div className="py-6 overflow-visible" style={{ marginLeft: '2rem', marginRight: '2rem' }}>
        {/* Board Title */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {board.name}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {board.columns.length} column{board.columns.length !== 1 ? 's' : ''} • {' '}
            {board.columns.reduce((sum, col) => sum + col.cards.length, 0)} total card
            {board.columns.reduce((sum, col) => sum + col.cards.length, 0) !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Columns Grid */}
        <div className="overflow-x-auto overflow-y-visible pb-4">
          <div className="flex gap-4 min-w-min items-start">
            {board.columns.map((column) => (
              <Column
                key={column.id}
                column={column}
                boardId={board.id}
                onCardDragStart={handleCardDragStart}
                onCardDragEnd={handleCardDragEnd}
                onColumnDrop={handleColumnDrop}
                onColumnDragOver={handleColumnDragOver}
                draggedCardId={draggedCardId}
              />
            ))}

            {/* Add Column Button/Input */}
            {isAddingColumn ? (
              <div className="w-72 flex-shrink-0 bg-gray-100 dark:bg-gray-800 rounded-lg p-4 shadow-sm mt-4">
                <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-3">
                  New Column
                </h3>
                <Input
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddColumn();
                    if (e.key === 'Escape') {
                      setIsAddingColumn(false);
                      setNewColumnTitle('');
                    }
                  }}
                  placeholder="Column title..."
                  autoFocus
                  className="mb-3"
                />
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={handleAddColumn}
                    className="flex-1"
                    size="sm"
                  >
                    Add
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddingColumn(false);
                      setNewColumnTitle('');
                    }}
                    className="flex-1"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingColumn(true)}
                className="flex-shrink-0 w-10 h-10 mt-10 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full flex items-center justify-center transition-all shadow-md hover:shadow-lg hover:scale-110"
                title="Add Column"
              >
                <span className="text-white font-bold text-2xl leading-none">+</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KanbanBoard;

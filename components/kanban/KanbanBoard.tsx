'use client';

import { useKanbanStore } from '@/lib/store';
import { useAuth } from '@/lib/firebase/AuthContext';
import { isAdmin } from '@/lib/admin/isAdmin';
import dynamic from 'next/dynamic';
import Column from './Column';
import Container from '@/components/layout/Container';
import BoardHeader from './BoardHeader';
import { CollaboratorAvatarStack } from './CollaboratorAvatarStack';
import { useBoardPresence } from '@/lib/hooks/useBoardPresence';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import { useState, useMemo, useEffect } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const KeyboardShortcutsModal = dynamic(() => import('@/components/ui/KeyboardShortcutsModal'), { ssr: false });

const KanbanBoard = () => {
  const { user } = useAuth();
  const { boards, activeBoard, moveCard, reorderCards, addColumn, reorderColumns, demoMode } = useKanbanStore();
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [draggedFromColumnId, setDraggedFromColumnId] = useState<string | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [triggerAddCardColumn, setTriggerAddCardColumn] = useState<string | null>(null);

  // Keyboard shortcuts
  const { showHelp, setShowHelp, triggerNewCard, resetTriggerNewCard } = useKeyboardShortcuts();

  const board = boards.find((b) => b.id === activeBoard);

  // Handle keyboard shortcut to add new card in first column
  useEffect(() => {
    if (triggerNewCard && board && board.columns.length > 0) {
      const firstColumn = board.columns[0];
      setTriggerAddCardColumn(firstColumn.id);
      resetTriggerNewCard();
    }
  }, [triggerNewCard, board, resetTriggerNewCard]);

  // Track online users for presence indicators
  const { onlineUsers } = useBoardPresence(board?.id || null, !!user && !!board);

  // Calculate user's permission level for this board
  const userRole = useMemo(() => {
    if (!board) return null;
    // In demo mode, everyone can interact (changes are ephemeral for non-admin users)
    // This allows visitors to "Try Dragging Cards!" as advertised
    if (demoMode) {
      return 'editor'; // Everyone can edit in demo mode (admin saves persist, others don't)
    }
    if (!user) return null;
    if (board.ownerId === user.uid) return 'owner';
    const collab = board.sharedWith?.find((c) => c.userId === user.uid);
    return collab?.role || null;
  }, [user, board, demoMode]);

  const canEdit = userRole === 'owner' || userRole === 'editor';
  // Don't show "View Only" badge in demo mode - users CAN interact, changes just aren't persisted
  const isViewOnly = userRole === 'viewer' && !demoMode;

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
    if (!canEdit) {
      e.preventDefault();
      return;
    }
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

    // Check if this is a column reorder (not a card drop)
    const columnId = e.dataTransfer.getData('columnId');
    if (columnId) {
      return; // Let handleColumnReorder handle it
    }

    // Handle card drop
    const cardId = e.dataTransfer.getData('cardId');
    const fromColumnId = e.dataTransfer.getData('fromColumnId');

    if (!cardId || !fromColumnId) return;

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

  const handleColumnDragStart = (e: React.DragEvent, columnId: string) => {
    if (!canEdit) {
      e.preventDefault();
      return;
    }
    setDraggedColumnId(columnId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('columnId', columnId);
  };

  const handleColumnDragEnd = () => {
    setDraggedColumnId(null);
    setDragOverColumnId(null);
  };

  const handleColumnDragEnter = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedColumnId && draggedColumnId !== columnId) {
      setDragOverColumnId(columnId);
    }
  };

  const handleColumnDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget === e.target) {
      setDragOverColumnId(null);
    }
  };

  const handleColumnReorder = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const sourceColumnId = e.dataTransfer.getData('columnId');
    if (!sourceColumnId || sourceColumnId === targetColumnId || !board) return;

    const currentOrder = board.columns.map((c) => c.id);
    const sourceIndex = currentOrder.indexOf(sourceColumnId);
    const targetIndex = currentOrder.indexOf(targetColumnId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const newOrder = [...currentOrder];
    newOrder.splice(sourceIndex, 1);
    newOrder.splice(targetIndex, 0, sourceColumnId);

    reorderColumns(board.id, newOrder);

    setDraggedColumnId(null);
    setDragOverColumnId(null);
  };

  const handleAddColumn = () => {
    if (!canEdit || !newColumnTitle.trim()) return;
    addColumn(board.id, newColumnTitle);
    setNewColumnTitle('');
    setIsAddingColumn(false);
  };

  return (
    <div className="bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-[calc(100vh-4rem)] overflow-visible">
      <div className="py-6 overflow-visible" style={{ marginLeft: '2rem', marginRight: '2rem' }}>
        {/* Board Title */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              {board.name}
            </h2>
            {isViewOnly && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                🔒 View Only
              </span>
            )}
            {/* Collaborator Avatars - Hide in demo mode to protect privacy */}
            {!demoMode && (
              <CollaboratorAvatarStack
                ownerId={board.ownerId}
                ownerEmail={board.ownerEmail}
                collaborators={board.sharedWith}
                onlineUsers={onlineUsers}
                maxVisible={4}
              />
            )}
          </div>
          <BoardHeader boardId={board.id} />
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {board.columns.length} column{board.columns.length !== 1 ? 's' : ''} • {' '}
            {board.columns.reduce((sum, col) => sum + col.cards.length, 0)} total card
            {board.columns.reduce((sum, col) => sum + col.cards.length, 0) !== 1 ? 's' : ''}
          </p>
        </div>

        {/* View-Only Notice */}
        {isViewOnly && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
            You have read-only access to this board. Contact the board owner to request editing permissions.
          </div>
        )}

        {/* Columns Grid */}
        <div className="overflow-x-auto overflow-y-visible pb-4 h-[calc(100vh-200px)]">
          <div className="flex gap-4 min-w-min items-start h-full">
            {board.columns.map((column, index) => (
              <Column
                key={column.id}
                column={column}
                boardId={board.id}
                onCardDragStart={handleCardDragStart}
                onCardDragEnd={handleCardDragEnd}
                onColumnDrop={handleColumnDrop}
                onColumnDragOver={handleColumnDragOver}
                draggedCardId={draggedCardId}
                onColumnDragStart={handleColumnDragStart}
                onColumnDragEnd={handleColumnDragEnd}
                onColumnDragEnter={handleColumnDragEnter}
                onColumnDragLeave={handleColumnDragLeave}
                onColumnReorder={handleColumnReorder}
                isDraggingColumn={draggedColumnId === column.id}
                isDropTarget={dragOverColumnId === column.id}
                canEdit={canEdit}
                isFirstColumn={index === 0}
                triggerAddCard={triggerAddCardColumn === column.id}
                onTriggerAddCardHandled={() => setTriggerAddCardColumn(null)}
              />
            ))}

            {/* Add Column Button/Input */}
            {canEdit && (isAddingColumn ? (
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
            ))}
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
};

export default KanbanBoard;

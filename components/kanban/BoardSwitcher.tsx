'use client';

import { useState } from 'react';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from '@/lib/firebase/AuthContext';
import { setUserDefaultBoard } from '@/lib/firebase/firestore';
import { cn, generateId } from '@/lib/utils';
import Dropdown from '@/components/ui/Dropdown';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import CloneBoardModal from '@/components/kanban/CloneBoardModal';

const BoardSwitcher = () => {
  const { user } = useAuth();
  const boards = useKanbanStore((state) => state.boards);
  const activeBoard = useKanbanStore((state) => state.activeBoard);
  const defaultBoardId = useKanbanStore((state) => state.defaultBoardId);
  const switchBoard = useKanbanStore((state) => state.switchBoard);
  const setDefaultBoard = useKanbanStore((state) => state.setDefaultBoard);
  const addBoard = useKanbanStore((state) => state.addBoard);
  const deleteBoard = useKanbanStore((state) => state.deleteBoard);
  const updateBoard = useKanbanStore((state) => state.updateBoard);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [isRenamingBoardId, setIsRenamingBoardId] = useState<string | null>(null);
  const [renameBoardValue, setRenameBoardValue] = useState('');
  const [isSavingDefaultBoard, setIsSavingDefaultBoard] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [boardToClone, setBoardToClone] = useState<string | null>(null);

  const currentBoard = boards.find((b) => b.id === activeBoard);

  const handleCreateBoard = () => {
    if (newBoardName.trim()) {
      addBoard(newBoardName);
      setNewBoardName('');
      setIsCreateModalOpen(false);
    }
  };

  const handleRenameBoard = (boardId: string) => {
    if (renameBoardValue.trim()) {
      updateBoard(boardId, renameBoardValue);
      setIsRenamingBoardId(null);
      setRenameBoardValue('');
    }
  };

  const handleDeleteBoard = (boardId: string) => {
    if (boards.length > 1) {
      deleteBoard(boardId);
    }
  };

  const handleSetDefaultBoard = async (boardId: string) => {
    // Prevent concurrent executions (guard against double-clicks or rapid re-renders)
    if (isSavingDefaultBoard) {
      return;
    }

    // Security: prevent setting demo board as default
    if (boardId === 'default-board') {
      console.warn('[BoardSwitcher] Demo board cannot be set as default');
      return;
    }

    const newDefaultId = defaultBoardId === boardId ? null : boardId;

    // Set guard flag
    setIsSavingDefaultBoard(true);

    // Update local state immediately
    setDefaultBoard(newDefaultId);

    // Save to Firebase immediately (don't wait for manual save)
    if (user) {
      try {
        await setUserDefaultBoard(user.uid, newDefaultId);
      } catch (error) {
        console.error('[BoardSwitcher] Failed to save default board:', error);
      }
    }

    // Release guard flag after a short delay to prevent rapid successive clicks
    setTimeout(() => {
      setIsSavingDefaultBoard(false);
    }, 500);
  };

  const triggerContent = (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <span className="font-medium text-sm truncate">
        {currentBoard?.name || 'Select Board'}
      </span>
      <span className="text-gray-400">▼</span>
    </div>
  );

  return (
    <>
      <Dropdown trigger={triggerContent} width="w-64">
        <div className="py-2">
          {/* Board List */}
          <div className="max-h-64 overflow-y-auto">
            {boards.map((board) => (
              <div
                key={board.id}
                className={cn(
                  'px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between group',
                  activeBoard === board.id
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-l-2 border-purple-600'
                    : ''
                )}
              >
                <div className="flex-1 flex items-center gap-2">
                  <button
                    onClick={() => switchBoard(board.id)}
                    className="flex-1 text-left text-sm hover:text-purple-600 dark:hover:text-purple-400"
                  >
                    {isRenamingBoardId === board.id ? (
                      <input
                        autoFocus
                        value={renameBoardValue}
                        onChange={(e) => setRenameBoardValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRenameBoard(board.id);
                          } else if (e.key === 'Escape') {
                            setIsRenamingBoardId(null);
                            setRenameBoardValue('');
                          }
                        }}
                        onBlur={() => {
                          setIsRenamingBoardId(null);
                          setRenameBoardValue('');
                        }}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        onDoubleClick={() => {
                          setIsRenamingBoardId(board.id);
                          setRenameBoardValue(board.name);
                        }}
                      >
                        {board.name}
                      </span>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  {!isRenamingBoardId && (
                    <>
                      <button
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setBoardToClone(board.id);
                          setIsCloneModalOpen(true);
                        }}
                        className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1 rounded text-sm"
                        title="Clone board"
                      >
                        ⎘
                      </button>
                      <button
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleSetDefaultBoard(board.id);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        disabled={isSavingDefaultBoard}
                        className={cn(
                          'p-1 text-base transition-all duration-200 ease-in-out',
                          defaultBoardId === board.id
                            ? 'text-purple-600 dark:text-purple-400 scale-110 drop-shadow-sm'
                            : 'text-gray-300 dark:text-gray-600 hover:text-purple-400 dark:hover:text-purple-500 hover:scale-105',
                          isSavingDefaultBoard && 'opacity-50 cursor-not-allowed'
                        )}
                        title={
                          defaultBoardId === board.id
                            ? 'Remove as default'
                            : 'Make default'
                        }
                      >
                        {defaultBoardId === board.id ? '★' : '☆'}
                      </button>
                    </>
                  )}
                  {boards.length > 1 && !isRenamingBoardId && (
                    <button
                      onClick={() => handleDeleteBoard(board.id)}
                      className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded text-sm"
                      title="Delete board"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200 dark:bg-gray-600 my-2" />

          {/* Create New Board Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-purple-600 dark:text-purple-400 font-medium"
          >
            + New Board
          </button>
        </div>
      </Dropdown>

      {/* Create Board Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setNewBoardName('');
        }}
        title="Create New Board"
      >
        <div className="space-y-4">
          <Input
            label="Board Name"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            placeholder="My New Board"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateBoard();
              }
            }}
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreateModalOpen(false);
                setNewBoardName('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateBoard}
              disabled={!newBoardName.trim()}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clone Board Modal */}
      {boardToClone && boards.find((b) => b.id === boardToClone) && (
        <CloneBoardModal
          isOpen={isCloneModalOpen}
          onClose={() => {
            setIsCloneModalOpen(false);
            setBoardToClone(null);
          }}
          sourceBoard={boards.find((b) => b.id === boardToClone)!}
        />
      )}
    </>
  );
};

export default BoardSwitcher;

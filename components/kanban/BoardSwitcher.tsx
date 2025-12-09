'use client';

import { useState } from 'react';
import { useKanbanStore } from '@/lib/store';
import { cn, generateId } from '@/lib/utils';
import Dropdown from '@/components/ui/Dropdown';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';

const BoardSwitcher = () => {
  const boards = useKanbanStore((state) => state.boards);
  const activeBoard = useKanbanStore((state) => state.activeBoard);
  const switchBoard = useKanbanStore((state) => state.switchBoard);
  const addBoard = useKanbanStore((state) => state.addBoard);
  const deleteBoard = useKanbanStore((state) => state.deleteBoard);
  const updateBoard = useKanbanStore((state) => state.updateBoard);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [isRenamingBoardId, setIsRenamingBoardId] = useState<string | null>(null);
  const [renameBoardValue, setRenameBoardValue] = useState('');

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
                  'px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between',
                  activeBoard === board.id
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-l-2 border-purple-600'
                    : ''
                )}
              >
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

                {boards.length > 1 && !isRenamingBoardId && (
                  <button
                    onClick={() => handleDeleteBoard(board.id)}
                    className="ml-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded text-sm"
                    title="Delete board"
                  >
                    ✕
                  </button>
                )}
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
    </>
  );
};

export default BoardSwitcher;

'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from '@/lib/firebase/AuthContext';
import { setUserDefaultBoard } from '@/lib/firebase/firestore';
import { cn, generateId } from '@/lib/utils';
import Dropdown from '@/components/ui/Dropdown';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import BoardTemplateSelector from './BoardTemplateSelector';
import { BOARD_TEMPLATES, type BoardTemplate } from '@/lib/boardTemplates';
import { downloadBoardAsJSON, parseBoardImportJSON } from '@/lib/utils/exportBoard';

const CloneBoardModal = dynamic(() => import('@/components/kanban/CloneBoardModal'), { ssr: false });
const ShareBoardModal = dynamic(() => import('@/components/kanban/ShareBoardModal'), { ssr: false });

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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [boardToShare, setBoardToShare] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<BoardTemplate>(BOARD_TEMPLATES[0]);
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [confirmDeleteBoardId, setConfirmDeleteBoardId] = useState<string | null>(null);
  const [confirmExportBoardId, setConfirmExportBoardId] = useState<string | null>(null);
  const [boardSearch, setBoardSearch] = useState('');

  const currentBoard = boards.find((b) => b.id === activeBoard);

  const handleCreateBoard = () => {
    if (newBoardName.trim()) {
      // Use selected template columns (blank template uses defaults via the store)
      const templateCols = selectedTemplate.id === 'blank' ? undefined : selectedTemplate.columns;
      addBoard(newBoardName, undefined, templateCols);
      setNewBoardName('');
      setSelectedTemplate(BOARD_TEMPLATES[0]);
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

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseBoardImportJSON(text);
      if (!parsed) {
        setImportError('Invalid board file. Make sure it was exported from Kan-do.');
        setTimeout(() => setImportError(null), 4000);
      } else {
        addBoard(parsed.name, parsed.description, parsed.columns);
      }
      // Reset so the same file can be re-imported
      if (importInputRef.current) importInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const triggerContent = (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <span className="font-medium text-sm truncate">
        {currentBoard?.name || 'Select Board'}
      </span>
      <span className="text-gray-400">▼</span>
    </div>
  );

  const filteredBoards = boardSearch.trim()
    ? boards.filter((b) => b.name.toLowerCase().includes(boardSearch.toLowerCase()))
    : boards;

  return (
    <>
      <Dropdown trigger={triggerContent} width="w-64">
        <div className="py-2">
          {/* Board Search */}
          {boards.length > 4 && (
            <div className="px-3 pb-2 relative">
              <input
                type="text"
                value={boardSearch}
                onChange={(e) => setBoardSearch(e.target.value)}
                placeholder="Search boards..."
                className="w-full px-2.5 py-1.5 pr-7 text-xs rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                onClick={(e) => e.stopPropagation()}
              />
              {boardSearch && (
                <button
                  onClick={(e) => { e.stopPropagation(); setBoardSearch(''); }}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                >
                  ✕
                </button>
              )}
            </div>
          )}
          {/* Board List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredBoards.length === 0 && boardSearch && (
              <p className="px-3 py-3 text-xs text-gray-400 dark:text-gray-500 text-center">No boards match "{boardSearch}"</p>
            )}
            {filteredBoards.map((board) => (
              <div
                key={board.id}
                className={cn(
                  'px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between group',
                  activeBoard === board.id
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-l-2 border-purple-600'
                    : ''
                )}
              >
                <div className="flex-1 flex items-center gap-2">
                  <button
                    onClick={() => switchBoard(board.id)}
                    className="flex-1 text-left text-xs hover:text-purple-600 dark:hover:text-purple-400"
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
                      {confirmExportBoardId === board.id ? (
                        <span className="flex items-center gap-1 text-xs">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              downloadBoardAsJSON(board);
                              setConfirmExportBoardId(null);
                            }}
                            className="text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-1.5 py-0.5 rounded font-medium"
                          >
                            Export?
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setConfirmExportBoardId(null); }}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1 py-0.5 rounded"
                          >
                            ✕
                          </button>
                        </span>
                      ) : (
                        <button
                          onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setConfirmExportBoardId(board.id);
                            setConfirmDeleteBoardId(null);
                          }}
                          className="text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded text-sm"
                          title="Export board as JSON"
                        >
                          ↓
                        </button>
                      )}
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
                      {user && board.ownerId === user.uid && (
                        <button
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setBoardToShare(board.id);
                            setIsShareModalOpen(true);
                          }}
                          className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 p-1 rounded text-sm"
                          title="Share board"
                        >
                          ⎇
                        </button>
                      )}
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
                    confirmDeleteBoardId === board.id ? (
                      <span className="flex items-center gap-1 text-xs">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleDeleteBoard(board.id);
                            setConfirmDeleteBoardId(null);
                          }}
                          className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-1.5 py-0.5 rounded font-medium"
                        >
                          Delete?
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setConfirmDeleteBoardId(null); }}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1 py-0.5 rounded"
                        >
                          ✕
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setConfirmDeleteBoardId(board.id);
                          setConfirmExportBoardId(null);
                        }}
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded text-sm"
                        title="Delete board"
                      >
                        ✕
                      </button>
                    )
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
            className="w-full px-3 py-1.5 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-purple-600 dark:text-purple-400 font-medium"
          >
            + New Board
          </button>

          {/* Import Board Button */}
          <button
            onClick={() => importInputRef.current?.click()}
            className="w-full px-3 py-1.5 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400 font-medium"
          >
            ↑ Import from JSON
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportFile}
          />
          {importError && (
            <p className="px-3 py-1 text-xs text-red-500 dark:text-red-400">{importError}</p>
          )}
        </div>
      </Dropdown>

      {/* Create Board Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setNewBoardName('');
          setSelectedTemplate(BOARD_TEMPLATES[0]);
        }}
        title="Create New Board"
        contentClassName="max-w-lg"
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

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Choose a template
            </label>
            <BoardTemplateSelector
              selected={selectedTemplate.id}
              onSelect={setSelectedTemplate}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreateModalOpen(false);
                setNewBoardName('');
                setSelectedTemplate(BOARD_TEMPLATES[0]);
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

      {/* Share Board Modal */}
      {user && boardToShare && (
        <ShareBoardModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setBoardToShare(null);
          }}
          board={boards.find((b) => b.id === boardToShare) || null}
          currentUserId={user.uid}
          onBoardUpdated={(updatedBoard) => {
            // Update the board in the store
            const currentBoards = useKanbanStore.getState().boards;
            const updatedBoards = currentBoards.map((b) =>
              b.id === updatedBoard.id ? updatedBoard : b
            );
            useKanbanStore.setState({ boards: updatedBoards });
          }}
        />
      )}
    </>
  );
};

export default BoardSwitcher;

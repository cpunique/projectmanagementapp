'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const createBoardModalOpen = useKanbanStore((state) => state.createBoardModalOpen);
  const setCreateBoardModalOpen = useKanbanStore((state) => state.setCreateBoardModalOpen);

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

  useEffect(() => {
    if (createBoardModalOpen) {
      setIsCreateModalOpen(true);
      setCreateBoardModalOpen(false);
    }
  }, [createBoardModalOpen, setCreateBoardModalOpen]);

  const handleCreateBoard = () => {
    if (newBoardName.trim()) {
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
    if (isSavingDefaultBoard) return;

    if (boardId === 'default-board') {
      console.warn('[BoardSwitcher] Demo board cannot be set as default');
      return;
    }

    const newDefaultId = defaultBoardId === boardId ? null : boardId;
    setIsSavingDefaultBoard(true);
    setDefaultBoard(newDefaultId);

    if (user) {
      try {
        await setUserDefaultBoard(user.uid, newDefaultId);
      } catch (error) {
        console.error('[BoardSwitcher] Failed to save default board:', error);
      }
    }

    setTimeout(() => { setIsSavingDefaultBoard(false); }, 500);
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
      if (importInputRef.current) importInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const filteredBoards = boardSearch.trim()
    ? boards.filter((b) => b.name.toLowerCase().includes(boardSearch.toLowerCase()))
    : boards;

  const triggerContent = (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.05)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
    >
      <span className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>
        {currentBoard?.name || 'Select Board'}
      </span>
      <span className="text-xs" style={{ color: 'var(--muted)' }}>▼</span>
    </div>
  );

  return (
    <>
      <Dropdown trigger={triggerContent} width="w-64" glass>
        <div className="py-2">
          {/* Board Search — shown only when >4 boards */}
          {boards.length > 4 && (
            <div className="px-3 pb-2 relative">
              <input
                type="text"
                value={boardSearch}
                onChange={(e) => setBoardSearch(e.target.value)}
                placeholder="Search boards…"
                className="w-full px-2.5 py-1.5 pr-7 text-xs rounded-md transition-colors"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-2)',
                  color: 'var(--text)',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--purple-l)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(147,51,234,.18)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-2)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onClick={(e) => e.stopPropagation()}
              />
              {boardSearch && (
                <button
                  onClick={(e) => { e.stopPropagation(); setBoardSearch(''); }}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-xs transition-colors"
                  style={{ color: 'var(--muted)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--body)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
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
              <p className="px-3 py-3 text-xs text-center" style={{ color: 'var(--muted)' }}>
                No boards match &ldquo;{boardSearch}&rdquo;
              </p>
            )}
            {filteredBoards.map((board) => (
              <div
                key={board.id}
                className="px-3 py-1.5 transition-colors flex items-center justify-between group"
                style={
                  activeBoard === board.id
                    ? { background: 'rgba(147,51,234,.12)', borderLeft: '2px solid var(--purple)' }
                    : {}
                }
                onMouseEnter={(e) => {
                  if (activeBoard !== board.id) e.currentTarget.style.background = 'rgba(255,255,255,.04)';
                }}
                onMouseLeave={(e) => {
                  if (activeBoard !== board.id) e.currentTarget.style.background = '';
                }}
              >
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => switchBoard(board.id)}
                    className="flex-1 text-left text-xs min-w-0 transition-colors"
                    style={{ color: activeBoard === board.id ? 'var(--purple-l)' : 'var(--body)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--purple-l)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = activeBoard === board.id ? 'var(--purple-l)' : 'var(--body)'; }}
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
                        className="w-full px-2 py-0.5 text-xs rounded"
                        style={{
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border-2)',
                          color: 'var(--text)',
                          outline: 'none',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = 'var(--purple-l)';
                          e.currentTarget.style.boxShadow = '0 0 0 2px rgba(147,51,234,.18)';
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className="block truncate"
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

                {/* Action icon cluster */}
                <div className="flex items-center gap-0.5 shrink-0 ml-1">
                  {!isRenamingBoardId && (
                    <>
                      {/* Export — two-step confirm */}
                      {confirmExportBoardId === board.id ? (
                        <span className="flex items-center gap-0.5 text-xs">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              downloadBoardAsJSON(board);
                              setConfirmExportBoardId(null);
                            }}
                            className="px-1.5 py-0.5 rounded font-medium text-xs transition-colors"
                            style={{ color: 'var(--amber)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(251,191,36,.12)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                          >
                            Export?
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setConfirmExportBoardId(null); }}
                            className="px-1 py-0.5 rounded text-xs transition-colors"
                            style={{ color: 'var(--muted)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--body)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
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
                          className="p-1 rounded text-sm transition-colors"
                          style={{ color: 'var(--muted)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'var(--body)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--muted)'; }}
                          title="Export board as JSON"
                        >
                          ↓
                        </button>
                      )}

                      {/* Clone ⎘ — blue */}
                      <button
                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setBoardToClone(board.id);
                          setIsCloneModalOpen(true);
                        }}
                        className="p-1 rounded text-sm transition-colors"
                        style={{ color: '#60a5fa' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(96,165,250,.12)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                        title="Clone board"
                      >
                        ⎘
                      </button>

                      {/* Share ⎇ — green, owner only */}
                      {user && board.ownerId === user.uid && (
                        <button
                          onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setBoardToShare(board.id);
                            setIsShareModalOpen(true);
                          }}
                          className="p-1 rounded text-sm transition-colors"
                          style={{ color: 'var(--green)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(74,222,128,.12)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                          title="Share board"
                        >
                          ⎇
                        </button>
                      )}

                      {/* Default ★ — purple when set, dim when not */}
                      <button
                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleSetDefaultBoard(board.id);
                        }}
                        onDoubleClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                        disabled={isSavingDefaultBoard}
                        className={cn('p-1 text-base transition-all duration-200', isSavingDefaultBoard && 'opacity-50 cursor-not-allowed')}
                        style={{
                          color: defaultBoardId === board.id ? 'var(--purple-l)' : 'var(--border-2)',
                          transform: defaultBoardId === board.id ? 'scale(1.1)' : undefined,
                        }}
                        onMouseEnter={(e) => {
                          if (!isSavingDefaultBoard) e.currentTarget.style.color = 'var(--purple-l)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = defaultBoardId === board.id ? 'var(--purple-l)' : 'var(--border-2)';
                        }}
                        title={defaultBoardId === board.id ? 'Remove as default' : 'Make default'}
                      >
                        {defaultBoardId === board.id ? '★' : '☆'}
                      </button>
                    </>
                  )}

                  {/* Delete ✕ — red, hidden when only board, two-step confirm */}
                  {boards.length > 1 && !isRenamingBoardId && (
                    confirmDeleteBoardId === board.id ? (
                      <span className="flex items-center gap-0.5 text-xs">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleDeleteBoard(board.id);
                            setConfirmDeleteBoardId(null);
                          }}
                          className="px-1.5 py-0.5 rounded font-medium text-xs transition-colors"
                          style={{ color: 'var(--red)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(251,113,133,.12)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                        >
                          Delete?
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setConfirmDeleteBoardId(null); }}
                          className="px-1 py-0.5 rounded text-xs transition-colors"
                          style={{ color: 'var(--muted)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--body)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
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
                        className="p-1 rounded text-sm transition-colors"
                        style={{ color: 'var(--red)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(251,113,133,.12)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
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
          <div style={{ height: '1px', background: 'var(--border)', margin: '6px 0' }} />

          {/* New Board */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full px-3 py-1.5 text-xs text-left font-medium transition-colors"
            style={{ color: 'var(--purple-l)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(147,51,234,.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
          >
            + New Board
          </button>

          {/* Import from JSON */}
          <button
            onClick={() => importInputRef.current?.click()}
            className="w-full px-3 py-1.5 text-xs text-left font-medium transition-colors"
            style={{ color: 'var(--body)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
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
            <p className="px-3 py-1 text-xs" style={{ color: 'var(--red)' }}>{importError}</p>
          )}
        </div>
      </Dropdown>

      {/* Create Board Modal */}
      {typeof window !== 'undefined' && createPortal(
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
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateBoard(); }}
            />
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--body)' }}>
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
        </Modal>,
        document.body
      )}

      {/* Clone Board Modal */}
      {boardToClone && boards.find((b) => b.id === boardToClone) && (
        <CloneBoardModal
          isOpen={isCloneModalOpen}
          onClose={() => { setIsCloneModalOpen(false); setBoardToClone(null); }}
          sourceBoard={boards.find((b) => b.id === boardToClone)!}
        />
      )}

      {/* Share Board Modal */}
      {user && boardToShare && (
        <ShareBoardModal
          isOpen={isShareModalOpen}
          onClose={() => { setIsShareModalOpen(false); setBoardToShare(null); }}
          board={boards.find((b) => b.id === boardToShare) || null}
          currentUserId={user.uid}
          onBoardUpdated={(updatedBoard) => {
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

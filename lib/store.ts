'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Board, Card, Column, ChecklistItem, KanbanStore } from '@/types';
import {
  MAX_COLUMNS,
  DEFAULT_BOARD_ID,
  DEFAULT_BOARD_NAME,
  DEFAULT_COLUMNS,
  DEMO_CARDS,
  DESCOPED_COLUMN_KEYWORDS,
  PRODUCTION_BACKUP_DATA
} from '@/lib/constants';

// Create default board with default columns
function createDefaultBoard(): Board {
  const columns: Column[] = DEFAULT_COLUMNS.map((col, index) => ({
    id: nanoid(),
    title: col.title,
    order: col.order,
    boardId: DEFAULT_BOARD_ID,
    cards: [],
  }));

  return {
    id: DEFAULT_BOARD_ID,
    name: DEFAULT_BOARD_NAME,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    columns,
  };
}


// Create demo board with sample cards
function createDemoBoard(): Board {
  const board = createDefaultBoard();
  const demoData = [...DEMO_CARDS] as any[];

  // Add demo cards to appropriate columns
  demoData.forEach((cardData) => {
    const column = board.columns[cardData.columnOrder];
    if (column) {
      const card: Card = {
        id: nanoid(),
        title: cardData.title,
        description: cardData.description,
        columnId: column.id,
        boardId: board.id,
        order: column.cards.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        priority: cardData.priority,
        tags: cardData.tags,
        checklist: cardData.checklist?.map((item: any) => ({
          id: nanoid(),
          text: item.text,
          completed: item.completed,
          order: 0,
        })),
      };
      column.cards.push(card);
    }
  });

  return board;
}

// Ensure board has all default columns (migration function)
function ensureDefaultColumns(board: Board): Board {
  // Check which default columns are missing
  const existingTitles = board.columns.map((c) =>
    c.title.toLowerCase()
  );
  const missingColumns = DEFAULT_COLUMNS.filter(
    (col) => !existingTitles.includes(col.title.toLowerCase())
  );

  // If all columns exist, return board unchanged
  if (missingColumns.length === 0) {
    return board;
  }

  // Create new columns for missing ones
  const maxOrder = Math.max(...board.columns.map((c) => c.order), -1);
  const newColumns: Column[] = missingColumns.map((col, index) => ({
    id: nanoid(),
    title: col.title,
    order: maxOrder + 1 + index,
    boardId: board.id,
    cards: [],
  }));

  // Return board with existing and new columns
  return {
    ...board,
    columns: [...board.columns, ...newColumns],
  };
}

export const useKanbanStore = create<KanbanStore>()(
  persist(
    (set, get) => ({
      boards: [createDefaultBoard()],
      activeBoard: DEFAULT_BOARD_ID,
      demoMode: false,
      darkMode: true,
      searchQuery: '',
      filters: {},
      dueDatePanelOpen: true,
      dueDatePanelWidth: 320,
      _dataRecovery: null as any, // Store for data recovery attempts

      // Board actions
      addBoard: (name: string) => {
        const newBoard: Board = {
          id: nanoid(),
          name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          columns: DEFAULT_COLUMNS.map((col) => ({
            id: nanoid(),
            title: col.title,
            order: col.order,
            boardId: '',
            cards: [],
          })),
        };

        // Update board IDs
        newBoard.columns.forEach((col) => {
          col.boardId = newBoard.id;
        });

        set((state) => ({
          boards: [...state.boards, newBoard],
          activeBoard: newBoard.id,
        }));
      },

      deleteBoard: (boardId: string) => {
        set((state) => {
          const boards = state.boards.filter((b) => b.id !== boardId);
          const newActiveBoard =
            state.activeBoard === boardId
              ? boards[0]?.id || null
              : state.activeBoard;
          return {
            boards,
            activeBoard: newActiveBoard,
          };
        });
      },

      updateBoard: (boardId: string, name: string) => {
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId
              ? { ...b, name, updatedAt: new Date().toISOString() }
              : b
          ),
        }));
      },

      switchBoard: (boardId: string) => {
        set({ activeBoard: boardId });
      },

      exportBoards: (boardId?: string) => {
        const state = get();
        const boardsToExport = boardId
          ? state.boards.filter((b) => b.id === boardId)
          : state.boards;
        return JSON.stringify({ boards: boardsToExport, version: 1 });
      },

      importBoards: (jsonData: string) => {
        try {
          const data = JSON.parse(jsonData);
          if (data.boards && Array.isArray(data.boards)) {
            set((state) => ({
              boards: [...state.boards, ...data.boards],
              activeBoard: data.boards[0]?.id || state.activeBoard,
            }));
          }
        } catch (error) {
          console.error('Failed to import boards:', error);
        }
      },

      recoverFromBackup: (backupData: string) => {
        try {
          const data = JSON.parse(backupData);
          // Handle both full state backups and just boards array
          const boards = data.boards || (Array.isArray(data) ? data : []);
          if (boards.length > 0) {
            set((state) => ({
              boards: boards.map((board: Board) => ensureDefaultColumns(board)),
              activeBoard: boards[0]?.id || DEFAULT_BOARD_ID,
              demoMode: false,
            }));
            console.log(`Successfully recovered ${boards.length} board(s)`);
          }
        } catch (error) {
          console.error('Failed to recover from backup:', error);
        }
      },

      // Column actions
      addColumn: (boardId: string, title: string) => {
        set((state) => {
          const board = state.boards.find((b) => b.id === boardId);
          if (!board || board.columns.length >= MAX_COLUMNS) return state;

          const newColumn: Column = {
            id: nanoid(),
            title,
            order: Math.max(...board.columns.map((c) => c.order), -1) + 1,
            boardId,
            cards: [],
          };

          return {
            boards: state.boards.map((b) =>
              b.id === boardId
                ? { ...b, columns: [...b.columns, newColumn] }
                : b
            ),
          };
        });
      },

      deleteColumn: (boardId: string, columnId: string) => {
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  columns: b.columns.filter((c) => c.id !== columnId),
                }
              : b
          ),
        }));
      },

      updateColumn: (boardId: string, columnId: string, title: string) => {
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  columns: b.columns.map((c) =>
                    c.id === columnId ? { ...c, title } : c
                  ),
                }
              : b
          ),
        }));
      },

      reorderColumns: (boardId: string, columnIds: string[]) => {
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  columns: b.columns
                    .map((c) => ({
                      ...c,
                      order: columnIds.indexOf(c.id),
                    }))
                    .sort((a, b) => a.order - b.order),
                }
              : b
          ),
        }));
      },

      // Card actions
      addCard: (boardId: string, columnId: string, cardData) => {
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  columns: b.columns.map((c) =>
                    c.id === columnId
                      ? {
                          ...c,
                          cards: [
                            ...c.cards,
                            {
                              ...cardData,
                              id: nanoid(),
                              boardId,
                              columnId,
                              order: c.cards.length,
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                            } as Card,
                          ],
                        }
                      : c
                  ),
                }
              : b
          ),
        }));
      },

      deleteCard: (boardId: string, cardId: string) => {
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  columns: b.columns.map((c) => ({
                    ...c,
                    cards: c.cards.filter((card) => card.id !== cardId),
                  })),
                }
              : b
          ),
        }));
      },

      updateCard: (boardId: string, cardId: string, cardData) => {
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  columns: b.columns.map((c) => ({
                    ...c,
                    cards: c.cards.map((card) =>
                      card.id === cardId
                        ? {
                            ...card,
                            ...cardData,
                            updatedAt: new Date().toISOString(),
                          }
                        : card
                    ),
                  })),
                }
              : b
          ),
        }));
      },

      moveCard: (
        boardId: string,
        cardId: string,
        fromColumnId: string,
        toColumnId: string,
        newOrder: number
      ) => {
        set((state) => {
          let card: Card | null = null;

          // Find and remove card from source column
          const newBoards = state.boards.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  columns: b.columns.map((c) => {
                    if (c.id === fromColumnId) {
                      const cardToMove = c.cards.find((ca) => ca.id === cardId);
                      if (cardToMove) {
                        card = cardToMove;
                      }
                      return {
                        ...c,
                        cards: c.cards.filter((ca) => ca.id !== cardId),
                      };
                    }
                    return c;
                  }),
                }
              : b
          );

          if (!card) return state;

          // Add card to target column
          return {
            boards: newBoards.map((b) =>
              b.id === boardId
                ? {
                    ...b,
                    columns: b.columns.map((c) => {
                      if (c.id === toColumnId) {
                        // Auto-detect if destination is a descoped column and update status
                        const isDescopedColumn = DESCOPED_COLUMN_KEYWORDS.some((keyword) =>
                          c.title.toLowerCase().includes(keyword)
                        );

                        const updatedCard: Card = {
                          ...card!,
                          columnId: toColumnId,
                          status: isDescopedColumn ? 'descoped' : 'active' as const,
                        };
                        const newCards = [...c.cards];
                        newCards.splice(newOrder, 0, updatedCard);
                        // Update order for all cards
                        return {
                          ...c,
                          cards: newCards.map((ca, idx) => ({
                            ...ca,
                            order: idx,
                          })),
                        };
                      }
                      return c;
                    }),
                  }
                : b
            ),
          };
        });
      },

      reorderCards: (boardId: string, columnId: string, cardIds: string[]) => {
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  columns: b.columns.map((c) =>
                    c.id === columnId
                      ? {
                          ...c,
                          cards: c.cards
                            .map((card) => ({
                              ...card,
                              order: cardIds.indexOf(card.id),
                            }))
                            .sort((a, b) => a.order - b.order),
                        }
                      : c
                  ),
                }
              : b
          ),
        }));
      },

      // Checklist actions
      addChecklistItem: (boardId: string, cardId: string, text: string) => {
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  columns: b.columns.map((c) => ({
                    ...c,
                    cards: c.cards.map((card) =>
                      card.id === cardId
                        ? {
                            ...card,
                            checklist: [
                              ...(card.checklist || []),
                              {
                                id: nanoid(),
                                text,
                                completed: false,
                                order: (card.checklist?.length || 0),
                              },
                            ],
                          }
                        : card
                    ),
                  })),
                }
              : b
          ),
        }));
      },

      deleteChecklistItem: (
        boardId: string,
        cardId: string,
        itemId: string
      ) => {
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  columns: b.columns.map((c) => ({
                    ...c,
                    cards: c.cards.map((card) =>
                      card.id === cardId
                        ? {
                            ...card,
                            checklist: card.checklist?.filter(
                              (item) => item.id !== itemId
                            ),
                          }
                        : card
                    ),
                  })),
                }
              : b
          ),
        }));
      },

      toggleChecklistItem: (
        boardId: string,
        cardId: string,
        itemId: string
      ) => {
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  columns: b.columns.map((c) => ({
                    ...c,
                    cards: c.cards.map((card) =>
                      card.id === cardId
                        ? {
                            ...card,
                            checklist: card.checklist?.map((item) =>
                              item.id === itemId
                                ? { ...item, completed: !item.completed }
                                : item
                            ),
                          }
                        : card
                    ),
                  })),
                }
              : b
          ),
        }));
      },

      // Due dates panel actions
      toggleDueDatePanel: () => set((state) => ({ dueDatePanelOpen: !state.dueDatePanelOpen })),
      setDueDatePanelWidth: (width: number) => {
        const MIN_WIDTH = 280;
        const MAX_WIDTH = 600;
        const constrainedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
        set({ dueDatePanelWidth: constrainedWidth });
      },

      // UI state actions
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      toggleDemoMode: () =>
        set((state) => {
          const newDemoMode = !state.demoMode;

          if (newDemoMode) {
            // Entering demo mode - save current user boards in state and show demo board
            const demoBoard = createDemoBoard();
            return {
              demoMode: newDemoMode,
              boards: [demoBoard],
              activeBoard: demoBoard.id,
              _userBoardsBackup: state.boards, // Save boards for restoration
            };
          } else {
            // Exiting demo mode - restore saved user boards
            const restoredBoards = state._userBoardsBackup;
            if (restoredBoards && restoredBoards.length > 0) {
              return {
                demoMode: newDemoMode,
                boards: restoredBoards,
                activeBoard: restoredBoards[0].id,
                _userBoardsBackup: undefined,
              };
            } else {
              return {
                demoMode: newDemoMode,
                boards: [createDefaultBoard()],
                activeBoard: DEFAULT_BOARD_ID,
                _userBoardsBackup: undefined,
              };
            }
          }
        }),
      setSearchQuery: (query: string) => set({ searchQuery: query }),
      setFilters: (filters) => set({ filters }),
      clearFilters: () => set({ filters: {} }),

      // History actions (basic implementation without temporal middleware for now)
      undo: () => {
        // Will be enhanced with temporal middleware
      },
      redo: () => {
        // Will be enhanced with temporal middleware
      },
      clearHistory: () => {
        // Will be enhanced with temporal middleware
      },
    }),
    {
      name: 'kanban-store',
      version: 2,
      onRehydrateStorage: () => (state, error) => {
        // After rehydration, check if we need to restore backup data
        if (state && state.boards && state.boards.length === 1 && state.boards[0].id === DEFAULT_BOARD_ID && state.boards[0].columns.every((c: any) => c.cards.length === 0)) {
          // Only has the empty default board, restore from backup
          const backupBoards = (PRODUCTION_BACKUP_DATA as any)?.state?.boards;
          if (backupBoards && backupBoards.length > 0) {
            // Debug: Log backup data structure BEFORE restoration
            const backupCardsWithPrompts = backupBoards.flatMap((b: any) =>
              b.columns.flatMap((c: any) =>
                c.cards.filter((card: any) => card.aiPrompt)
              )
            );
            console.log(`📦 Backup data contains ${backupCardsWithPrompts.length} cards with AI prompts:`, backupCardsWithPrompts.map((c: any) => ({ title: c.title, promptLength: c.aiPrompt?.length || 0 })));

            // Restore and log the restored state
            const restoredBoards = backupBoards.map((board: Board) =>
              ensureDefaultColumns(board)
            );

            // Debug: Check if restoration preserved aiPrompt fields
            const restoredCardsWithPrompts = restoredBoards.flatMap((b: Board) =>
              b.columns.flatMap((c: Column) =>
                c.cards.filter((card: Card) => card.aiPrompt)
              )
            );
            console.log(`✅ After ensureDefaultColumns: ${restoredCardsWithPrompts.length} cards have AI prompts`);

            state.boards = restoredBoards;
            state.activeBoard = backupBoards[0]?.id || DEFAULT_BOARD_ID;

            console.log(`✅ Restored ${backupBoards.length} board(s) from backup data`);
            console.log(`📝 Final state cards with AI prompts:`, restoredCardsWithPrompts.map((c: Card) => ({ title: c.title, promptLength: c.aiPrompt?.length || 0 })));
          }
        }
      },
      migrate: (persistedState: any, version: number) => {
        // Try to recover from corrupted or missing state
        let boards = [];
        let activeBoard = DEFAULT_BOARD_ID;
        let darkMode = true;
        let otherState: any = {};

        if (persistedState && typeof persistedState === 'object') {
          // Extract boards from persisted state
          boards = persistedState.boards || [];
          activeBoard = persistedState.activeBoard || DEFAULT_BOARD_ID;
          darkMode = persistedState.darkMode !== undefined ? persistedState.darkMode : true;

          // Preserve other state properties
          otherState = {
            searchQuery: persistedState.searchQuery || '',
            filters: persistedState.filters || {},
            dueDatePanelOpen: persistedState.dueDatePanelOpen !== undefined ? persistedState.dueDatePanelOpen : true,
            dueDatePanelWidth: persistedState.dueDatePanelWidth || 320,
            demoMode: persistedState.demoMode || false,
          };
        }

        // If we have boards from old version, apply migration
        if (boards.length > 0 && version < 2) {
          boards = boards.map((board: Board) =>
            ensureDefaultColumns(board)
          );
        }

        // If no boards exist, try to use the production backup data
        if (boards.length === 0) {
          const backupBoards = (PRODUCTION_BACKUP_DATA as any)?.state?.boards;
          if (backupBoards && backupBoards.length > 0) {
            boards = backupBoards.map((board: Board) =>
              ensureDefaultColumns(board)
            );
            activeBoard = backupBoards[0]?.id || DEFAULT_BOARD_ID;
            console.log(`✅ Recovered ${boards.length} board(s) from backup data`);
          } else {
            // Fall back to creating a default board
            boards = [createDefaultBoard()];
          }
        }

        // Validate active board exists
        const validActiveBoard = boards.some((b: Board) => b.id === activeBoard)
          ? activeBoard
          : boards[0]?.id || DEFAULT_BOARD_ID;

        return {
          boards,
          activeBoard: validActiveBoard,
          darkMode,
          demoMode: false,
          searchQuery: otherState.searchQuery || '',
          filters: otherState.filters || {},
          dueDatePanelOpen: otherState.dueDatePanelOpen !== undefined ? otherState.dueDatePanelOpen : true,
          dueDatePanelWidth: otherState.dueDatePanelWidth || 320,
          ...otherState,
        };
      },
    }
  )
);

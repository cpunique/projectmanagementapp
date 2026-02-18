'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Board, Card, Column, ChecklistItem, KanbanStore, Notification, InstructionType } from '@/types';
import {
  MAX_COLUMNS,
  DEFAULT_BOARD_ID,
  DEFAULT_BOARD_NAME,
  DEFAULT_COLUMNS,
  DEMO_CARDS,
  DESCOPED_COLUMN_KEYWORDS
} from '@/lib/constants';

// Create default board with default columns
function createDefaultBoard(ownerId: string = 'demo-user'): Board {
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
    ownerId,
    sharedWith: [],
    sharedWithUserIds: [],
  };
}


// Create demo board with sample cards
function createDemoBoard(customBoard?: Board): Board {
  // If custom board provided (from Firestore), use it
  if (customBoard) {
    return customBoard;
  }

  // Otherwise, fall back to hardcoded demo
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
      defaultBoardId: null,
      demoMode: false,
      darkMode: true,
      searchQuery: '',
      filters: {},
      dueDatePanelOpen: true,
      activityPanelOpen: false,
      dueDatePanelWidth: 320,
      zoomLevel: 80,
      hasUnsavedChanges: false,
      // Sync state
      syncState: 'idle',
      lastSyncTime: null,
      pendingOperations: 0,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      syncProgress: undefined,
      // Conflict detection
      conflictState: undefined,
      // Notifications
      notifications: [],

      // Board actions
      addBoard: (name: string, description?: string, templateColumns?: { title: string; order: number }[]) => {
        const columnsSource = templateColumns || DEFAULT_COLUMNS;
        const newBoard: Board = {
          id: nanoid(),
          name,
          description: description || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          columns: columnsSource.map((col) => ({
            id: nanoid(),
            title: col.title,
            order: col.order,
            boardId: '',
            cards: [],
          })),
          ownerId: '', // Will be set when synced to Firebase
          sharedWith: [],
          sharedWithUserIds: [],
        };

        // Update board IDs
        newBoard.columns.forEach((col) => {
          col.boardId = newBoard.id;
        });

        set((state) => ({
          boards: [...state.boards, newBoard],
          activeBoard: newBoard.id,
          hasUnsavedChanges: true,
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
            hasUnsavedChanges: true,
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
          hasUnsavedChanges: true,
        }));
      },

      updateBoardDescription: (boardId: string, description: string) => {
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId
              ? { ...b, description, updatedAt: new Date().toISOString() }
              : b
          ),
          hasUnsavedChanges: true,
        }));
      },

      updateBoardPurpose: (boardId: string, purpose: InstructionType) => {
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId
              ? { ...b, purpose, updatedAt: new Date().toISOString() }
              : b
          ),
          hasUnsavedChanges: true,
        }));
      },

      switchBoard: (boardId: string) => {
        set({ activeBoard: boardId });
      },

      setDefaultBoard: (boardId: string | null) => {
        // Don't mark as unsaved - default board is saved immediately in BoardSwitcher
        set({ defaultBoardId: boardId });
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
            hasUnsavedChanges: true,
          };
        });

        import('@/lib/firebase/activities').then(({ logActivity }) => {
          logActivity(boardId, { eventType: 'column_added', columnTitle: title }).catch(() => {});
        }).catch(() => {});
      },

      deleteColumn: (boardId: string, columnId: string) => {
        const state = get();
        const board = state.boards.find(b => b.id === boardId);
        const column = board?.columns.find(c => c.id === columnId);
        const columnTitle = column?.title || 'Untitled';

        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  columns: b.columns.filter((c) => c.id !== columnId),
                }
              : b
          ),
          hasUnsavedChanges: true,
        }));

        import('@/lib/firebase/activities').then(({ logActivity }) => {
          logActivity(boardId, { eventType: 'column_deleted', columnTitle }).catch(() => {});
        }).catch(() => {});
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
          hasUnsavedChanges: true,
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
          hasUnsavedChanges: true,
        }));
      },

      // Card actions
      addCard: (boardId: string, columnId: string, cardData) => {
        const state = get();
        const board = state.boards.find(b => b.id === boardId);
        const column = board?.columns.find(c => c.id === columnId);
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
          hasUnsavedChanges: true,
        }));
        // Log activity (async, non-blocking)
        import('@/lib/firebase/activities').then(({ logActivity }) => {
          logActivity(boardId, {
            eventType: 'card_added',
            cardTitle: cardData.title || 'Untitled',
            columnTitle: column?.title,
          }).catch(() => {});
        }).catch(() => {});
      },

      deleteCard: (boardId: string, cardId: string) => {
        // Capture card info before deletion for activity log
        const state = get();
        const board = state.boards.find(b => b.id === boardId);
        const card = board?.columns.flatMap(c => c.cards).find(c => c.id === cardId);
        const cardTitle = card?.title || 'Untitled';

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
          hasUnsavedChanges: true,
        }));

        import('@/lib/firebase/activities').then(({ logActivity }) => {
          logActivity(boardId, { eventType: 'card_deleted', cardTitle }).catch(() => {});
        }).catch(() => {});
      },

      updateCard: (boardId: string, cardId: string, cardData) => {
        // Capture old card state for activity logging (title, priority, dueDate changes)
        const preState = get();
        const preBoard = preState.boards.find(b => b.id === boardId);
        const preCard = preBoard?.columns.flatMap(c => c.cards).find(c => c.id === cardId);

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
          hasUnsavedChanges: true,
        }));

        // Log activity for meaningful field changes (title, priority, dueDate)
        if (preCard && boardId !== 'default-board') {
          const fieldsChanged: string[] = [];
          if (cardData.title !== undefined && cardData.title !== preCard.title) fieldsChanged.push('title');
          if (cardData.priority !== undefined && cardData.priority !== preCard.priority) fieldsChanged.push('priority');
          if (cardData.dueDate !== undefined && cardData.dueDate !== preCard.dueDate) fieldsChanged.push('due date');

          if (fieldsChanged.length > 0) {
            import('@/lib/firebase/activities').then(({ logActivity }) => {
              logActivity(boardId, {
                eventType: 'card_updated',
                cardId,
                cardTitle: cardData.title || preCard.title || 'Untitled',
                fieldChanged: fieldsChanged.join(', '),
              }).catch(() => {});
            }).catch(() => {});
          }
        }
      },

      moveCard: (
        boardId: string,
        cardId: string,
        fromColumnId: string,
        toColumnId: string,
        newOrder: number
      ) => {
        // Capture info for activity log before the move
        const preState = get();
        const preBoard = preState.boards.find(b => b.id === boardId);
        const fromCol = preBoard?.columns.find(c => c.id === fromColumnId);
        const toCol = preBoard?.columns.find(c => c.id === toColumnId);
        const movingCard = fromCol?.cards.find(c => c.id === cardId);

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
            hasUnsavedChanges: true,
          };
        });

        // Log card move activity (only for cross-column moves)
        if (fromColumnId !== toColumnId && movingCard) {
          import('@/lib/firebase/activities').then(({ logActivity }) => {
            logActivity(boardId, {
              eventType: 'card_moved',
              cardId,
              cardTitle: movingCard.title,
              fromColumnTitle: fromCol?.title,
              toColumnTitle: toCol?.title,
            }).catch(() => {});
          }).catch(() => {});
        }
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
          hasUnsavedChanges: true,
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
          hasUnsavedChanges: true,
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
          hasUnsavedChanges: true,
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
          hasUnsavedChanges: true,
        }));
      },

      // Comment actions
      addComment: (
        boardId: string,
        cardId: string,
        authorId: string,
        authorEmail: string,
        content: string,
        mentions?: { userId: string; email: string }[]
      ) => {
        const commentId = nanoid();
        const newComment = {
          id: commentId,
          authorId,
          authorEmail,
          content,
          createdAt: new Date().toISOString(),
          mentions,
        };

        // Get board and card info before set() for Firebase notifications
        const state = get();
        const board = state.boards.find(b => b.id === boardId);
        const card = board?.columns.flatMap(c => c.cards).find(c => c.id === cardId);

        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  updatedAt: new Date().toISOString(),
                  columns: b.columns.map((c) => ({
                    ...c,
                    cards: c.cards.map((cardItem) =>
                      cardItem.id === cardId
                        ? {
                            ...cardItem,
                            comments: [...(cardItem.comments || []), newComment],
                            updatedAt: new Date().toISOString(),
                          }
                        : cardItem
                    ),
                  })),
                }
              : b
          ),
          hasUnsavedChanges: true,
        }));

        // Create Firebase notifications for mentioned users (async, non-blocking)
        console.log('[Store] addComment - mentions:', mentions, 'board:', board?.name, 'card:', card?.title);
        if (mentions && mentions.length > 0 && board && card) {
          console.log('[Store] Creating notifications for:', mentions.map(m => m.email));
          import('@/lib/firebase/notifications').then(({ createMentionNotifications }) => {
            createMentionNotifications(
              mentions,
              authorId,
              authorEmail,
              boardId,
              board.name,
              cardId,
              card.title,
              commentId
            )
              .then(() => console.log('[Store] Notifications created successfully'))
              .catch(err => console.error('[Store] Failed to create mention notifications:', err));
          });
        }

        // Log activity
        import('@/lib/firebase/activities').then(({ logActivity }) => {
          logActivity(boardId, {
            eventType: 'comment_added',
            cardId,
            cardTitle: card?.title,
            commentSnippet: content.replace(/<[^>]*>/g, '').substring(0, 100),
          }).catch(() => {});
        }).catch(() => {});
      },

      editComment: (
        boardId: string,
        cardId: string,
        commentId: string,
        content: string,
        mentions?: { userId: string; email: string }[]
      ) => {
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  updatedAt: new Date().toISOString(),
                  columns: b.columns.map((c) => ({
                    ...c,
                    cards: c.cards.map((card) =>
                      card.id === cardId
                        ? {
                            ...card,
                            comments: card.comments?.map((comment) =>
                              comment.id === commentId
                                ? {
                                    ...comment,
                                    content,
                                    mentions,
                                    updatedAt: new Date().toISOString(),
                                    isEdited: true,
                                  }
                                : comment
                            ),
                            updatedAt: new Date().toISOString(),
                          }
                        : card
                    ),
                  })),
                }
              : b
          ),
          hasUnsavedChanges: true,
        }));
      },

      deleteComment: (boardId: string, cardId: string, commentId: string) => {
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  updatedAt: new Date().toISOString(),
                  columns: b.columns.map((c) => ({
                    ...c,
                    cards: c.cards.map((card) =>
                      card.id === cardId
                        ? {
                            ...card,
                            comments: card.comments?.filter(
                              (comment) => comment.id !== commentId
                            ),
                            updatedAt: new Date().toISOString(),
                          }
                        : card
                    ),
                  })),
                }
              : b
          ),
          hasUnsavedChanges: true,
        }));
      },

      // Notification actions
      addNotification: (notification) => {
        set((state) => ({
          notifications: [...state.notifications, { ...notification, id: nanoid() }],
        }));
      },

      markNotificationRead: (notificationId: string) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          ),
        }));
      },

      markAllNotificationsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
      },

      clearNotifications: () => {
        set({ notifications: [] });
      },

      // Activity panel actions
      toggleActivityPanel: () => set((state) => ({ activityPanelOpen: !state.activityPanelOpen })),
      setActivityPanelOpen: (isOpen: boolean) => set({ activityPanelOpen: isOpen }),

      // Due dates panel actions
      toggleDueDatePanel: () => set((state) => ({ dueDatePanelOpen: !state.dueDatePanelOpen })),
      setDueDatePanelOpen: (isOpen: boolean) => set({ dueDatePanelOpen: isOpen }),
      setDueDatePanelWidth: (width: number) => {
        const MIN_WIDTH = 280;
        const MAX_WIDTH = 600;
        const constrainedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
        set({ dueDatePanelWidth: constrainedWidth });
      },

      // Zoom actions
      setZoomLevel: (level: number) => {
        const clamped = Math.max(50, Math.min(150, level));
        set({ zoomLevel: clamped });
      },

      // UI state actions
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      setDarkMode: (darkMode) => set({ darkMode }),
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
            // BUT DO NOT change activeBoard - Firebase sync has already set the correct board
            const restoredBoards = state._userBoardsBackup;
            if (restoredBoards && restoredBoards.length > 0) {
              return {
                demoMode: newDemoMode,
                boards: restoredBoards,
                // activeBoard: KEEP CURRENT - Firebase has already set it to default board
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

      setDemoMode: (enabled: boolean, customDemoBoard?: Board) =>
        set((state) => {
          // Idempotent: if already in desired state, do nothing
          if (state.demoMode === enabled) {
            return state;
          }

          if (enabled) {
            // Entering demo mode
            const demoBoard = createDemoBoard(customDemoBoard);
            return {
              demoMode: true,
              boards: [demoBoard],
              activeBoard: demoBoard.id,
              _userBoardsBackup: state.boards,
            };
          } else {
            // Exiting demo mode
            const restoredBoards = state._userBoardsBackup;
            if (restoredBoards && restoredBoards.length > 0) {
              return {
                demoMode: false,
                boards: restoredBoards,
                _userBoardsBackup: undefined,
              };
            } else {
              return {
                demoMode: false,
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

      // Firebase sync actions
      setBoards: (boards: Board[]) => {
        set({ boards });
      },

      updateBoardFromFirebase: (boardId: string, updatedBoard: Board) => {
        set((state) => ({
          boards: state.boards.map((b) => (b.id === boardId ? updatedBoard : b)),
        }));
      },

      // Load all boards from localStorage (for migration purposes)
      loadAllBoardsFromLocalStorage: () => {
        try {
          // Access the persisted Zustand state directly from localStorage
          const stored = localStorage.getItem('kanban-store');
          if (stored) {
            const parsed = JSON.parse(stored);
            const allBoards = parsed.state?.boards || [];
            if (allBoards.length > 0) {
              set({ boards: allBoards });
              return allBoards;
            }
          }
        } catch (error) {
          console.error('Failed to load all boards from localStorage:', error);
        }
        return get().boards;
      },

      // Manual save actions
      markAsUnsaved: () => set({ hasUnsavedChanges: true }),
      markAsSaved: () => set({ hasUnsavedChanges: false }),
      saveToFirebase: async () => {
        // This is a placeholder - actual implementation is in SaveButton
        // which has access to the authenticated user
        set({ hasUnsavedChanges: false });
      },

      // Sync state actions
      setSyncState: (state) => set({ syncState: state }),
      setLastSyncTime: (time) => set({ lastSyncTime: time }),
      setPendingOperations: (count) => set({ pendingOperations: count }),
      setIsOnline: (isOnline) => set({ isOnline }),
      incrementPendingOperations: () => set((state) => ({ pendingOperations: state.pendingOperations + 1 })),
      decrementPendingOperations: () => set((state) => ({ pendingOperations: Math.max(0, state.pendingOperations - 1) })),
      setSyncProgress: (progress) => set({ syncProgress: progress }),
      setConflictState: (conflict) => set({ conflictState: conflict }),
    }),
    {
      name: 'kanban-store',
      version: 1,
      // CRITICAL SECURITY FIX: Exclude boards, activeBoard, defaultBoardId, and demoMode from localStorage
      // Boards are the source of truth in Firebase, not localStorage
      // Persisting boards causes cross-account data leakage when users switch accounts
      // demoMode is temporary state that should only exist during landing page session
      // Only persistent client-side UI state (darkMode, filters, etc.) should be in localStorage
      partialize: (state) => {
        // Exclude Firebase-managed state and transient state from localStorage
        const { boards, activeBoard, defaultBoardId, demoMode, conflictState, activityPanelOpen, ...rest } = state;
        return rest;
      },
      merge: (persistedState, currentState) => {
        // Shallow merge persisted UI state into current state
        // CRITICAL: Never overwrite Firebase-managed fields (boards, activeBoard, defaultBoardId)
        // These are set by initializeFirebaseSync and must not be reset by rehydration
        const persisted = (persistedState || {}) as Partial<KanbanStore>;
        return {
          ...currentState,
          ...persisted,
          // Always preserve Firebase-managed fields from current state
          boards: currentState.boards,
          activeBoard: currentState.activeBoard,
          defaultBoardId: currentState.defaultBoardId,
          demoMode: currentState.demoMode,
          conflictState: currentState.conflictState,
          activityPanelOpen: currentState.activityPanelOpen,
        };
      },
      // Skip automatic rehydration during SSR to prevent hydration mismatches.
      // Rehydration is triggered manually by StoreHydration component after mount.
      skipHydration: true,
    }
  )
);


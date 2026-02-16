import { User } from 'firebase/auth';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from './AuthContext';
import { isAdmin } from '@/lib/admin/isAdmin';
import { saveDemoConfig } from './demoConfig';
import {
  getUserBoards,
  subscribeToBoard,
  createBoard,
  updateBoard,
  deleteBoard as deleteFirestoreBoard,
  getUserDefaultBoard,
  setUserDefaultBoard,
  repairBoardIds,
  recoverCorruptedBoards,
  getUserUIPreferences,
  setUserUIPreferences,
} from './firestore';
import { saveBoards, loadBoards, clearBoards, enqueueSyncOperation, getPendingCount } from '@/lib/db';
import type { Board } from '@/types';

// Track active subscriptions to prevent memory leaks
const activeSubscriptions = new Map<string, () => void>();

// Flag to prevent syncing TO Firebase when changes come FROM Firebase
let isSyncingFromFirebase = false;

/**
 * Initialize Firebase sync for a user
 * Load all user boards from Firebase and set up real-time listeners
 */
export async function initializeFirebaseSync(user: User) {
  try {
    const store = useKanbanStore.getState();
    console.log('[Sync] Starting Firebase sync initialization for user:', user.uid);

    // Set syncing state
    store.setSyncState('syncing');

    // Load cached boards from IndexedDB as an immediate fallback
    // This provides instant display while Firebase loads
    try {
      const cachedBoards = await loadBoards();
      if (cachedBoards.length > 0) {
        store.setBoards(cachedBoards);
        // Use the stored default or active board if it exists in cache, otherwise first board
        const preferredId = store.defaultBoardId || store.activeBoard;
        const preferredBoard = preferredId ? cachedBoards.find(b => b.id === preferredId) : null;
        store.switchBoard(preferredBoard ? preferredBoard.id : cachedBoards[0].id);
        console.log('[Sync] Loaded', cachedBoards.length, 'boards from IndexedDB cache');
      }
    } catch (error) {
      console.warn('[Sync] Failed to load boards from IndexedDB:', error);
    }

    // CRITICAL FIX: Clear localStorage boards on every login
    // This prevents boards from previous user account being migrated
    try {
      const storeData = localStorage.getItem('kanban-store');
      if (storeData) {
        const parsed = JSON.parse(storeData);
        if (parsed.state?.boards && parsed.state.boards.length > 0) {
          console.log('[Sync] ⚠️ Found', parsed.state.boards.length, 'boards in localStorage - clearing to prevent cross-user contamination');
          parsed.state.boards = [];
          localStorage.setItem('kanban-store', JSON.stringify(parsed));
        }
      }
    } catch (error) {
      console.warn('[Sync] Failed to clear localStorage boards:', error);
      // Continue anyway - non-critical
    }

    // Set flag to prevent sync loop during initialization
    isSyncingFromFirebase = true;

    // First, attempt aggressive recovery if boards were corrupted with 'default-board' ID
    try {
      const recoveredBoards = await recoverCorruptedBoards(user.uid);
      if (recoveredBoards.length > 0) {
        console.log('[Sync] ✅ Recovered', recoveredBoards.length, 'corrupted board(s)');
        // Give Firestore a moment to process the recovery
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error: any) {
      // Permission denied during recovery is normal on first login - user doc might not exist yet
      if (error?.code === 'permission-denied') {
        console.log('[Sync] Skipping recovery (permission denied - normal on first login)');
      } else {
        console.warn('[Sync] Aggressive recovery skipped or failed:', error);
      }
    }

    // Then, repair any remaining corrupted board IDs
    try {
      const repairedBoards = await repairBoardIds(user.uid);
      if (repairedBoards.length > 0) {
        console.log('[Sync] Repaired boards:', repairedBoards);
      }
    } catch (error: any) {
      // Permission denied during repair is normal on first login
      if (error?.code === 'permission-denied') {
        console.log('[Sync] Skipping repair (permission denied - normal on first login)');
      } else {
        console.warn('[Sync] Board repair skipped or failed:', error);
      }
    }

    // Load all boards for the user from Firebase
    const userBoards = await getUserBoards(user.uid);

    if (userBoards.length > 0) {
      // User has boards in Firebase - use those
      store.setBoards(userBoards);

      // Update IndexedDB cache with fresh Firebase data
      saveBoards(userBoards).catch(err =>
        console.warn('[Sync] Failed to cache boards to IndexedDB:', err)
      );

      // Check if there's a board query parameter that should override default selection
      // This handles navigation from recovery tools and deep links
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const queryBoardId = urlParams?.get('board');
      const queryBoard = queryBoardId ? userBoards.find(b => b.id === queryBoardId) : null;

      if (queryBoard && queryBoardId) {
        // Query parameter takes priority - user is navigating to a specific board
        console.log('[Sync] Using board from query parameter:', queryBoardId);
        store.switchBoard(queryBoardId);
      } else {
        // No query param, use default board preference
        const defaultBoardId = await getUserDefaultBoard(user.uid);
        const defaultBoard = userBoards.find(b => b.id === defaultBoardId);

        if (defaultBoardId && defaultBoard) {
          store.setDefaultBoard(defaultBoardId);
          store.switchBoard(defaultBoardId);
        } else if (defaultBoardId && !defaultBoard) {
          console.warn(`[Sync] Default board ID "${defaultBoardId}" not found, clearing preference`);
          await setUserDefaultBoard(user.uid, null);
          store.setDefaultBoard(null);
          store.switchBoard(userBoards[0].id);
        } else {
          store.switchBoard(userBoards[0].id);
        }
      }

      // Load UI preferences
      const uiPreferences = await getUserUIPreferences(user.uid);
      if (uiPreferences.dueDatePanelOpen !== undefined) {
        store.setDueDatePanelOpen(uiPreferences.dueDatePanelOpen);
      }
      if (uiPreferences.zoomLevel !== undefined) {
        store.setZoomLevel(uiPreferences.zoomLevel);
      }
      if (uiPreferences.darkMode !== undefined) {
        if (uiPreferences.darkMode !== store.darkMode) {
          store.toggleDarkMode();
        }
      }

      // Disable demo mode if enabled - but DON'T use toggleDemoMode() because that would
      // restore the old _userBoardsBackup and overwrite the boards we just loaded from Firebase
      if (useKanbanStore.getState().demoMode) {
        useKanbanStore.setState({
          demoMode: false,
          _userBoardsBackup: undefined // Clear the backup since we have fresh Firebase boards
        });
      }

      // Clear old localStorage boards and activeBoard since we've successfully loaded from Firebase
      // This prevents the migration dialog from appearing unnecessarily
      // and ensures the correct default board loads on next page refresh
      try {
        const storeData = localStorage.getItem('kanban-store');
        if (storeData) {
          const parsed = JSON.parse(storeData);
          parsed.state = {
            ...parsed.state,
            boards: [], // Clear local boards - we're now synced with Firebase
            activeBoard: store.activeBoard, // Preserve the board we just switched to from Firebase
          };
          localStorage.setItem('kanban-store', JSON.stringify(parsed));
        }
      } catch (error) {
        console.warn('[Sync] Failed to clear localStorage:', error);
      }

      // Mark as saved since we just loaded from Firebase (no unsaved changes)
      store.markAsSaved();
    } else {
      // No boards in Firebase yet - start fresh
      console.log('[Sync] User has no boards in Firebase yet. Starting with empty state.');
      store.setBoards([]);

      // Disable demo mode if enabled - but DON'T use toggleDemoMode() because that would
      // restore the old _userBoardsBackup and overwrite the boards we just loaded from Firebase
      if (useKanbanStore.getState().demoMode) {
        useKanbanStore.setState({
          demoMode: false,
          _userBoardsBackup: undefined // Clear the backup since we have fresh Firebase boards
        });
      }

      // Mark as saved
      store.markAsSaved();
    }

    // Real-time listeners disabled to prevent sync loop
    // Boards are loaded on login and auto-saved on changes
    // This prevents Firebase updates from syncing back to Firebase

    // Reset flag after initialization completes
    isSyncingFromFirebase = false;

    // Mark sync as complete
    store.setSyncState('synced');
    store.setLastSyncTime(new Date().toISOString());
  } catch (error: any) {
    console.error('[Sync] Failed to initialize Firebase sync:', error);
    // Log the specific error code if it's a Firebase error
    if (error?.code) {
      console.error('[Sync] Firebase error code:', error.code);
      console.error('[Sync] Firebase error message:', error.message);
    }
    isSyncingFromFirebase = false;

    // Mark sync as failed
    const store = useKanbanStore.getState();
    store.setSyncState('error');

    // Don't re-throw - let app continue without sync
  }
}

/**
 * Clean up Firebase subscriptions when user logs out
 */
export function cleanupFirebaseSync() {
  activeSubscriptions.forEach((unsubscribe) => {
    unsubscribe();
  });
  activeSubscriptions.clear();

  // DEFENSIVE FIX: Clear boards from store on logout
  const store = useKanbanStore.getState();
  store.setBoards([]);

  // Clear IndexedDB to prevent cross-account data leakage
  clearBoards().catch(err => console.error('[Sync] Failed to clear IndexedDB:', err));

  // Reset UI preferences to defaults when user logs out
  // This ensures the landing page always shows with dueDatePanelOpen: false (landing page default)
  store.setDueDatePanelOpen(false);

  console.log('[Sync] Cleanup complete - all subscriptions cancelled, boards cleared');
}

/**
 * Wrap a store action to sync with Firebase
 */
export function withFirebaseSync<T extends any[], R>(
  user: User | null,
  action: (...args: T) => R
): (...args: T) => Promise<R> {
  return async (...args: T) => {
    const result = action(...args);

    // Only sync if user is authenticated
    if (user) {
      try {
        await syncActionToFirebase(user.uid);
      } catch (error) {
        console.error('Failed to sync action to Firebase:', error);
      }
    }

    return result;
  };
}

/**
 * Sync the current store state to Firebase
 * This is called after mutations to ensure Firebase is up to date
 */
async function syncActionToFirebase(userId: string) {
  const store = useKanbanStore.getState();
  const activeBoard = store.boards.find((b) => b.id === store.activeBoard);

  if (activeBoard) {
    try {
      await updateBoard(activeBoard.id, activeBoard);
    } catch (error) {
      console.error('Failed to sync board to Firebase:', error);
    }
  }
}

/**
 * Subscribe to store changes and sync with Firebase
 * Returns an unsubscribe function
 */
export function subscribeToStoreChanges(user: User) {
  let syncTimeout: NodeJS.Timeout;
  let lastBoardsMap = new Map<string, string>();
  let lastDefaultBoardId: string | null = null;

  return useKanbanStore.subscribe(
    (state) => {
      // CRITICAL: Skip sync if in demo mode UNLESS user is admin
      // Admin can edit and persist demo board changes; others just test ephemeral state
      if (state.demoMode && !isAdmin(user)) {
        return;
      }

      // Skip sync if changes are coming FROM Firebase (not user actions)
      if (isSyncingFromFirebase) {
        // Still update our tracking map to stay in sync
        state.boards.forEach((board) => {
          lastBoardsMap.set(board.id, JSON.stringify(board));
        });
        lastDefaultBoardId = state.defaultBoardId;
        return;
      }

      // Track which boards have changed by comparing individual board JSON
      const changedBoards: Board[] = [];

      state.boards.forEach((board) => {
        const currentBoardJson = JSON.stringify(board);
        const lastBoardJson = lastBoardsMap.get(board.id);

        if (currentBoardJson !== lastBoardJson) {
          lastBoardsMap.set(board.id, currentBoardJson);
          changedBoards.push(board);
        }
      });

      // Check if default board changed
      const defaultBoardChanged = state.defaultBoardId !== lastDefaultBoardId;
      if (defaultBoardChanged) {
        lastDefaultBoardId = state.defaultBoardId;
      }

      // Only sync if there are actual changes
      if (changedBoards.length > 0 || defaultBoardChanged) {
        // Persist all boards to IndexedDB immediately (no debounce)
        if (changedBoards.length > 0) {
          saveBoards(state.boards).catch(err =>
            console.error('[Sync] Failed to persist boards to IndexedDB:', err)
          );
        }

        // Debounce the sync to avoid too many Firebase calls
        clearTimeout(syncTimeout);
        syncTimeout = setTimeout(async () => {
          // If offline, enqueue all changed boards and skip Firebase
          if (!navigator.onLine) {
            for (const board of changedBoards) {
              if (board.id !== 'default-board' && (board as any).ownerId) {
                await enqueueSyncOperation(board.id, board).catch(err =>
                  console.error('[Sync] Failed to enqueue operation:', err)
                );
              }
            }
            const pending = await getPendingCount().catch(() => 0);
            useKanbanStore.getState().setPendingOperations(pending);
            return;
          }

          // Only sync the boards that actually changed
          for (const board of changedBoards) {
            const boardWithOwner = board as any;

            // Handle demo board: only sync if admin user AND board has actual content
            if (board.id === 'default-board') {
              if (isAdmin(user)) {
                // SAFEGUARD: Only save demo board if it has actual cards
                // This prevents accidentally overwriting the demo board with an empty/basic board
                const totalCards = board.columns.reduce((sum, col) => sum + (col.cards?.length || 0), 0);
                if (totalCards === 0) {
                  console.log('[Sync] Skipping demo board save - no cards (likely fresh/empty board)');
                  continue;
                }
                try {
                  console.log('[Sync] Admin user editing demo board - saving to demo-configs/active');
                  await saveDemoConfig(board, user.uid);
                } catch (error) {
                  console.error('[Sync] Failed to save demo config:', error);
                }
              }
              // Non-admin users: skip demo board sync (ephemeral state)
              continue;
            }

            if (boardWithOwner.ownerId) {
              try {
                await updateBoard(board.id, board);
              } catch (error: any) {
                // Enqueue failed writes for retry
                console.warn(`[Sync] Firebase write failed for board ${board.id}, queueing for retry:`, error?.code || error);
                await enqueueSyncOperation(board.id, board).catch(err =>
                  console.error('[Sync] Failed to enqueue operation:', err)
                );
                const pending = await getPendingCount().catch(() => 0);
                useKanbanStore.getState().setPendingOperations(pending);
              }
            } else {
              console.warn(`Board ${board.id} has no ownerId, skipping Firebase sync`);
            }
          }

          // Sync default board preference if changed
          if (defaultBoardChanged) {
            try {
              await setUserDefaultBoard(user.uid, state.defaultBoardId);
            } catch (error) {
              console.error('Failed to sync default board preference:', error);
            }
          }
        }, 2000); // Increased to 2 seconds to reduce write frequency
      }
    }
  );
}

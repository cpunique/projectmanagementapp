import { User } from 'firebase/auth';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from './AuthContext';
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
    } catch (error) {
      console.warn('[Sync] Aggressive recovery skipped or failed:', error);
    }

    // Then, repair any remaining corrupted board IDs
    try {
      const repairedBoards = await repairBoardIds(user.uid);
      if (repairedBoards.length > 0) {
        console.log('[Sync] Repaired boards:', repairedBoards);
      }
    } catch (error) {
      console.warn('[Sync] Board repair skipped or failed:', error);
    }

    // Load all boards for the user from Firebase
    const userBoards = await getUserBoards(user.uid);

    if (userBoards.length > 0) {
      // User has boards in Firebase - use those
      store.setBoards(userBoards);

      // Load default board preference
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

      // Load UI preferences
      const uiPreferences = await getUserUIPreferences(user.uid);
      if (uiPreferences.dueDatePanelOpen !== undefined) {
        // Set to the saved preference value directly
        store.setDueDatePanelOpen(uiPreferences.dueDatePanelOpen);
      }

      // Disable demo mode if enabled
      if (store.demoMode) {
        store.toggleDemoMode();
      }

      // Mark as saved since we just loaded from Firebase (no unsaved changes)
      store.markAsSaved();
    } else {
      // No boards in Firebase yet
      // Check if we have backed up user boards from demo mode
      const currentState = store as any;
      if (currentState._userBoardsBackup && currentState._userBoardsBackup.length > 0) {
        // Restore from backup and migrate to Firebase
        const backupBoards = currentState._userBoardsBackup;
        store.setBoards(backupBoards);

        // Migrate to Firebase
        for (const board of backupBoards) {
          try {
            await createBoard(user.uid, board);
          } catch (error) {
            console.error(`Failed to migrate board ${board.name}:`, error);
          }
        }

        // Wait a moment for Firestore to propagate writes
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Reload from Firebase to get proper timestamps
        const migratedBoards = await getUserBoards(user.uid);
        if (migratedBoards.length > 0) {
          store.setBoards(migratedBoards);
          store.switchBoard(migratedBoards[0].id);
        } else {
          // If Firebase query still comes back empty, use the backup boards as-is
          // They have the correct ownerId set from the backup
          console.warn('Firebase query returned no boards after migration. Using backup boards directly.');
          store.setBoards(backupBoards);
          store.switchBoard(backupBoards[0].id);
        }
      } else if (store.boards.length > 0 && !store.demoMode) {
        // User has local boards but nothing in Firebase yet (not in demo mode)
        // Migrate local boards to Firebase
        for (const board of store.boards) {
          await createBoard(user.uid, board);
        }

        // Update timestamps from Firebase response
        const migratedBoards = await getUserBoards(user.uid);
        store.setBoards(migratedBoards);
      }

      // Disable demo mode if enabled
      if (store.demoMode) {
        store.toggleDemoMode();
      }

      // Mark as saved after migration
      store.markAsSaved();
    }

    // Real-time listeners disabled to prevent sync loop
    // Boards are loaded on login and auto-saved on changes
    // This prevents Firebase updates from syncing back to Firebase

    // Reset flag after initialization completes
    isSyncingFromFirebase = false;
  } catch (error) {
    console.error('Failed to initialize Firebase sync:', error);
    isSyncingFromFirebase = false;
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

  // Reset UI preferences to defaults when user logs out
  // This ensures the landing page always shows with dueDatePanelOpen: false (landing page default)
  const store = useKanbanStore.getState();
  store.setDueDatePanelOpen(false);
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
        // Debounce the sync to avoid too many Firebase calls
        clearTimeout(syncTimeout);
        syncTimeout = setTimeout(async () => {
          // Only sync the boards that actually changed
          for (const board of changedBoards) {
            const boardWithOwner = board as any;

            // Security: skip demo board
            if (board.id === 'default-board') {
              continue;
            }

            if (boardWithOwner.ownerId) {
              try {
                await updateBoard(board.id, board);
              } catch (error: any) {
                // Handle quota exceeded errors gracefully
                if (error?.code === 'resource-exhausted') {
                  console.warn(`Firebase quota exceeded for board ${board.id}. Changes are saved locally and will sync later.`);
                } else {
                  console.error(`Failed to sync board ${board.id} to Firebase:`, error);
                }
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

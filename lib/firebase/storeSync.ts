import { User } from 'firebase/auth';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from './AuthContext';
import {
  getUserBoards,
  subscribeToBoard,
  createBoard,
  updateBoard,
  deleteBoard as deleteFirestoreBoard,
} from './firestore';
import type { Board } from '@/types';

// Track active subscriptions to prevent memory leaks
const activeSubscriptions = new Map<string, () => void>();

/**
 * Initialize Firebase sync for a user
 * Load all user boards from Firebase and set up real-time listeners
 */
export async function initializeFirebaseSync(user: User) {
  try {
    console.log('=== Starting Firebase Sync ===');
    const store = useKanbanStore.getState();
    console.log('Store state:', { demoMode: store.demoMode, boardCount: store.boards.length });

    // Load all boards for the user from Firebase
    console.log('Calling getUserBoards for userId:', user.uid);
    const userBoards = await getUserBoards(user.uid);
    console.log('Got userBoards:', userBoards.length);

    if (userBoards.length > 0) {
      // User has boards in Firebase - use those
      store.setBoards(userBoards);
      store.switchBoard(userBoards[0].id);
      // Disable demo mode if enabled
      if (store.demoMode) {
        store.toggleDemoMode();
      }
    } else {
      // No boards in Firebase yet
      // Check if we have backed up user boards from demo mode
      const currentState = store as any;
      if (currentState._userBoardsBackup && currentState._userBoardsBackup.length > 0) {
        // Restore from backup and migrate to Firebase
        const backupBoards = currentState._userBoardsBackup;
        console.log('Found backed up boards, restoring:', backupBoards.map((b: any) => b.name));
        store.setBoards(backupBoards);

        // Migrate to Firebase
        for (const board of backupBoards) {
          try {
            console.log('Migrating board to Firebase:', board.name);
            await createBoard(user.uid, board);
          } catch (error) {
            console.error(`Failed to migrate board ${board.name}:`, error);
          }
        }

        // Wait a moment for Firestore to propagate writes
        console.log('Waiting for Firestore propagation...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Reload from Firebase to get proper timestamps
        console.log('Reloading boards from Firebase');
        const migratedBoards = await getUserBoards(user.uid);
        if (migratedBoards.length > 0) {
          console.log('Successfully loaded migrated boards from Firebase:', migratedBoards.map((b: any) => b.name));
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
    }

    // Subscribe to each board for real-time updates (only boards with ownerId)
    const finalBoards = store.boards;
    for (const board of finalBoards) {
      // Only subscribe to boards that have been migrated to Firebase (have ownerId)
      const boardWithOwner = board as any;
      if (boardWithOwner.ownerId) {
        subscribeToBoard(board.id, (updatedBoard) => {
          if (updatedBoard) {
            store.updateBoardFromFirebase(board.id, updatedBoard);
          }
        });
      }
    }
  } catch (error) {
    console.error('Failed to initialize Firebase sync:', error);
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
  let lastBoardsJson = '';

  return useKanbanStore.subscribe(
    (state) => {
      const currentBoardsJson = JSON.stringify(state.boards);

      // Only trigger if boards have actually changed
      if (currentBoardsJson !== lastBoardsJson) {
        lastBoardsJson = currentBoardsJson;

        // Debounce the sync to avoid too many Firebase calls
        clearTimeout(syncTimeout);
        syncTimeout = setTimeout(async () => {
          // Sync all boards to Firebase (only boards with ownerId)
          for (const board of state.boards) {
            const boardWithOwner = board as any;
            if (boardWithOwner.ownerId) {
              try {
                await updateBoard(board.id, board);
              } catch (error) {
                console.error(`Failed to sync board ${board.id} to Firebase:`, error);
              }
            }
          }
        }, 1000); // Wait 1 second after last change before syncing
      }
    }
  );
}

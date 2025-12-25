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
    // Load all boards for the user
    const userBoards = await getUserBoards(user.uid);

    // Update Zustand store with user's boards
    const store = useKanbanStore.getState();

    // If user has boards in Firebase, use those; otherwise, use local boards
    if (userBoards.length > 0) {
      store.setBoards(userBoards);
      store.switchBoard(userBoards[0].id);
    } else if (store.boards.length > 0) {
      // User has local boards but nothing in Firebase yet
      // This is the first sync - migrate local boards to Firebase
      for (const board of store.boards) {
        await createBoard(user.uid, board);
      }
      // Update timestamps from Firebase response
      const migratedBoards = await getUserBoards(user.uid);
      store.setBoards(migratedBoards);
    }

    // Subscribe to each board for real-time updates
    for (const board of userBoards) {
      subscribeToBoard(board.id, (updatedBoard) => {
        if (updatedBoard) {
          store.updateBoardFromFirebase(board.id, updatedBoard);
        }
      });
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
          // Sync all boards to Firebase
          for (const board of state.boards) {
            try {
              await updateBoard(board.id, board);
            } catch (error) {
              console.error(`Failed to sync board ${board.id} to Firebase:`, error);
            }
          }
        }, 1000); // Wait 1 second after last change before syncing
      }
    }
  );
}

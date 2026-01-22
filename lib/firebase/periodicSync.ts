import { User } from 'firebase/auth';
import { useKanbanStore } from '@/lib/store';
import { getUserBoards, getBoard } from './firestore';
import { getDocs, query, where, collection, getFirestore } from 'firebase/firestore';
import type { Board } from '@/types';

/**
 * Periodic sync manager for collaborative boards
 * Syncs shared boards every 10-30 seconds to check for updates from other users
 */

// Track the sync interval
let syncInterval: NodeJS.Timeout | null = null;

// Track whether we're currently syncing to prevent overlaps
let isSyncing = false;

// Track last sync time to avoid redundant syncs
let lastSyncTime = 0;
const MIN_SYNC_INTERVAL = 10000; // 10 seconds minimum between syncs

/**
 * Fetch all boards for a user (owned + shared)
 * Workaround for Firestore query limitation on nested array fields
 */
async function fetchAllUserBoards(userId: string): Promise<Board[]> {
  try {
    // Get owned boards
    const ownedBoards = await getUserBoards(userId);

    // Get all boards and filter for those where user is in sharedWith
    // Note: This is not ideal at scale but works for MVP until we denormalize the data
    const db = getFirestore();
    const allBoardsQuery = query(collection(db, 'boards'));
    const allBoardsSnapshot = await getDocs(allBoardsQuery);

    const boardMap = new Map<string, Board>();

    // Add owned boards
    ownedBoards.forEach(board => {
      boardMap.set(board.id, board);
    });

    // Add shared boards where user is a collaborator
    allBoardsSnapshot.docs.forEach(doc => {
      const data = doc.data() as any;
      const isSharedWithUser = data.sharedWith?.some((collab: any) => collab.userId === userId);

      if (isSharedWithUser && !boardMap.has(doc.id)) {
        boardMap.set(doc.id, {
          ...data,
          id: doc.id,
        } as Board);
      }
    });

    return Array.from(boardMap.values());
  } catch (error) {
    console.error('[PeriodicSync] Failed to fetch all boards:', error);
    // Fall back to owned boards only
    return getUserBoards(userId);
  }
}

/**
 * Start periodic sync for shared boards
 * Syncs user's boards every 10-30 seconds
 */
export function startPeriodicSync(user: User, syncIntervalMs: number = 15000) {
  if (syncInterval) {
    console.log('[PeriodicSync] Sync already running');
    return;
  }

  console.log('[PeriodicSync] Starting periodic sync with interval:', syncIntervalMs, 'ms');

  syncInterval = setInterval(async () => {
    const now = Date.now();

    // Skip if we synced recently
    if (now - lastSyncTime < MIN_SYNC_INTERVAL) {
      return;
    }

    // Skip if already syncing
    if (isSyncing) {
      console.log('[PeriodicSync] Sync already in progress, skipping this cycle');
      return;
    }

    try {
      isSyncing = true;
      lastSyncTime = now;

      await performPeriodicSync(user);
    } catch (error) {
      console.error('[PeriodicSync] Error during sync:', error);
    } finally {
      isSyncing = false;
    }
  }, syncIntervalMs);
}

/**
 * Stop periodic sync
 */
export function stopPeriodicSync() {
  if (syncInterval) {
    console.log('[PeriodicSync] Stopping periodic sync');
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

/**
 * Perform a single sync cycle
 * Fetches latest boards from Firebase and updates store
 */
async function performPeriodicSync(user: User) {
  const store = useKanbanStore.getState();
  const currentBoards = store.boards;

  try {
    // Fetch both owned and shared boards from Firebase
    const remoteBoards = await fetchAllUserBoards(user.uid);

    if (!remoteBoards || remoteBoards.length === 0) {
      return;
    }

    // Check for updates in each board
    let hasUpdates = false;

    for (const remoteBoard of remoteBoards) {
      const localBoard = currentBoards.find(b => b.id === remoteBoard.id);

      if (!localBoard) {
        // New board was added on another device
        console.log('[PeriodicSync] New board detected:', remoteBoard.id);
        hasUpdates = true;
      } else if (new Date(remoteBoard.updatedAt).getTime() > new Date(localBoard.updatedAt).getTime()) {
        // Remote board is newer - update it
        console.log('[PeriodicSync] Board updated on remote:', remoteBoard.id);
        hasUpdates = true;
      }
    }

    // Check for deleted boards
    for (const localBoard of currentBoards) {
      // CRITICAL: Skip demo board - it's not in Firebase, but that doesn't mean it's deleted
      if (localBoard.id === 'default-board') {
        continue;
      }

      const stillExists = remoteBoards.find(b => b.id === localBoard.id);
      if (!stillExists) {
        console.log('[PeriodicSync] Board deleted on remote:', localBoard.id);
        hasUpdates = true;
      }
    }

    // If there are updates, refresh all boards from Firebase
    if (hasUpdates) {
      // CRITICAL: Don't sync boards while in demo mode - demo board should stay visible
      if (store.demoMode) {
        console.log('[PeriodicSync] Updates detected but skipping sync - in demo mode');
        return;
      }

      console.log('[PeriodicSync] Updates detected, refreshing boards from Firebase');
      store.setBoards(remoteBoards);

      // If active board was deleted, switch to first available board
      const activeBoardStillExists = remoteBoards.find(b => b.id === store.activeBoard);
      if (!activeBoardStillExists && remoteBoards.length > 0) {
        store.switchBoard(remoteBoards[0].id);
      }
    }
  } catch (error) {
    console.error('[PeriodicSync] Failed to fetch boards:', error);
  }
}

/**
 * Manually trigger a sync (useful for testing or forced refresh)
 */
export async function triggerSync(user: User) {
  if (isSyncing) {
    console.log('[PeriodicSync] Sync already in progress');
    return;
  }

  try {
    isSyncing = true;
    lastSyncTime = Date.now();
    await performPeriodicSync(user);
  } catch (error) {
    console.error('[PeriodicSync] Error during manual sync:', error);
  } finally {
    isSyncing = false;
  }
}

/**
 * Get current sync status
 */
export function getSyncStatus(): {
  isActive: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
} {
  return {
    isActive: syncInterval !== null,
    isSyncing,
    lastSyncTime: lastSyncTime > 0 ? new Date(lastSyncTime) : null,
  };
}

import { User } from 'firebase/auth';
import { useKanbanStore } from '@/lib/store';
import { isAdmin } from '@/lib/admin/isAdmin';
import { getUserBoards, getBoard } from './firestore';
import { getDocs, query, where, collection, getFirestore } from 'firebase/firestore';
import type { Board, Card, CardComment } from '@/types';

/**
 * Merge comments from local and remote cards
 * Uses comment ID to deduplicate, keeping the most recent version
 */
function mergeComments(localComments: CardComment[] = [], remoteComments: CardComment[] = []): CardComment[] {
  const commentMap = new Map<string, CardComment>();

  // Add local comments first (preserve unsaved local comments)
  for (const comment of localComments) {
    commentMap.set(comment.id, comment);
  }

  // Add remote comments (new ones from other users)
  for (const comment of remoteComments) {
    const existing = commentMap.get(comment.id);
    if (!existing) {
      // New remote comment not in local - add it
      commentMap.set(comment.id, comment);
    } else {
      // Comment exists in both - keep the one with more recent update
      const localTime = new Date(existing.updatedAt || existing.createdAt).getTime();
      const remoteTime = new Date(comment.updatedAt || comment.createdAt).getTime();
      if (remoteTime > localTime) {
        commentMap.set(comment.id, comment);
      }
    }
  }

  // Sort by createdAt
  return Array.from(commentMap.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

/**
 * Merge remote board into local board, preserving local comments
 */
function mergeRemoteIntoLocal(localBoard: Board, remoteBoard: Board): Board {
  // Create a map of local cards by ID for quick lookup
  const localCardMap = new Map<string, Card>();
  for (const column of localBoard.columns) {
    for (const card of column.cards) {
      localCardMap.set(card.id, card);
    }
  }

  // Merge: use remote structure but preserve/merge local comments
  const mergedColumns = remoteBoard.columns.map(remoteColumn => ({
    ...remoteColumn,
    cards: remoteColumn.cards.map(remoteCard => {
      const localCard = localCardMap.get(remoteCard.id);
      if (localCard && localCard.comments && localCard.comments.length > 0) {
        // Merge comments from both versions
        return {
          ...remoteCard,
          comments: mergeComments(localCard.comments, remoteCard.comments),
        };
      }
      return remoteCard;
    }),
  }));

  return {
    ...remoteBoard,
    columns: mergedColumns,
  };
}

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
 * Uses getUserBoards which properly queries with role-based permissions
 */
async function fetchAllUserBoards(userId: string): Promise<Board[]> {
  try {
    // getUserBoards already fetches both owned and shared boards using sharedWithUserIds
    return await getUserBoards(userId);
  } catch (error) {
    console.error('[PeriodicSync] Failed to fetch boards:', error);
    return [];
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

  // Skip sync if there are unsaved local changes - let auto-sync push them first
  if (store.hasUnsavedChanges) {
    console.log('[PeriodicSync] Skipping - has unsaved local changes');
    return;
  }

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
      // CRITICAL: Skip demo board - it's not in Firebase (except for admin), but that doesn't mean it's deleted
      if (localBoard.id === 'default-board') {
        continue;
      }

      const stillExists = remoteBoards.find(b => b.id === localBoard.id);
      if (!stillExists) {
        console.log('[PeriodicSync] Board deleted on remote:', localBoard.id);
        hasUpdates = true;
      }
    }

    // If there are updates, refresh boards from Firebase with comment merging
    if (hasUpdates) {
      // CRITICAL: Don't sync boards while in demo mode - demo board should stay visible
      if (store.demoMode) {
        console.log('[PeriodicSync] Updates detected but skipping sync - in demo mode');
        return;
      }

      console.log('[PeriodicSync] Updates detected, merging boards from Firebase');

      // Merge remote boards with local, preserving local comments
      const mergedBoards = remoteBoards.map(remoteBoard => {
        const localBoard = currentBoards.find(b => b.id === remoteBoard.id);
        if (localBoard) {
          // Merge to preserve any unsaved local comments
          return mergeRemoteIntoLocal(localBoard, remoteBoard);
        }
        return remoteBoard;
      });

      store.setBoards(mergedBoards);

      // If active board was deleted, switch to first available board
      const activeBoardStillExists = mergedBoards.find(b => b.id === store.activeBoard);
      if (!activeBoardStillExists && mergedBoards.length > 0) {
        store.switchBoard(mergedBoards[0].id);
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

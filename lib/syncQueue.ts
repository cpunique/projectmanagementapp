import {
  getPendingOperations,
  markOperationInProgress,
  markOperationFailed,
  removeOperation,
  getPendingCount,
  db,
} from '@/lib/db';
import { updateBoard, getBoardUpdatedAt, getBoard } from '@/lib/firebase/firestore';
import { useKanbanStore } from '@/lib/store';
import { getBoardRemoteVersion, setBoardRemoteVersion } from '@/lib/firebase/storeSync';
import { reinitializeDb } from '@/lib/firebase/config';

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000; // 2s, 4s, 8s, 16s, 32s

let isProcessing = false;
let processInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Process all pending sync operations in the queue.
 * Retries with exponential backoff on failure.
 */
export async function processQueue(): Promise<void> {
  if (isProcessing) return;

  const store = useKanbanStore.getState();
  if (!store.isOnline) return;

  isProcessing = true;
  const operations = await getPendingOperations();

  if (operations.length === 0) {
    isProcessing = false;
    return;
  }

  store.setSyncState('syncing');
  store.setSyncProgress({ completed: 0, total: operations.length });
  let completed = 0;

  for (const op of operations) {
    // Stop if we went offline mid-processing
    if (!useKanbanStore.getState().isOnline) break;

    if (op.retryCount >= MAX_RETRIES) {
      console.error('[SyncQueue] Max retries exceeded for board:', op.boardId);
      continue;
    }

    try {
      await markOperationInProgress(op.id!);

      // Conflict detection: check if remote changed while we were offline
      const lastKnown = getBoardRemoteVersion(op.boardId);
      if (lastKnown) {
        const remoteUpdatedAt = await getBoardUpdatedAt(op.boardId);
        if (remoteUpdatedAt && new Date(remoteUpdatedAt).getTime() > new Date(lastKnown).getTime()) {
          console.warn(`[SyncQueue] Conflict detected for board ${op.boardId}`);
          const remoteBoard = await getBoard(op.boardId);
          if (remoteBoard) {
            store.setConflictState({
              boardId: op.boardId,
              localBoard: op.boardData,
              remoteBoard,
            });
            // Leave in queue — user must resolve conflict first
            await db.syncQueue.update(op.id!, { status: 'pending' });
            continue;
          }
        }
      }

      await updateBoard(op.boardId, op.boardData);
      setBoardRemoteVersion(op.boardId, new Date().toISOString());
      await removeOperation(op.id!);
      completed++;

      const remaining = await getPendingCount();
      store.setPendingOperations(remaining);
      store.setSyncProgress({ completed, total: operations.length });
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      // Firestore SDK v12 bug: reinitialize so the next retry uses a fresh instance
      if (errorMsg.includes('INTERNAL ASSERTION FAILED')) {
        console.warn('[SyncQueue] Firestore SDK assertion failure — reinitializing for next retry');
        await reinitializeDb().catch(() => {});
      }
      await markOperationFailed(op.id!, errorMsg);

      // On quota error, back off before continuing
      if (error?.code === 'resource-exhausted') {
        const delay = BASE_DELAY_MS * Math.pow(2, op.retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  const remaining = await getPendingCount();
  store.setPendingOperations(remaining);
  store.setSyncProgress(undefined);

  if (remaining === 0) {
    store.setSyncState('synced');
    store.markAsSaved();
  } else {
    store.setSyncState('error');
  }

  isProcessing = false;
}

/**
 * Start automatic queue processing every 10 seconds.
 */
export function startQueueProcessor(): void {
  if (processInterval) return;
  processInterval = setInterval(processQueue, 10000);
}

/**
 * Stop automatic queue processing.
 */
export function stopQueueProcessor(): void {
  if (processInterval) {
    clearInterval(processInterval);
    processInterval = null;
  }
}

/**
 * Manual retry: reset failed operations to pending and trigger processing.
 */
export async function retrySyncQueue(): Promise<void> {
  const store = useKanbanStore.getState();
  const ops = await getPendingOperations();

  // Reconcile store count with actual queue
  const actualCount = ops.length;
  store.setPendingOperations(actualCount);

  if (actualCount === 0) {
    // No real queued operations — clear the error state
    store.setSyncState('synced');
    return;
  }

  for (const op of ops) {
    if (op.status === 'failed') {
      await db.syncQueue.update(op.id!, { status: 'pending', retryCount: 0 });
    }
  }
  await processQueue();
}

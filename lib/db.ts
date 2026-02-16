import Dexie, { type Table } from 'dexie';
import type { Board } from '@/types';

// Sync queue operation stored in IndexedDB
export interface SyncOperation {
  id?: number;
  boardId: string;
  boardData: Board;
  timestamp: number;
  status: 'pending' | 'in-progress' | 'failed';
  retryCount: number;
  lastError?: string;
}

class KanbanDB extends Dexie {
  boards!: Table<Board, string>;
  syncQueue!: Table<SyncOperation, number>;

  constructor() {
    super('kanban-db');
    this.version(1).stores({
      boards: 'id',
      syncQueue: '++id, boardId, status, timestamp',
    });
  }
}

export const db = new KanbanDB();

// --- Board Persistence ---

export async function saveBoards(boards: Board[]): Promise<void> {
  await db.boards.bulkPut(boards);
}

export async function loadBoards(): Promise<Board[]> {
  return await db.boards.toArray();
}

export async function clearBoards(): Promise<void> {
  await db.boards.clear();
}

export async function saveBoard(board: Board): Promise<void> {
  await db.boards.put(board);
}

// --- Sync Queue ---

export async function enqueueSyncOperation(boardId: string, boardData: Board): Promise<void> {
  // Upsert: replace existing pending op for this board with newer snapshot
  const existing = await db.syncQueue
    .where({ boardId, status: 'pending' })
    .first();

  if (existing) {
    await db.syncQueue.update(existing.id!, {
      boardData,
      timestamp: Date.now(),
      retryCount: 0,
      lastError: undefined,
    });
  } else {
    await db.syncQueue.add({
      boardId,
      boardData,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
    });
  }
}

export async function getPendingOperations(): Promise<SyncOperation[]> {
  return await db.syncQueue
    .where('status')
    .anyOf(['pending', 'failed'])
    .sortBy('timestamp');
}

export async function markOperationInProgress(id: number): Promise<void> {
  await db.syncQueue.update(id, { status: 'in-progress' });
}

export async function markOperationFailed(id: number, error: string): Promise<void> {
  const op = await db.syncQueue.get(id);
  if (op) {
    await db.syncQueue.update(id, {
      status: 'failed',
      retryCount: op.retryCount + 1,
      lastError: error,
    });
  }
}

export async function removeOperation(id: number): Promise<void> {
  await db.syncQueue.delete(id);
}

export async function getPendingCount(): Promise<number> {
  return await db.syncQueue
    .where('status')
    .anyOf(['pending', 'failed'])
    .count();
}

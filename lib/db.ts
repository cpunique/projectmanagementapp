import Dexie, { type Table } from 'dexie';
import type { Board } from '@/types';

// Sync queue operation stored in IndexedDB
export interface SyncOperation {
  id?: number;
  boardId: string;
  userId: string;
  boardData: Board;
  timestamp: number;
  status: 'pending' | 'in-progress' | 'failed';
  retryCount: number;
  lastError?: string;
}

interface Preference {
  key: string;
  value: string;
}

class KanbanDB extends Dexie {
  boards!: Table<Board, string>;
  syncQueue!: Table<SyncOperation, number>;
  preferences!: Table<Preference, string>;

  constructor() {
    super('kanban-db');
    // v3: adds userId to syncQueue so ops are user-scoped, preventing cross-session leakage.
    // Upgrade clears old ops (they have no userId and can't be attributed to any user).
    this.version(3).stores({
      boards: 'id',
      syncQueue: '++id, boardId, userId, status, timestamp',
      preferences: 'key',
    }).upgrade((tx) => {
      return tx.table('syncQueue').clear();
    });
    this.version(2).stores({
      boards: 'id',
      syncQueue: '++id, boardId, status, timestamp',
      preferences: 'key',
    }).upgrade(() => {
      // No data migration needed — new table
    });
    // Keep v1 schema for Dexie upgrade path
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

// --- Preferences ---

export async function savePreference(key: string, value: string): Promise<void> {
  await db.preferences.put({ key, value });
}

export async function loadPreference(key: string): Promise<string | null> {
  const pref = await db.preferences.get(key);
  return pref?.value ?? null;
}

export async function clearPreferences(): Promise<void> {
  await db.preferences.clear();
}

// --- Sync Queue ---

export async function enqueueSyncOperation(boardId: string, boardData: Board, userId: string): Promise<void> {
  // Upsert: replace existing pending op for this board+user with newer snapshot
  const existing = await db.syncQueue
    .where('userId').equals(userId)
    .filter((op) => op.boardId === boardId && op.status === 'pending')
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
      userId,
      boardData,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
    });
  }
}

export async function getPendingOperations(userId: string): Promise<SyncOperation[]> {
  const ops = await db.syncQueue
    .where('userId').equals(userId)
    .toArray();
  return ops
    .filter((op) => op.status === 'pending' || op.status === 'failed')
    .sort((a, b) => a.timestamp - b.timestamp);
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

export async function getPendingCount(userId: string): Promise<number> {
  const ops = await db.syncQueue
    .where('userId').equals(userId)
    .toArray();
  return ops.filter((op) => op.status === 'pending' || op.status === 'failed').length;
}

export async function clearUserSyncQueue(userId: string): Promise<void> {
  await db.syncQueue.where('userId').equals(userId).delete();
}

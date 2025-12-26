import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getDb } from './config';
import type { Board } from '@/types';

// Lazy get boards collection
const getBoardsCollection = () => collection(getDb(), 'boards');

/**
 * Create a new board in Firestore
 */
export async function createBoard(
  userId: string,
  board: Omit<Board, 'createdAt' | 'updatedAt'>
) {
  const boardRef = doc(getBoardsCollection(), board.id);

  // Ensure we only send valid Board data - explicitly construct to avoid extra fields
  const boardData = {
    id: board.id,
    name: board.name,
    columns: board.columns,
    ownerId: userId,
    sharedWith: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    console.log('Creating board:', board.name, 'with ID:', board.id);
    await setDoc(boardRef, boardData);
    console.log('Successfully created board:', board.name);
  } catch (error) {
    console.error('Error creating board:', {
      boardId: board.id,
      boardName: board.name,
      error: error instanceof Error ? error.message : String(error),
      boardData,
    });
    throw error;
  }
}

/**
 * Get a single board by ID
 */
export async function getBoard(boardId: string): Promise<Board | null> {
  const boardRef = doc(getBoardsCollection(), boardId);
  const boardSnap = await getDoc(boardRef);

  if (!boardSnap.exists()) return null;

  const data = boardSnap.data();
  return {
    ...data,
    createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
    updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
  } as Board;
}

/**
 * Update a board
 */
export async function updateBoard(boardId: string, updates: Partial<Board>) {
  const boardRef = doc(getBoardsCollection(), boardId);
  await updateDoc(boardRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a board
 */
export async function deleteBoard(boardId: string) {
  const boardRef = doc(getBoardsCollection(), boardId);
  await deleteDoc(boardRef);
}

/**
 * Get all boards for a user (owned or shared with them)
 */
export async function getUserBoards(userId: string): Promise<Board[]> {
  try {
    console.log('getUserBoards: Querying for userId:', userId);
    // Query for boards owned by the user
    const ownedQuery = query(getBoardsCollection(), where('ownerId', '==', userId));
    console.log('getUserBoards: Running owned query...');
    const ownedSnapshot = await getDocs(ownedQuery);
    console.log('getUserBoards: Owned snapshot count:', ownedSnapshot.docs.length);

    // Query for boards shared with the user
    const sharedQuery = query(getBoardsCollection(), where('sharedWith', 'array-contains', userId));
    console.log('getUserBoards: Running shared query...');
    const sharedSnapshot = await getDocs(sharedQuery);
    console.log('getUserBoards: Shared snapshot count:', sharedSnapshot.docs.length);

    // Combine and deduplicate results
    const boardMap = new Map<string, Board>();

    // Helper function to safely convert timestamps
    const convertTimestamp = (ts: any): string => {
      if (!ts) return new Date().toISOString();
      if (typeof ts.toDate === 'function') {
        return ts.toDate().toISOString();
      }
      if (ts instanceof Date) {
        return ts.toISOString();
      }
      if (typeof ts === 'string') {
        return ts;
      }
      // If it's a Timestamp-like object with seconds property
      if (ts.seconds !== undefined) {
        return new Date(ts.seconds * 1000).toISOString();
      }
      console.warn('Unable to convert timestamp:', ts);
      return new Date().toISOString();
    };

    ownedSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      boardMap.set(doc.id, {
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      } as Board);
    });

    sharedSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      boardMap.set(doc.id, {
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      } as Board);
    });

    return Array.from(boardMap.values());
  } catch (error) {
    console.error('getUserBoards error:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Subscribe to real-time updates for a single board
 * Returns unsubscribe function
 */
export function subscribeToBoard(
  boardId: string,
  callback: (board: Board | null) => void
): () => void {
  const boardRef = doc(getBoardsCollection(), boardId);

  // Helper function to safely convert timestamps
  const convertTimestamp = (ts: any): string => {
    if (!ts) return new Date().toISOString();
    if (typeof ts.toDate === 'function') {
      return ts.toDate().toISOString();
    }
    if (ts instanceof Date) {
      return ts.toISOString();
    }
    if (typeof ts === 'string') {
      return ts;
    }
    if (ts.seconds !== undefined) {
      return new Date(ts.seconds * 1000).toISOString();
    }
    return new Date().toISOString();
  };

  return onSnapshot(boardRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    const data = snapshot.data();
    callback({
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as Board);
  });
}

/**
 * Subscribe to real-time updates for user's boards
 * Returns unsubscribe function
 */
export function subscribeToUserBoards(
  userId: string,
  callback: (boards: Board[]) => void
): () => void {
  // For now, we'll subscribe to owned boards only
  // A more advanced implementation could listen to both owned and shared
  const q = query(getBoardsCollection(), where('ownerId', '==', userId));

  // Helper function to safely convert timestamps
  const convertTimestamp = (ts: any): string => {
    if (!ts) return new Date().toISOString();
    if (typeof ts.toDate === 'function') {
      return ts.toDate().toISOString();
    }
    if (ts instanceof Date) {
      return ts.toISOString();
    }
    if (typeof ts === 'string') {
      return ts;
    }
    if (ts.seconds !== undefined) {
      return new Date(ts.seconds * 1000).toISOString();
    }
    return new Date().toISOString();
  };

  return onSnapshot(q, (snapshot) => {
    const boards = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      } as Board;
    });
    callback(boards);
  });
}

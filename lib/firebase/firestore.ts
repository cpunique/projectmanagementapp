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
import { db } from './config';
import type { Board } from '@/types';

// Reference to boards collection
export const boardsCollection = collection(db, 'boards');

/**
 * Create a new board in Firestore
 */
export async function createBoard(
  userId: string,
  board: Omit<Board, 'createdAt' | 'updatedAt'>
) {
  const boardRef = doc(boardsCollection, board.id);
  await setDoc(boardRef, {
    ...board,
    ownerId: userId,
    sharedWith: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get a single board by ID
 */
export async function getBoard(boardId: string): Promise<Board | null> {
  const boardRef = doc(boardsCollection, boardId);
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
  const boardRef = doc(boardsCollection, boardId);
  await updateDoc(boardRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a board
 */
export async function deleteBoard(boardId: string) {
  const boardRef = doc(boardsCollection, boardId);
  await deleteDoc(boardRef);
}

/**
 * Get all boards for a user (owned or shared with them)
 */
export async function getUserBoards(userId: string): Promise<Board[]> {
  // Query for boards owned by the user
  const ownedQuery = query(boardsCollection, where('ownerId', '==', userId));
  const ownedSnapshot = await getDocs(ownedQuery);

  // Query for boards shared with the user
  const sharedQuery = query(boardsCollection, where('sharedWith', 'array-contains', userId));
  const sharedSnapshot = await getDocs(sharedQuery);

  // Combine and deduplicate results
  const boardMap = new Map<string, Board>();

  ownedSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    boardMap.set(doc.id, {
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
    } as Board);
  });

  sharedSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    boardMap.set(doc.id, {
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
    } as Board);
  });

  return Array.from(boardMap.values());
}

/**
 * Subscribe to real-time updates for a single board
 * Returns unsubscribe function
 */
export function subscribeToBoard(
  boardId: string,
  callback: (board: Board | null) => void
): () => void {
  const boardRef = doc(boardsCollection, boardId);

  return onSnapshot(boardRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    const data = snapshot.data();
    callback({
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
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
  const q = query(boardsCollection, where('ownerId', '==', userId));

  return onSnapshot(q, (snapshot) => {
    const boards = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
      } as Board;
    });
    callback(boards);
  });
}

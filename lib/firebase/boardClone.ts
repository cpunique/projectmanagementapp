/**
 * Board cloning utility
 * Allows duplicating a board with a new name and ID
 */

import { getDb } from './config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import type { Board } from '@/types';

/**
 * Clone an existing board with a new name and ID
 * Preserves all columns, cards, and data structure
 */
export async function cloneBoard(sourceBoard: Board, newBoardName: string, userId: string): Promise<Board> {
  try {
    // Generate a new unique ID for the cloned board
    const newBoardId = nanoid();

    // Create the cloned board data (client-side representation)
    const clonedBoard: Board = {
      id: newBoardId,
      name: newBoardName,
      columns: JSON.parse(JSON.stringify(sourceBoard.columns)), // Deep copy columns
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to Firestore (with additional fields not in Board interface)
    const db = getDb();
    const boardRef = doc(db, 'boards', newBoardId);

    const boardData = {
      id: newBoardId,
      name: newBoardName,
      columns: clonedBoard.columns,
      ownerId: userId,
      sharedWith: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(boardRef, boardData);

    return clonedBoard;
  } catch (error) {
    console.error('[BoardClone] Error cloning board:', error);
    throw error;
  }
}

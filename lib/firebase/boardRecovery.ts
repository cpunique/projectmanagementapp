/**
 * Advanced board recovery diagnostics
 * This module helps investigate if lost boards can be recovered from various sources
 */

import { getDb } from './config';
import { collection, getDocs, query, where } from 'firebase/firestore';

/**
 * Get all documents in the boards collection (including soft-deleted or hidden ones)
 * Note: This queries user's own boards only due to Firestore security rules
 */
export async function getAllBoardDocuments(userId: string) {
  try {
    const db = getDb();
    const boardsRef = collection(db, 'boards');
    // Query for boards owned by this user
    const q = query(boardsRef, where('ownerId', '==', userId));
    const snapshot = await getDocs(q);

    const boards = snapshot.docs.map((doc) => ({
      docId: doc.id,
      data: doc.data(),
      timestamp: doc.metadata.hasPendingWrites ? 'pending' : 'synced',
    }));

    return boards;
  } catch (error) {
    console.error('[BoardRecovery] Error fetching all boards:', error);
    throw error;
  }
}

/**
 * Search for board by name in Firestore
 */
export async function findBoardByName(userId: string, boardName: string) {
  try {
    const db = getDb();
    const boardsRef = collection(db, 'boards');
    const q = query(boardsRef, where('ownerId', '==', userId));
    const snapshot = await getDocs(q);

    const found = snapshot.docs.filter((doc) => {
      const data = doc.data() as any;
      return data.name && data.name.toLowerCase().includes(boardName.toLowerCase());
    });

    return found.map((doc) => ({
      docId: doc.id,
      data: doc.data(),
    }));
  } catch (error) {
    console.error('[BoardRecovery] Error searching for board:', error);
    throw error;
  }
}

/**
 * Check for any boards with corrupted IDs
 */
export async function findCorruptedBoards(userId: string) {
  try {
    const db = getDb();
    const boardsRef = collection(db, 'boards');
    const q = query(boardsRef, where('ownerId', '==', userId));
    const snapshot = await getDocs(q);

    const corrupted = snapshot.docs.filter((doc) => {
      const data = doc.data() as any;
      const docId = doc.id;
      const dataId = data.id;

      // Corrupted if: document ID is 'default-board' OR data.id doesn't match doc ID
      return docId === 'default-board' || (dataId && dataId !== docId);
    });

    return corrupted;
  } catch (error) {
    console.error('[BoardRecovery] Error checking for corrupted boards:', error);
    throw error;
  }
}

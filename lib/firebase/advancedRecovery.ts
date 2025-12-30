/**
 * Advanced board recovery - searches for ALL boards in Firestore
 * This helps recover boards from previous builds that might have different ownership
 */

import { getDb } from './config';
import { collection, getDocs, query, where, QueryConstraint } from 'firebase/firestore';

/**
 * Get all board documents in the collection (owner only - respects security rules)
 * Due to Firestore security rules, this returns only your boards
 */
export async function getAllBoardDocumentsUnfiltered(userId: string) {
  try {
    const db = getDb();
    const boardsRef = collection(db, 'boards');

    // Query boards owned by current user (respecting security rules)
    const q = query(boardsRef, where('ownerId', '==', userId));
    const snapshot = await getDocs(q);

    console.log('[AdvancedRecovery] Found', snapshot.docs.length, 'board(s) owned by you');

    const boards = snapshot.docs.map((doc) => ({
      docId: doc.id,
      data: doc.data(),
    }));

    boards.forEach((board, idx) => {
      const boardData = board.data as any;
      console.log(`[AdvancedRecovery] Board ${idx + 1}:`, {
        docId: board.docId,
        name: boardData.name,
        boardId: boardData.id,
        columnCount: (boardData.columns || []).length,
      });
    });

    return boards;
  } catch (error) {
    console.error('[AdvancedRecovery] Error fetching boards:', error);
    throw error;
  }
}

/**
 * Find boards by name in your owned boards
 */
export async function findBoardByNameUnfiltered(userId: string, boardName: string) {
  try {
    const db = getDb();
    const boardsRef = collection(db, 'boards');
    const q = query(boardsRef, where('ownerId', '==', userId));
    const snapshot = await getDocs(q);

    const found = snapshot.docs.filter((doc) => {
      const data = doc.data() as any;
      return data.name && data.name.toLowerCase().includes(boardName.toLowerCase());
    });

    console.log(`[AdvancedRecovery] Found ${found.length} board(s) matching "${boardName}"`);

    return found.map((doc) => ({
      docId: doc.id,
      data: doc.data(),
    }));
  } catch (error) {
    console.error('[AdvancedRecovery] Error searching for board:', error);
    throw error;
  }
}

/**
 * Migrate a board from one owner to another
 * This allows transferring boards found in the global collection to your user account
 */
export async function migrateBoardToUser(boardDocId: string, newOwnerId: string) {
  try {
    const { updateDoc, doc } = await import('firebase/firestore');

    const db = getDb();
    const boardRef = doc(db, 'boards', boardDocId);

    console.log('[AdvancedRecovery] Migrating board', boardDocId, 'to owner', newOwnerId);

    await updateDoc(boardRef, {
      ownerId: newOwnerId,
    });

    console.log('[AdvancedRecovery] ✅ Successfully migrated board to new owner');
    return true;
  } catch (error) {
    console.error('[AdvancedRecovery] Error migrating board:', error);
    throw error;
  }
}

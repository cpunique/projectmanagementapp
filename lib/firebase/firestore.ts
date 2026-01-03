// Force rebuild - fixed AI locking and board loading
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

// Lazy get users collection
const getUsersCollection = () => collection(getDb(), 'users');

/**
 * Deep sanitization to remove undefined values recursively
 * Firebase rejects undefined values even in nested objects
 */
function deepSanitize(obj: any): any {
  if (obj === null || obj === undefined) {
    return undefined;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepSanitize(item)).filter((item) => item !== undefined);
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleaned = deepSanitize(value);
      if (cleaned !== undefined) {
        sanitized[key] = cleaned;
      }
    }
    return sanitized;
  }

  return obj;
}

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
    description: board.description || '',
    columns: board.columns,
    ownerId: userId,
    sharedWith: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(boardRef, boardData);
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
 * Update a board with exponential backoff retry for quota errors
 * Sanitizes undefined values since Firebase rejects them
 */
export async function updateBoard(
  boardId: string,
  updates: Partial<Board>,
  retryCount = 0,
  maxRetries = 3
) {
  const boardRef = doc(getBoardsCollection(), boardId);

  // Deep sanitization to remove all undefined values including nested ones
  const sanitizedUpdates = deepSanitize(updates);

  try {
    await updateDoc(boardRef, {
      ...sanitizedUpdates,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    // Handle quota exceeded errors with exponential backoff
    if (error?.code === 'resource-exhausted' && retryCount < maxRetries) {
      const delayMs = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return updateBoard(boardId, updates, retryCount + 1, maxRetries);
    }

    throw error;
  }
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
    // Query for boards owned by the user
    const ownedQuery = query(getBoardsCollection(), where('ownerId', '==', userId));
    const ownedSnapshot = await getDocs(ownedQuery);

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

    // Note: Shared boards query disabled until board sharing is fully implemented
    // The Firestore rules currently don't allow querying by sharedWith array
    // Once sharing is implemented, update the rules and uncomment below:
    /*
    try {
      const sharedQuery = query(getBoardsCollection(), where('sharedWith', 'array-contains', userId));
      console.log('getUserBoards: Running shared query...');
      const sharedSnapshot = await getDocs(sharedQuery);
      console.log('getUserBoards: Shared snapshot count:', sharedSnapshot.docs.length);

      sharedSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        boardMap.set(doc.id, {
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as Board);
      });
    } catch (sharedError) {
      console.warn('getUserBoards: Shared query not available (board sharing not implemented):',
        sharedError instanceof Error ? sharedError.message : String(sharedError));
    }
    */

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

/**
 * Get user's default board preference from Firestore
 */
export async function getUserDefaultBoard(userId: string): Promise<string | null> {
  try {
    const userRef = doc(getUsersCollection(), userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return null;

    const data = userSnap.data();
    return data.defaultBoardId || null;
  } catch (error) {
    console.error('Failed to get user default board:', error);
    return null;
  }
}

/**
 * Set user's default board preference in Firestore
 */
export async function setUserDefaultBoard(userId: string, boardId: string | null) {
  try {
    const userRef = doc(getUsersCollection(), userId);
    await setDoc(userRef, { defaultBoardId: boardId }, { merge: true });
  } catch (error) {
    console.error('Failed to set user default board:', error);
    throw error;
  }
}

/**
 * Get user's UI preferences (dueDatePanelOpen, etc.)
 */
export async function getUserUIPreferences(userId: string): Promise<{ dueDatePanelOpen?: boolean }> {
  try {
    const userRef = doc(getUsersCollection(), userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return {};

    const data = userSnap.data();
    return {
      dueDatePanelOpen: data.dueDatePanelOpen !== undefined ? data.dueDatePanelOpen : true,
    };
  } catch (error) {
    console.error('Failed to get user UI preferences:', error);
    return { dueDatePanelOpen: true };
  }
}

/**
 * Set user's UI preferences (dueDatePanelOpen, etc.)
 */
export async function setUserUIPreferences(userId: string, preferences: { dueDatePanelOpen?: boolean }) {
  try {
    const userRef = doc(getUsersCollection(), userId);
    await setDoc(userRef, { ...preferences }, { merge: true });
  } catch (error) {
    console.error('Failed to set user UI preferences:', error);
    throw error;
  }
}

/**
 * Repair corrupted board IDs in Firestore
 * This fixes boards that were saved with 'default-board' ID
 */
export async function repairBoardIds(userId: string): Promise<string[]> {
  try {
    const ownedQuery = query(getBoardsCollection(), where('ownerId', '==', userId));
    const snapshot = await getDocs(ownedQuery);

    const repairedBoardIds: string[] = [];

    for (const boardDoc of snapshot.docs) {
      const data = boardDoc.data();
      const docId = boardDoc.id;
      const dataId = data.id;

      // If the board data ID is 'default-board' or doesn't match document ID, fix it
      if (dataId === 'default-board' || dataId !== docId) {
        // Update the board data with the document ID to match
        const boardRef = doc(getBoardsCollection(), docId);
        await updateDoc(boardRef, {
          id: docId,
          updatedAt: serverTimestamp(),
        });

        repairedBoardIds.push(data.name);
      }
    }

    return repairedBoardIds;
  } catch (error) {
    console.error('[Repair] Failed to repair boards:', error);
    throw error;
  }
}

/**
 * Aggressive data recovery for corrupted Firebase boards
 * Detects when boards were saved with 'default-board' ID and recovers from localStorage
 * This is needed when all boards got written to the same Firestore document, overwriting each other
 */
export async function recoverCorruptedBoards(userId: string): Promise<string[]> {
  try {
    // Step 1: Check if the 'default-board' document exists (indicates corruption)
    // Wrapped in try-catch since this may fail due to Firestore security rules
    const defaultBoardRef = doc(getBoardsCollection(), 'default-board');
    let defaultBoardExists = false;
    try {
      const defaultBoardSnap = await getDoc(defaultBoardRef);
      defaultBoardExists = defaultBoardSnap.exists();
    } catch (permissionError: any) {
      // Firestore rules prevent reading this document - skip recovery
      if (permissionError?.code === 'permission-denied') {
        return [];
      }
      throw permissionError;
    }

    if (!defaultBoardExists) {
      return [];
    }

    // Step 2: Read all boards from localStorage (which should be intact)
    const localStorageData = localStorage.getItem('kanban-store');
    let localBoards: any[] = [];

    if (localStorageData) {
      try {
        const parsed = JSON.parse(localStorageData);
        localBoards = parsed.state?.boards || [];
      } catch (error) {
        console.error('[Recovery] Failed to parse localStorage:', error);
        return [];
      }
    }

    if (localBoards.length === 0) {
      console.warn('[Recovery] No boards in localStorage to recover');
      return [];
    }

    // Step 3: Try to delete the corrupted 'default-board' document
    // If deletion fails due to permissions, we'll skip recovery for now
    try {
      await deleteDoc(defaultBoardRef);
    } catch (deleteError: any) {
      console.warn('[Recovery] Could not delete corrupted document (permissions):', deleteError?.code, '- will skip recovery for now');
      // Don't fail the entire recovery if we can't delete - the migration will handle it
      return [];
    }

    // Step 4: Generate unique IDs and create new documents for each board
    const { nanoid } = await import('nanoid');
    const recoveredBoardIds: string[] = [];

    for (const localBoard of localBoards) {
      // Skip if it was marked as demo board
      if (localBoard.id === 'default-board') {
        continue;
      }

      try {
        // Generate a unique ID (use existing ID if not default-board, otherwise create new)
        const newBoardId = localBoard.id && localBoard.id !== 'default-board'
          ? localBoard.id
          : nanoid();

        // Prepare board data with correct structure
        const boardData = {
          id: newBoardId,
          name: localBoard.name,
          columns: localBoard.columns || [],
          ownerId: userId,
          sharedWith: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        // Create new Firestore document
        const newBoardRef = doc(getBoardsCollection(), newBoardId);
        await setDoc(newBoardRef, boardData);

        recoveredBoardIds.push(newBoardId);
      } catch (error) {
        console.error('[Recovery] Failed to recover board:', localBoard.name, error);
      }
    }

    return recoveredBoardIds;
  } catch (error) {
    console.error('[Recovery] Critical recovery error:', error);
    throw error;
  }
}

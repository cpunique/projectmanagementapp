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
  arrayUnion,
  limit,
} from 'firebase/firestore';
import { getDb } from './config';
import type { Board, BoardCollaborator } from '@/types';

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
  board: Omit<Board, 'createdAt' | 'updatedAt'>,
  userEmail?: string
) {
  const boardRef = doc(getBoardsCollection(), board.id);

  // Ensure we only send valid Board data - explicitly construct to avoid extra fields
  const boardData = {
    id: board.id,
    name: board.name,
    description: board.description || '',
    purpose: board.purpose || 'development', // Default to development for AI prompts
    columns: board.columns,
    ownerId: userId,
    ownerEmail: userEmail || '', // Store owner's email for @mentions
    sharedWith: [],
    sharedWithUserIds: [], // Denormalized for Firestore rule checks
    editorUserIds: [], // Denormalized for Firestore permission checks
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

  // If ownerEmail is missing, try to fetch it from the users collection
  let ownerEmail = data.ownerEmail;
  if (!ownerEmail && data.ownerId) {
    try {
      const userDoc = await getDoc(doc(getDb(), 'users', data.ownerId));
      if (userDoc.exists()) {
        ownerEmail = userDoc.data().email || '';
      }
    } catch (error) {
      console.warn('[getBoard] Failed to fetch owner email:', error);
    }
  }

  return {
    ...data,
    ownerEmail,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
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
 * Uses denormalized sharedWithUserIds array for efficient querying
 */
export async function getUserBoards(userId: string): Promise<Board[]> {
  try {
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

    // Combine and deduplicate results
    const boardMap = new Map<string, Board>();

    // Query for owned and shared boards in parallel for faster loading
    const ownedQuery = query(getBoardsCollection(), where('ownerId', '==', userId));
    const sharedQuery = query(getBoardsCollection(), where('sharedWithUserIds', 'array-contains', userId));

    // Execute both queries in parallel
    const [ownedSnapshot, sharedSnapshot] = await Promise.allSettled([
      getDocs(ownedQuery),
      getDocs(sharedQuery),
    ]);

    // Process owned boards
    if (ownedSnapshot.status === 'fulfilled') {
      ownedSnapshot.value.docs.forEach((doc) => {
        const data = doc.data();
        boardMap.set(doc.id, {
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as Board);
      });
    } else {
      console.error('[getUserBoards] Failed to fetch owned boards:', ownedSnapshot.reason);
    }

    // Process shared boards
    if (sharedSnapshot.status === 'fulfilled') {
      sharedSnapshot.value.docs.forEach((doc) => {
        const data = doc.data();
        // Only add if not already in map (owned boards take precedence)
        if (!boardMap.has(doc.id)) {
          boardMap.set(doc.id, {
            ...data,
            createdAt: convertTimestamp(data.createdAt),
            updatedAt: convertTimestamp(data.updatedAt),
          } as Board);
        }
      });
    } else {
      // Shared boards query may fail if Firestore rules restrict access
      console.log('[getUserBoards] Could not fetch shared boards (rules may be restricted):', sharedSnapshot.reason instanceof Error ? sharedSnapshot.reason.message : 'Unknown error');
    }

    // Fetch owner emails for boards that don't have them (for @mentions feature)
    const boards = Array.from(boardMap.values());
    const boardsNeedingOwnerEmail = boards.filter(b => !b.ownerEmail && b.ownerId);

    if (boardsNeedingOwnerEmail.length > 0) {
      // Batch fetch owner emails
      const uniqueOwnerIds = [...new Set(boardsNeedingOwnerEmail.map(b => b.ownerId))];
      const ownerEmails = new Map<string, string>();

      await Promise.all(
        uniqueOwnerIds.map(async (ownerId) => {
          try {
            const userDoc = await getDoc(doc(getDb(), 'users', ownerId));
            if (userDoc.exists()) {
              ownerEmails.set(ownerId, userDoc.data().email || '');
            }
          } catch (error) {
            console.warn('[getUserBoards] Failed to fetch owner email for', ownerId);
          }
        })
      );

      // Update boards with owner emails
      boards.forEach(board => {
        if (!board.ownerEmail && board.ownerId && ownerEmails.has(board.ownerId)) {
          board.ownerEmail = ownerEmails.get(board.ownerId);
        }
      });
    }

    return boards;
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

    if (!userSnap.exists()) {
      console.log('[getUserDefaultBoard] User document does not exist yet');
      return null;
    }

    const data = userSnap.data();
    return data.defaultBoardId || null;
  } catch (error: any) {
    // Don't crash if user doc isn't readable - just return null
    // This can happen during auth initialization or with emulator
    if (error?.code === 'permission-denied') {
      console.warn('[getUserDefaultBoard] Permission denied reading user doc (may be normal during init)', error.message);
      return null;
    }
    console.error('[getUserDefaultBoard] Failed to get user default board:', error);
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

    if (!userSnap.exists()) {
      console.log('[getUserUIPreferences] User document does not exist yet');
      return { dueDatePanelOpen: true };
    }

    const data = userSnap.data();
    return {
      dueDatePanelOpen: data.dueDatePanelOpen !== undefined ? data.dueDatePanelOpen : true,
    };
  } catch (error: any) {
    // Don't crash if user doc isn't readable - use defaults
    // This can happen during auth initialization or with emulator
    if (error?.code === 'permission-denied') {
      console.warn('[getUserUIPreferences] Permission denied reading user doc (may be normal during init)', error.message);
      return { dueDatePanelOpen: true };
    }
    console.error('[getUserUIPreferences] Failed to get user UI preferences:', error);
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
          sharedWithUserIds: [], // Denormalized for Firestore rule checks
          editorUserIds: [], // Denormalized for Firestore permission checks
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

// ============================================
// Board Collaboration Functions
// ============================================

/**
 * Look up a user by email address
 * Returns user ID and email if found, null otherwise
 */
export async function getUserByEmail(email: string): Promise<{ uid: string; email: string } | null> {
  try {
    const usersRef = getUsersCollection();
    const q = query(usersRef, where('email', '==', email), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return {
      uid: doc.id,
      email: doc.data().email,
    };
  } catch (error) {
    console.error('[UserLookup] Failed to lookup user by email:', email, error);
    return null;
  }
}

/**
 * Get all user accounts with a specific email
 * (Multiple accounts can exist with same email from different providers)
 * Used to disambiguate which account to share with when there are multiple
 */
/**
 * Share a board with another user by email
 * Firebase enforces one account per email, so we can safely look up by email alone
 * @param boardId - ID of the board to share
 * @param userEmail - Email of the user to share with
 * @param role - Permission level: 'viewer' or 'editor'
 * @param currentUserId - ID of the current user (must be board owner)
 */
export async function shareBoardWithUser(
  boardId: string,
  userEmail: string,
  role: 'viewer' | 'editor',
  currentUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the current board to verify ownership
    const board = await getBoard(boardId);
    if (!board) {
      return { success: false, error: 'Board not found' };
    }

    if (board.ownerId !== currentUserId) {
      return { success: false, error: 'Only board owner can share' };
    }

    // Look up the target user by email
    const targetUser = await getUserByEmail(userEmail);
    if (!targetUser) {
      return { success: false, error: 'User not found' };
    }
    const userId = targetUser.uid;

    // Check if user already has access
    if (board.sharedWith?.some((c) => c.userId === userId)) {
      return { success: false, error: 'User already has access to this board' };
    }

    // Create collaborator record
    const collaborator: BoardCollaborator = {
      userId,
      email: userEmail,
      role,
      addedAt: new Date().toISOString(),
      addedBy: currentUserId,
    };

    // Update board with new collaborator
    // Also update sharedWithUserIds and editorUserIds for Firestore rule access checks
    const boardRef = doc(getBoardsCollection(), boardId);

    // Calculate current editorUserIds from existing collaborators
    const currentEditors = board.sharedWith?.filter((c) => c.role === 'editor').map((c) => c.userId) || [];

    // Build the update data
    const updateData: any = {
      sharedWith: arrayUnion(collaborator),
      sharedWithUserIds: arrayUnion(userId),
      updatedAt: serverTimestamp(),
    };

    // Always set editorUserIds explicitly to ensure it exists
    // This migrates old boards and maintains role-based permissions
    if (role === 'editor') {
      // Add new editor to the list
      updateData.editorUserIds = [...new Set([...currentEditors, userId])];
    } else {
      // Viewer role - just preserve existing editors
      updateData.editorUserIds = currentEditors;
    }

    await updateDoc(boardRef, updateData);

    console.log('[Collaboration] Board shared with:', userEmail, '(uid:', userId, ') role:', role);
    return { success: true };
  } catch (error: any) {
    console.error('[Collaboration] Failed to share board:', error);
    console.error('[Collaboration] Error code:', error?.code);
    console.error('[Collaboration] Error message:', error?.message);
    return { success: false, error: error?.message || 'Failed to share board' };
  }
}

/**
 * Remove a collaborator from a board
 * @param boardId - ID of the board
 * @param userId - ID of the collaborator to remove
 * @param currentUserId - ID of the current user (must be board owner)
 */
export async function removeCollaborator(
  boardId: string,
  userId: string,
  currentUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the current board to verify ownership
    const board = await getBoard(boardId);
    if (!board) {
      return { success: false, error: 'Board not found' };
    }

    if (board.ownerId !== currentUserId) {
      return { success: false, error: 'Only board owner can remove collaborators' };
    }

    // Find and remove the collaborator
    const updatedSharedWith = board.sharedWith?.filter((c) => c.userId !== userId) || [];
    // Also update the denormalized sharedWithUserIds and editorUserIds arrays
    const updatedSharedWithUserIds = updatedSharedWith.map((c) => c.userId);
    const updatedEditorUserIds = updatedSharedWith.filter((c) => c.role === 'editor').map((c) => c.userId);

    const boardRef = doc(getBoardsCollection(), boardId);
    await updateDoc(boardRef, {
      sharedWith: updatedSharedWith,
      sharedWithUserIds: updatedSharedWithUserIds,
      editorUserIds: updatedEditorUserIds,
      updatedAt: serverTimestamp(),
    });

    console.log('[Collaboration] Collaborator removed:', userId);
    return { success: true };
  } catch (error) {
    console.error('[Collaboration] Failed to remove collaborator:', error);
    return { success: false, error: 'Failed to remove collaborator' };
  }
}

/**
 * Update a collaborator's role
 * @param boardId - ID of the board
 * @param userId - ID of the collaborator
 * @param newRole - New role: 'viewer' or 'editor'
 * @param currentUserId - ID of the current user (must be board owner)
 */
export async function updateCollaboratorRole(
  boardId: string,
  userId: string,
  newRole: 'viewer' | 'editor',
  currentUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the current board to verify ownership
    const board = await getBoard(boardId);
    if (!board) {
      return { success: false, error: 'Board not found' };
    }

    if (board.ownerId !== currentUserId) {
      return { success: false, error: 'Only board owner can update roles' };
    }

    // Find and update the collaborator
    const collaborator = board.sharedWith?.find((c) => c.userId === userId);
    if (!collaborator) {
      return { success: false, error: 'Collaborator not found' };
    }

    const updatedSharedWith = board.sharedWith?.map((c) =>
      c.userId === userId ? { ...c, role: newRole } : c
    ) || [];

    // Recalculate editorUserIds to reflect the role change
    const updatedEditorUserIds = updatedSharedWith.filter((c) => c.role === 'editor').map((c) => c.userId);

    const boardRef = doc(getBoardsCollection(), boardId);
    await updateDoc(boardRef, {
      sharedWith: updatedSharedWith,
      editorUserIds: updatedEditorUserIds,
      updatedAt: serverTimestamp(),
    });

    console.log('[Collaboration] Collaborator role updated:', userId, 'to', newRole);
    return { success: true };
  } catch (error) {
    console.error('[Collaboration] Failed to update collaborator role:', error);
    return { success: false, error: 'Failed to update role' };
  }
}

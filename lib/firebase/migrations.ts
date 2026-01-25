/**
 * Database migration utilities for adding missing fields to existing boards
 */

import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getDb } from './config';

/**
 * Add sharedWithUserIds and editorUserIds to all existing boards that don't have them
 * Run this once after deploying role-based permission rules
 */
export async function migrateCollaboratorFields(): Promise<{
  total: number;
  migrated: number;
  errors: number;
}> {
  console.log('[Migration] Starting collaborator fields migration...');

  const boardsRef = collection(getDb(), 'boards');
  const snapshot = await getDocs(boardsRef);

  let total = 0;
  let migrated = 0;
  let errors = 0;

  for (const boardDoc of snapshot.docs) {
    total++;
    const boardData = boardDoc.data();
    const boardId = boardDoc.id;

    try {
      // Check if board already has the required fields
      const hasSharedWithUserIds = 'sharedWithUserIds' in boardData;
      const hasEditorUserIds = 'editorUserIds' in boardData;

      if (hasSharedWithUserIds && hasEditorUserIds) {
        console.log(`[Migration] ✓ Board ${boardId} already migrated`);
        continue;
      }

      // Calculate the missing fields from existing sharedWith array
      const sharedWith = boardData.sharedWith || [];
      const sharedWithUserIds = sharedWith.map((c: any) => c.userId);
      const editorUserIds = sharedWith
        .filter((c: any) => c.role === 'editor')
        .map((c: any) => c.userId);

      // Update the board with the missing fields
      const boardRef = doc(getDb(), 'boards', boardId);
      const updates: any = {};

      if (!hasSharedWithUserIds) {
        updates.sharedWithUserIds = sharedWithUserIds;
      }
      if (!hasEditorUserIds) {
        updates.editorUserIds = editorUserIds;
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(boardRef, updates);
        console.log(`[Migration] ✓ Migrated board ${boardId}: ${sharedWithUserIds.length} collaborators, ${editorUserIds.length} editors`);
        migrated++;
      }
    } catch (error) {
      console.error(`[Migration] ✗ Failed to migrate board ${boardId}:`, error);
      errors++;
    }
  }

  const result = { total, migrated, errors };
  console.log('[Migration] Complete:', result);
  return result;
}

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getDb } from './config';
import { type ActivityEntry, type ActivityEventType } from '@/types';

/**
 * Log an activity to a board's activity feed subcollection.
 * Automatically reads actor info from Firebase auth.
 * Non-blocking — errors are caught and logged silently.
 */
export async function logActivity(
  boardId: string,
  entry: Omit<ActivityEntry, 'id' | 'createdAt' | 'actorId' | 'actorEmail' | 'boardId'>
): Promise<void> {
  try {
    const user = getAuth().currentUser;
    if (!user) return; // Don't log activities for unauthenticated users
    const db = getDb();
    await addDoc(collection(db, 'boards', boardId, 'activities'), {
      ...entry,
      boardId,
      actorId: user.uid,
      actorEmail: user.email || '',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('[Activities] Failed to log activity:', error);
  }
}

/**
 * Subscribe to real-time activity feed for a board.
 * Returns an unsubscribe function.
 */
export function subscribeToActivities(
  boardId: string,
  callback: (activities: ActivityEntry[]) => void,
  max: number = 50
): () => void {
  const db = getDb();
  const q = query(
    collection(db, 'boards', boardId, 'activities'),
    orderBy('createdAt', 'desc'),
    firestoreLimit(max)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const activities: ActivityEntry[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          boardId: data.boardId,
          eventType: data.eventType as ActivityEventType,
          actorId: data.actorId,
          actorEmail: data.actorEmail,
          createdAt: data.createdAt instanceof Timestamp
            ? data.createdAt.toDate().toISOString()
            : data.createdAt || new Date().toISOString(),
          cardId: data.cardId,
          cardTitle: data.cardTitle,
          columnTitle: data.columnTitle,
          fromColumnTitle: data.fromColumnTitle,
          toColumnTitle: data.toColumnTitle,
          fieldChanged: data.fieldChanged,
          commentSnippet: data.commentSnippet,
          targetEmail: data.targetEmail,
        };
      });
      callback(activities);
    },
    (error) => {
      console.error('[Activities] Subscription error:', error);
    }
  );
}

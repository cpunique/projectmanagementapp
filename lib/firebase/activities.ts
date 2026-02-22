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
import { getDb, reinitializeDb } from './config';
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

function docsToActivities(snapshot: import('firebase/firestore').QuerySnapshot): ActivityEntry[] {
  return snapshot.docs.map((doc) => {
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
      targetBoardName: data.targetBoardName,
    };
  });
}

/**
 * Subscribe to real-time activity feed for a board.
 * Returns an unsubscribe function. Defensively wraps onSnapshot to guard
 * against Firestore SDK v12 internal assertion failures (ID: b815/ca9).
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

  try {
    return onSnapshot(
      q,
      (snapshot) => { callback(docsToActivities(snapshot)); },
      (error) => { console.error('[Activities] Subscription error:', error); }
    );
  } catch (err) {
    // Firestore SDK v12 bug: AsyncQueue enters permanently failed state after
    // a watch stream race. onSnapshot() itself throws.
    // Reinitialize the Firestore instance so subsequent writes/reads use a fresh SDK.
    console.warn('[Activities] onSnapshot failed (Firestore SDK internal state) — reinitializing:', err);
    reinitializeDb().catch(() => {});
    return () => {};
  }
}

/**
 * One-time fetch of activity feed for a board (no real-time listener).
 * Use this when live updates are not required (e.g. card-level timelines).
 */
export async function fetchActivities(
  boardId: string,
  max: number = 100
): Promise<ActivityEntry[]> {
  try {
    const db = getDb();
    const q = query(
      collection(db, 'boards', boardId, 'activities'),
      orderBy('createdAt', 'desc'),
      firestoreLimit(max)
    );
    const snapshot = await getDocs(q);
    return docsToActivities(snapshot);
  } catch (err) {
    console.error('[Activities] fetchActivities failed:', err);
    return [];
  }
}

/**
 * Fetch weekly velocity: unique cards moved to the done column per week
 * for the last N weeks. Deduplicates by cardId within each week.
 */
export async function fetchCompletedByWeek(
  boardId: string,
  doneColumnTitle: string,
  weeks: number = 8
): Promise<{ weekLabel: string; count: number }[]> {
  const all = await fetchActivities(boardId, 500);
  const moves = all.filter(
    (a) => a.eventType === 'card_moved' && a.toColumnTitle === doneColumnTitle
  );

  // Build week buckets (Sunday-anchored, oldest first)
  const now = new Date();
  const buckets: { weekStart: Date; weekLabel: string; cardIds: Set<string> }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7 - d.getDay());
    d.setHours(0, 0, 0, 0);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    buckets.push({ weekStart: new Date(d), weekLabel: label, cardIds: new Set() });
  }

  for (const move of moves) {
    const d = new Date(move.createdAt);
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (d >= buckets[i].weekStart) {
        if (move.cardId) buckets[i].cardIds.add(move.cardId);
        break;
      }
    }
  }

  return buckets.map((b) => ({ weekLabel: b.weekLabel, count: b.cardIds.size }));
}

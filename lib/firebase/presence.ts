'use client';

import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { getDb } from './config';

export interface UserPresence {
  userId: string;
  boardId: string;
  email: string;
  status: 'online' | 'offline';
  lastSeen: any; // Firestore Timestamp
}

// Presence is scoped to each board: /boards/{boardId}/presence/{userId}
// This means only board members (enforced by Firestore rules) can read presence,
// preventing global user enumeration.
const getBoardPresenceCollection = (boardId: string) =>
  collection(getDb(), 'boards', boardId, 'presence');

/**
 * Update user's presence on a board
 */
export async function updatePresence(
  userId: string,
  boardId: string,
  email: string,
  status: 'online' | 'offline' = 'online'
): Promise<void> {
  try {
    const presenceRef = doc(getBoardPresenceCollection(boardId), userId);

    await setDoc(presenceRef, {
      userId,
      boardId,
      email,
      status,
      lastSeen: serverTimestamp(),
    });
  } catch (error) {
    console.error('[Presence] Failed to update presence:', error);
    // Don't throw - presence is non-critical feature
  }
}

/**
 * Set user as offline on a specific board
 */
export async function setOffline(userId: string, boardId: string): Promise<void> {
  try {
    const presenceRef = doc(getBoardPresenceCollection(boardId), userId);
    await setDoc(
      presenceRef,
      {
        status: 'offline',
        lastSeen: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('[Presence] Failed to set offline:', error);
    // Don't throw - presence is non-critical
  }
}

/**
 * Delete user's presence document for a specific board
 */
export async function removePresence(userId: string, boardId: string): Promise<void> {
  try {
    const presenceRef = doc(getBoardPresenceCollection(boardId), userId);
    await deleteDoc(presenceRef);
  } catch (error) {
    console.error('[Presence] Failed to remove presence:', error);
    // Don't throw - presence is non-critical
  }
}

/**
 * Subscribe to real-time presence updates for a specific board.
 * Only board members can read this subcollection (Firestore rules enforced).
 */
export function subscribeToPresence(
  boardId: string,
  callback: (onlineUserIds: string[]) => void
): () => void {
  try {
    const presenceQuery = query(
      getBoardPresenceCollection(boardId),
      where('status', '==', 'online')
    );

    const unsubscribe = onSnapshot(
      presenceQuery,
      (snapshot) => {
        const onlineUserIds: string[] = [];
        const now = Date.now();
        const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() as UserPresence;

          let lastSeenMs = 0;
          if (data.lastSeen) {
            if (typeof data.lastSeen.toMillis === 'function') {
              lastSeenMs = data.lastSeen.toMillis();
            } else if (data.lastSeen.seconds) {
              lastSeenMs = data.lastSeen.seconds * 1000;
            } else if (typeof data.lastSeen === 'number') {
              lastSeenMs = data.lastSeen;
            }
          }

          const ageMs = now - lastSeenMs;
          const isRecentlyActive = lastSeenMs > 0 && ageMs < STALE_THRESHOLD_MS;

          if (data.status === 'online' && isRecentlyActive) {
            onlineUserIds.push(data.userId);
          }
        });

        callback(onlineUserIds);
      },
      (error) => {
        console.warn('[Presence] Subscription error:', error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.warn('[Presence] Failed to subscribe to presence:', error);
    return () => {};
  }
}

/**
 * Set up presence heartbeat to keep user marked as online on a board
 */
export function startPresenceHeartbeat(
  userId: string,
  boardId: string,
  email: string,
  intervalMs: number = 30000
): () => void {
  updatePresence(userId, boardId, email, 'online');

  const intervalId = setInterval(() => {
    updatePresence(userId, boardId, email, 'online');
  }, intervalMs);

  return () => {
    clearInterval(intervalId);
    setOffline(userId, boardId);
  };
}

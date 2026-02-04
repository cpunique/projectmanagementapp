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

// Get presence collection reference
const getPresenceCollection = () => collection(getDb(), 'presence');

/**
 * Update user's presence on a board
 *
 * @param userId - Current user's UID
 * @param boardId - Board ID they're viewing
 * @param email - User's email for display
 * @param status - 'online' or 'offline'
 */
export async function updatePresence(
  userId: string,
  boardId: string,
  email: string,
  status: 'online' | 'offline' = 'online'
): Promise<void> {
  try {
    const presenceRef = doc(getPresenceCollection(), userId);

    await setDoc(presenceRef, {
      userId,
      boardId,
      email,
      status,
      lastSeen: serverTimestamp(),
    });

    console.log(`[Presence] Updated presence for ${email} on board ${boardId}: ${status}`);
  } catch (error) {
    console.error('[Presence] Failed to update presence:', error);
    // Don't throw - presence is non-critical feature
  }
}

/**
 * Set user as offline (remove from presence)
 *
 * @param userId - User's UID to set offline
 */
export async function setOffline(userId: string): Promise<void> {
  try {
    const presenceRef = doc(getPresenceCollection(), userId);
    await setDoc(
      presenceRef,
      {
        status: 'offline',
        lastSeen: serverTimestamp(),
      },
      { merge: true }
    );

    console.log('[Presence] User set to offline:', userId);
  } catch (error) {
    console.error('[Presence] Failed to set offline:', error);
    // Don't throw - presence is non-critical
  }
}

/**
 * Delete user's presence document entirely
 *
 * @param userId - User's UID to remove from presence
 */
export async function removePresence(userId: string): Promise<void> {
  try {
    const presenceRef = doc(getPresenceCollection(), userId);
    await deleteDoc(presenceRef);
    console.log('[Presence] Removed presence for user:', userId);
  } catch (error) {
    console.error('[Presence] Failed to remove presence:', error);
    // Don't throw - presence is non-critical
  }
}

/**
 * Subscribe to real-time presence updates for a specific board
 *
 * @param boardId - Board ID to monitor
 * @param callback - Called with array of online user IDs whenever presence changes
 * @returns Unsubscribe function
 */
export function subscribeToPresence(
  boardId: string,
  callback: (onlineUserIds: string[]) => void
): () => void {
  try {
    const presenceQuery = query(
      getPresenceCollection(),
      where('boardId', '==', boardId),
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

          // Handle Firestore Timestamp - try multiple ways to get milliseconds
          let lastSeenMs = 0;
          if (data.lastSeen) {
            if (typeof data.lastSeen.toMillis === 'function') {
              lastSeenMs = data.lastSeen.toMillis();
            } else if (data.lastSeen.seconds) {
              // Fallback: Firestore Timestamp object with seconds/nanoseconds
              lastSeenMs = data.lastSeen.seconds * 1000;
            } else if (typeof data.lastSeen === 'number') {
              lastSeenMs = data.lastSeen;
            }
          }

          const ageMs = now - lastSeenMs;
          const isRecentlyActive = lastSeenMs > 0 && ageMs < STALE_THRESHOLD_MS;

          if (data.status === 'online' && isRecentlyActive) {
            onlineUserIds.push(data.userId);
          } else if (data.status === 'online' && !isRecentlyActive) {
            // Log stale users for debugging
            console.log(`[Presence] Filtering out stale user ${data.userId} (age: ${Math.round(ageMs / 1000)}s)`);
          }
        });

        callback(onlineUserIds);
        console.log(`[Presence] Board ${boardId} has ${onlineUserIds.length} online users`);
      },
      (error) => {
        console.error('[Presence] Subscription error:', error);
        // Call callback with empty array on error
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('[Presence] Failed to subscribe to presence:', error);
    // Return no-op unsubscribe function
    return () => {};
  }
}

/**
 * Set up presence heartbeat to keep user marked as online
 *
 * @param userId - User's UID
 * @param boardId - Current board ID
 * @param email - User's email
 * @param intervalMs - Heartbeat interval in milliseconds (default: 30 seconds)
 * @returns Cleanup function to stop heartbeat
 */
export function startPresenceHeartbeat(
  userId: string,
  boardId: string,
  email: string,
  intervalMs: number = 30000
): () => void {
  // Initial presence update
  updatePresence(userId, boardId, email, 'online');

  // Set up periodic heartbeat
  const intervalId = setInterval(() => {
    updatePresence(userId, boardId, email, 'online');
  }, intervalMs);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    setOffline(userId);
  };
}

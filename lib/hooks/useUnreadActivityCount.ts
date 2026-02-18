'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import { subscribeToActivities } from '@/lib/firebase/activities';
import { savePreference, loadPreference } from '@/lib/db';

/**
 * Hook that returns the count of unseen activity entries for the active board.
 * Compares activity timestamps against a per-board "last seen" timestamp stored in IndexedDB.
 */
export function useUnreadActivityCount(boardId: string | null): number {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!boardId || !user) {
      setCount(0);
      return;
    }

    const key = `activity-last-seen-${boardId}`;
    let lastSeen: string | null = null;

    // Load last-seen, then subscribe to activities
    loadPreference(key)
      .then((ts) => {
        lastSeen = ts;
      })
      .catch(() => {
        // IndexedDB unavailable — treat all as unseen
      });

    const unsubscribe = subscribeToActivities(boardId, (activities) => {
      if (!lastSeen) {
        // Never opened the panel — count all activities from others
        const unseen = activities.filter((a) => a.actorId !== user.uid).length;
        setCount(unseen);
        return;
      }
      const unseen = activities.filter(
        (a) => a.createdAt > lastSeen! && a.actorId !== user.uid
      ).length;
      setCount(unseen);
    });

    return () => unsubscribe();
  }, [boardId, user?.uid]);

  return count;
}

/**
 * Mark all activities as seen for a given board.
 * Stores the current timestamp in IndexedDB.
 */
export async function markActivitiesSeen(boardId: string): Promise<void> {
  const key = `activity-last-seen-${boardId}`;
  await savePreference(key, new Date().toISOString());
}

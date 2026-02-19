'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import { useKanbanStore } from '@/lib/store';
import { subscribeToActivities } from '@/lib/firebase/activities';
import { savePreference, loadPreference } from '@/lib/db';

/**
 * Hook that returns the count of unseen activity entries for the active board.
 * Compares activity timestamps against a per-board "last seen" timestamp stored in IndexedDB.
 * Re-subscribes when the activity panel is toggled so that the count resets after viewing.
 */
export function useUnreadActivityCount(boardId: string | null): number {
  const { user } = useAuth();
  const activityPanelOpen = useKanbanStore((s) => s.activityPanelOpen);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!boardId || !user) {
      setCount(0);
      return;
    }

    const key = `activity-last-seen-${boardId}`;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    // Load last-seen FIRST, then subscribe — avoids race condition
    // where the subscription callback fires before loadPreference resolves.
    // Also re-runs when activityPanelOpen changes so we reload the updated
    // lastSeen timestamp after markActivitiesSeen writes to IndexedDB.
    loadPreference(key)
      .catch(() => null as string | null)
      .then((lastSeen) => {
        if (cancelled) return;

        unsubscribe = subscribeToActivities(boardId, (activities) => {
          if (cancelled) return;
          const unseen = activities.filter((a) => {
            if (a.actorId === user.uid) return false;
            if (!lastSeen) return true; // Never opened panel
            return a.createdAt > lastSeen;
          }).length;
          setCount(unseen);
        });
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [boardId, user?.uid, activityPanelOpen]);

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

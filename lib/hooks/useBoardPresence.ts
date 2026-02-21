'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import {
  updatePresence,
  subscribeToPresence,
  setOffline,
  startPresenceHeartbeat,
} from '@/lib/firebase/presence';

/**
 * Hook for tracking online users on a board
 *
 * @param boardId - The board to track presence for
 * @param enabled - Whether presence tracking is enabled (default: true)
 * @returns Object containing online user IDs and manual update function
 */
export function useBoardPresence(boardId: string | null, enabled: boolean = true) {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const heartbeatCleanupRef = useRef<(() => void) | null>(null);
  const previousUserRef = useRef<string | null>(null);
  // Track if presence was ever actively tracked in this hook instance
  const wasActivelyTrackingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !boardId || !user?.uid) {
      // Clear online users when presence is disabled
      setOnlineUsers([]);
      return;
    }

    console.log('[useBoardPresence] Starting presence tracking for board:', boardId);

    // Mark that we're actively tracking presence
    wasActivelyTrackingRef.current = true;

    // Guard against state updates after unmount (prevents Firestore SDK race conditions)
    let mounted = true;

    // Wrap in try-catch to prevent presence failures from breaking the app
    let unsubscribe: (() => void) | null = null;
    try {
      // Start presence heartbeat (updates every 30 seconds)
      const stopHeartbeat = startPresenceHeartbeat(
        user.uid,
        boardId,
        user.email || 'unknown@example.com'
      );
      heartbeatCleanupRef.current = stopHeartbeat;

      // Subscribe to presence updates from other users
      unsubscribe = subscribeToPresence(boardId, (userIds) => {
        if (mounted) setOnlineUsers(userIds);
      });
    } catch (error) {
      console.error('[useBoardPresence] Failed to initialize presence tracking:', error);
      // Don't throw - presence is non-critical, app should still work
      setOnlineUsers([]);
    }

    // Cleanup on unmount or board change
    return () => {
      mounted = false;
      console.log('[useBoardPresence] Cleaning up presence for board:', boardId);
      // Firestore SDK v12 has an internal race condition bug where unsubscribe()
      // can throw INTERNAL ASSERTION FAILED when a watch stream event arrives
      // concurrently. Wrap in try-catch so this never crashes the app.
      try {
        unsubscribe?.();
      } catch (e) {
        // Intentionally swallow — Firestore SDK internal bug, not our code
      }
      if (heartbeatCleanupRef.current) {
        try {
          heartbeatCleanupRef.current();
        } catch (e) {
          // Intentionally swallow
        }
        heartbeatCleanupRef.current = null;
      }
    };
  }, [boardId, user?.uid, user?.email, enabled]);

  // Clean up presence when user logs out
  useEffect(() => {
    const currentUserId = user?.uid || null;
    const previousUserId = previousUserRef.current;

    // Detect logout: had a user before, no user now
    // Only set offline if we were actually tracking presence for this user
    // This prevents demo mode / landing page from triggering logout cleanup
    if (previousUserId && !currentUserId && wasActivelyTrackingRef.current) {
      console.log('[useBoardPresence] User logged out, setting offline:', previousUserId);
      setOffline(previousUserId);
      // Reset tracking flag after handling logout
      wasActivelyTrackingRef.current = false;
    }

    previousUserRef.current = currentUserId;
  }, [user?.uid]);

  // Set offline when user navigates away or closes tab
  useEffect(() => {
    if (!user?.uid) return;

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable offline status on tab close
      // Note: This is a best-effort attempt - browser may not complete async operation
      setOffline(user.uid);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && boardId) {
        // User switched tabs or minimized window - set offline
        setOffline(user.uid);
      } else if (document.visibilityState === 'visible' && boardId && user.email) {
        // User came back - set online
        updatePresence(user.uid, boardId, user.email, 'online');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.uid, user?.email, boardId]);

  // Manual presence update function (for explicit refresh)
  const updateManually = () => {
    if (user?.uid && boardId && user.email) {
      updatePresence(user.uid, boardId, user.email, 'online');
    }
  };

  return {
    onlineUsers, // Array of user IDs currently online
    updatePresence: updateManually, // Manual update function
  };
}

'use client';

import { useEffect, useState, useRef } from 'react';
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

  useEffect(() => {
    if (!enabled || !boardId || !user?.uid) {
      // Clear online users when presence is disabled
      setOnlineUsers([]);
      return;
    }

    console.log('[useBoardPresence] Starting presence tracking for board:', boardId);

    // Wrap in try-catch to prevent presence failures from breaking the app
    try {
      // Start presence heartbeat (updates every 30 seconds)
      const stopHeartbeat = startPresenceHeartbeat(
        user.uid,
        boardId,
        user.email || 'unknown@example.com'
      );
      heartbeatCleanupRef.current = stopHeartbeat;

      // Subscribe to presence updates from other users
      const unsubscribe = subscribeToPresence(boardId, (userIds) => {
        setOnlineUsers(userIds);
      });

      // Cleanup on unmount or board change
      return () => {
        console.log('[useBoardPresence] Cleaning up presence for board:', boardId);
        unsubscribe();
        if (heartbeatCleanupRef.current) {
          heartbeatCleanupRef.current();
          heartbeatCleanupRef.current = null;
        }
      };
    } catch (error) {
      console.error('[useBoardPresence] Failed to initialize presence tracking:', error);
      // Don't throw - presence is non-critical, app should still work
      setOnlineUsers([]);
    }
  }, [boardId, user?.uid, user?.email, enabled]);

  // Set offline when user navigates away or closes tab
  useEffect(() => {
    if (!user?.uid) return;

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable offline status on tab close
      // Falls back to synchronous setOffline if sendBeacon not available
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

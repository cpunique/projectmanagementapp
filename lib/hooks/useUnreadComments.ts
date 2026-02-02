'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';

const STORAGE_KEY = 'kanban-last-seen-comments';

interface LastSeenMap {
  [cardId: string]: string; // ISO timestamp
}

/**
 * Hook to track unread comments for the current user
 * Stores lastSeen timestamps in localStorage per user
 */
export function useUnreadComments() {
  const { user } = useAuth();
  const [lastSeenMap, setLastSeenMap] = useState<LastSeenMap>({});

  // Load lastSeen map from localStorage on mount
  useEffect(() => {
    if (!user) {
      setLastSeenMap({});
      return;
    }

    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}-${user.uid}`);
      if (stored) {
        setLastSeenMap(JSON.parse(stored));
      }
    } catch (error) {
      console.error('[UnreadComments] Failed to load lastSeen map:', error);
    }
  }, [user]);

  // Save lastSeen map to localStorage whenever it changes
  useEffect(() => {
    if (!user) return;

    try {
      localStorage.setItem(`${STORAGE_KEY}-${user.uid}`, JSON.stringify(lastSeenMap));
    } catch (error) {
      console.error('[UnreadComments] Failed to save lastSeen map:', error);
    }
  }, [lastSeenMap, user]);

  /**
   * Mark a card's comments as seen (call when closing card modal)
   */
  const markAsSeen = useCallback((cardId: string) => {
    setLastSeenMap(prev => ({
      ...prev,
      [cardId]: new Date().toISOString(),
    }));
  }, []);

  /**
   * Get the number of unread comments for a card
   */
  const getUnreadCount = useCallback((cardId: string, comments: { createdAt: string; authorId: string }[] = []): number => {
    if (!user || comments.length === 0) return 0;

    const lastSeen = lastSeenMap[cardId];
    if (!lastSeen) {
      // Never seen this card - all comments from others are unread
      return comments.filter(c => c.authorId !== user.uid).length;
    }

    const lastSeenTime = new Date(lastSeen).getTime();
    return comments.filter(c => {
      const commentTime = new Date(c.createdAt).getTime();
      // Unread if: newer than lastSeen AND not from current user
      return commentTime > lastSeenTime && c.authorId !== user.uid;
    }).length;
  }, [lastSeenMap, user]);

  /**
   * Check if a card has any unread comments
   */
  const hasUnread = useCallback((cardId: string, comments: { createdAt: string; authorId: string }[] = []): boolean => {
    return getUnreadCount(cardId, comments) > 0;
  }, [getUnreadCount]);

  return {
    markAsSeen,
    getUnreadCount,
    hasUnread,
  };
}

'use client';

import { useEffect, useRef } from 'react';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from '@/lib/firebase/AuthContext';
import { updateBoard } from '@/lib/firebase/firestore';

/**
 * Auto-save hook that saves boards to Firebase when:
 * 1. User switches boards
 * 2. User is idle for 5 minutes
 * 3. User closes the app/tab (beforeunload)
 *
 * This prevents data loss while being conservative with Firebase quota.
 */
export function useAutoSave() {
  const { user } = useAuth();
  const hasUnsavedChanges = useKanbanStore((state) => state.hasUnsavedChanges);
  const boards = useKanbanStore((state) => state.boards);
  const activeBoard = useKanbanStore((state) => state.activeBoard);
  const markAsSaved = useKanbanStore((state) => state.markAsSaved);

  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActiveBoardRef = useRef<string | null>(null);

  /**
   * Saves the currently active board to Firebase
   */
  const saveCurrentBoard = async () => {
    if (!user || !activeBoard || activeBoard === 'default-board') {
      return;
    }

    try {
      const currentBoard = boards.find((b) => b.id === activeBoard);
      if (currentBoard) {
        const boardWithOwner = currentBoard as any;
        if (boardWithOwner.ownerId) {
          console.log('[useAutoSave] Auto-saving board:', activeBoard);
          await updateBoard(currentBoard.id, currentBoard);
          markAsSaved();
        }
      }
    } catch (error: any) {
      if (error?.code === 'resource-exhausted') {
        console.warn('[useAutoSave] Firebase quota exceeded - saved locally only');
      } else {
        console.error('[useAutoSave] Failed to auto-save board:', error);
      }
      // Mark as saved locally regardless of Firebase success
      markAsSaved();
    }
  };

  /**
   * Resets the idle timeout whenever user is active
   */
  const resetIdleTimeout = () => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }

    // Set 5-minute idle timeout
    idleTimeoutRef.current = setTimeout(() => {
      if (hasUnsavedChanges) {
        console.log('[useAutoSave] Idle timeout reached - saving');
        saveCurrentBoard();
      }
    }, 5 * 60 * 1000); // 5 minutes
  };

  // Effect: Set up idle timeout reset on user activity
  useEffect(() => {
    if (!user || !hasUnsavedChanges) return;

    const handleUserActivity = () => {
      resetIdleTimeout();
    };

    // Reset timeout on any user activity
    window.addEventListener('mousedown', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    // Initial timeout
    resetIdleTimeout();

    return () => {
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, [user, hasUnsavedChanges]);

  // Effect: Auto-save when board switches
  useEffect(() => {
    if (!user) {
      lastActiveBoardRef.current = activeBoard;
      return;
    }

    // If board changed and there are unsaved changes in the previous board
    if (lastActiveBoardRef.current && lastActiveBoardRef.current !== activeBoard && hasUnsavedChanges) {
      console.log('[useAutoSave] Board switched - saving previous board');
      saveCurrentBoard();
    }

    lastActiveBoardRef.current = activeBoard;
  }, [activeBoard, user]);

  // Effect: Save on page unload/close
  useEffect(() => {
    if (!user) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        // Save synchronously is not possible, but we can at least warn
        e.preventDefault();
        e.returnValue = '';
        // Attempt async save
        saveCurrentBoard();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, hasUnsavedChanges]);
}

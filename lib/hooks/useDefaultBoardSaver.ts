'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import { useKanbanStore } from '@/lib/store';
import { setUserDefaultBoard } from '@/lib/firebase/firestore';

/**
 * Hook to save the currently active board as the user's default board preference
 * IMPORTANT: Only saves if there's NO explicit default board set (defaultBoardId is null)
 *
 * This prevents the hook from overwriting the user's manually-selected default board (via star icon).
 * If user clicks the star to set a default, that choice is preserved.
 * If there's no explicit default, this hook remembers the last board they were working on.
 */
export function useDefaultBoardSaver() {
  const { user } = useAuth();
  const activeBoard = useKanbanStore((state) => state.activeBoard);
  const defaultBoardId = useKanbanStore((state) => state.defaultBoardId);
  const demoMode = useKanbanStore((state) => state.demoMode);

  useEffect(() => {
    if (!user || !activeBoard) return;

    // CRITICAL: Skip auto-save in demo mode - demo board is ephemeral
    if (demoMode) {
      return;
    }

    // CRITICAL: Never save the demo board ID ('default-board') as default - it doesn't exist in Firebase
    if (activeBoard === 'default-board') {
      console.log('[DefaultBoardSaver] Skipping auto-save - active board is demo board');
      return;
    }

    // CRITICAL: Only auto-save the active board as default if there's NO explicit default set
    // If the user has manually set a default (via star icon), respect that choice
    if (defaultBoardId !== null) {
      console.log('[DefaultBoardSaver] Skipping auto-save - user has explicitly set default:', defaultBoardId);
      return;
    }

    // Save the active board as the default for this user ONLY if no explicit default exists
    // This is debounced implicitly since this effect only runs when activeBoard changes
    const saveDefaultBoard = async () => {
      try {
        await setUserDefaultBoard(user.uid, activeBoard);
        console.log('[DefaultBoardSaver] Auto-saved active board as default (no explicit default set):', activeBoard);
      } catch (error) {
        console.error('[DefaultBoardSaver] Failed to save default board:', error);
        // Don't throw - this is a non-critical operation
      }
    };

    saveDefaultBoard();
  }, [user?.uid, activeBoard, defaultBoardId, demoMode]);
}

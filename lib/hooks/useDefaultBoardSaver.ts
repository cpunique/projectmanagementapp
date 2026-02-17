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
  const syncState = useKanbanStore((state) => state.syncState);

  useEffect(() => {
    if (!user || !activeBoard) return;

    // CRITICAL: Don't auto-save until Firebase sync initialization is fully complete.
    // During init, activeBoard changes multiple times as boards load from IndexedDB/Firebase.
    // Saving during this window overwrites the user's real default with whatever board loaded first.
    if (syncState !== 'synced') {
      return;
    }

    // CRITICAL: Skip auto-save in demo mode - demo board is ephemeral
    if (demoMode) {
      return;
    }

    // CRITICAL: Never save the demo board ID ('default-board') as default - it doesn't exist in Firebase
    if (activeBoard === 'default-board') {
      return;
    }

    // CRITICAL: Only auto-save the active board as default if there's NO explicit default set
    // If the user has manually set a default (via star icon), respect that choice
    if (defaultBoardId !== null) {
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
      }
    };

    saveDefaultBoard();
  }, [user?.uid, activeBoard, defaultBoardId, demoMode, syncState]);
}

'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import { useKanbanStore } from '@/lib/store';
import { setUserDefaultBoard } from '@/lib/firebase/firestore';

/**
 * Hook to save the currently active board as the user's default board preference
 * This ensures that when users log out and back in, they return to the board they were working on
 */
export function useDefaultBoardSaver() {
  const { user } = useAuth();
  const activeBoard = useKanbanStore((state) => state.activeBoard);

  useEffect(() => {
    if (!user || !activeBoard) return;

    // Save the active board as the default for this user
    // This is debounced implicitly since this effect only runs when activeBoard changes
    const saveDefaultBoard = async () => {
      try {
        await setUserDefaultBoard(user.uid, activeBoard);
        console.log('[DefaultBoardSaver] Saved default board:', activeBoard);
      } catch (error) {
        console.error('[DefaultBoardSaver] Failed to save default board:', error);
        // Don't throw - this is a non-critical operation
      }
    };

    saveDefaultBoard();
  }, [user?.uid, activeBoard]);
}

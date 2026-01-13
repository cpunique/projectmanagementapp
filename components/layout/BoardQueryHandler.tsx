'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useKanbanStore } from '@/lib/store';

/**
 * Handles board query parameter from recovery tools
 * This component is separate to avoid Suspense boundary issues with useSearchParams
 *
 * IMPORTANT: This must run AFTER boards are loaded from Firebase to avoid
 * being overridden by initializeFirebaseSync. We watch for boards to be loaded
 * and then switch to the requested board.
 */
export function BoardQueryHandler() {
  const searchParams = useSearchParams();
  const boards = useKanbanStore((state) => state.boards);
  const switchBoard = useKanbanStore((state) => state.switchBoard);
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    const boardId = searchParams.get('board');

    // Only process if:
    // 1. There's a board parameter
    // 2. We haven't already processed it
    // 3. Boards have been loaded (more than just the default board)
    if (boardId && !hasProcessedRef.current && boards.length > 0) {
      // Check if the requested board exists
      const boardExists = boards.some(b => b.id === boardId);
      if (boardExists) {
        console.log('[BoardQueryHandler] Switching to board from query param:', boardId);
        switchBoard(boardId);
        hasProcessedRef.current = true;
      }
    }
  }, [searchParams, boards, switchBoard]);

  return null;
}

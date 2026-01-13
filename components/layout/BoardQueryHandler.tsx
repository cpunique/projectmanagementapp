'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useKanbanStore } from '@/lib/store';

/**
 * Handles board query parameter from recovery tools
 * This component is separate to avoid Suspense boundary issues with useSearchParams
 */
export function BoardQueryHandler() {
  const searchParams = useSearchParams();
  const switchBoard = useKanbanStore((state) => state.switchBoard);

  useEffect(() => {
    const boardId = searchParams.get('board');
    if (boardId) {
      switchBoard(boardId);
    }
  }, [searchParams, switchBoard]);

  return null;
}

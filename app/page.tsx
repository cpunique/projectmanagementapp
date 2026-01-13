'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useKanbanStore } from '@/lib/store';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import { BoardWithPanel } from '@/components/layout/BoardWithPanel';
import AuthGate from '@/components/auth/AuthGate';
import { MigrateLocalStorage } from '@/components/admin/MigrateLocalStorage';

export default function Home() {
  const searchParams = useSearchParams();
  const switchBoard = useKanbanStore((state) => state.switchBoard);

  // Handle board query parameter from recovery tools
  useEffect(() => {
    const boardId = searchParams.get('board');
    if (boardId) {
      switchBoard(boardId);
    }
  }, [searchParams, switchBoard]);

  return (
    <AuthGate>
      <div className="flex flex-col h-screen">
        <div className="px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <MigrateLocalStorage />
        </div>
        <div className="flex-1 overflow-hidden">
          <BoardWithPanel>
            <KanbanBoard />
          </BoardWithPanel>
        </div>
      </div>
    </AuthGate>
  );
}

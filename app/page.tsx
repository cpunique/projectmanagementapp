'use client';

import KanbanBoard from '@/components/kanban/KanbanBoard';
import { BoardWithPanel } from '@/components/layout/BoardWithPanel';
import AuthGate from '@/components/auth/AuthGate';
import { MigrateLocalStorage } from '@/components/admin/MigrateLocalStorage';

export default function Home() {
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

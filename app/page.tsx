'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import { BoardWithPanel } from '@/components/layout/BoardWithPanel';
import { BoardQueryHandler } from '@/components/layout/BoardQueryHandler';
import AuthGate from '@/components/auth/AuthGate';
import { MigrateLocalStorage } from '@/components/admin/MigrateLocalStorage';
import { useOnboarding } from '@/lib/hooks/useOnboarding';
import { useOverdueChecker } from '@/lib/hooks/useOverdueChecker';
import { useKanbanStore } from '@/lib/store';

const OnboardingModal = dynamic(() => import('@/components/onboarding/OnboardingModal'), { ssr: false });

function AppContent() {
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const setCreateBoardModalOpen = useKanbanStore((state) => state.setCreateBoardModalOpen);
  useOverdueChecker();

  const handleCreateFirstBoard = () => {
    completeOnboarding();
    setCreateBoardModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <MigrateLocalStorage />
      </div>
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={null}>
          <BoardQueryHandler />
        </Suspense>
        <BoardWithPanel>
          <KanbanBoard />
        </BoardWithPanel>
      </div>
      {showOnboarding && (
        <OnboardingModal
          isOpen
          onDismiss={completeOnboarding}
          onCreateFirstBoard={handleCreateFirstBoard}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <AuthGate>
      <AppContent />
    </AuthGate>
  );
}

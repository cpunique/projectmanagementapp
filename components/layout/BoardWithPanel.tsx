'use client';

import dynamic from 'next/dynamic';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from '@/lib/firebase/AuthContext';
import { DueDatePanel } from '@/components/kanban/DueDatePanel';
import { DueDatePanelToggleButton } from '@/components/ui/DueDatePanelToggleButton';

const ActivityFeedPanel = dynamic(() => import('@/components/kanban/ActivityFeedPanel'), { ssr: false });
const AnalyticsPanel = dynamic(() => import('@/components/kanban/AnalyticsPanel'), { ssr: false });
const ArchivePanel = dynamic(() => import('@/components/kanban/ArchivePanel'), { ssr: false });
const CalendarView = dynamic(() => import('@/components/kanban/CalendarView'), { ssr: false });

interface BoardWithPanelProps {
  children: React.ReactNode;
}

export function BoardWithPanel({ children }: BoardWithPanelProps) {
  const { dueDatePanelOpen, activityPanelOpen, analyticsPanelOpen, archivePanelOpen, activeView, boards, activeBoard } = useKanbanStore();
  const { user } = useAuth();

  // Calculate total cards with due dates for badge
  const board = boards.find((b) => b.id === activeBoard);
  const cardsWithDueDates = board
    ? board.columns.flatMap((col) => col.cards.filter((card) => card.dueDate && !card.archived)).length
    : 0;

  // Derive canEdit for CalendarView
  const canEdit = (() => {
    if (!board || !user) return false;
    const collab = board.sharedWith?.find((c) => c.userId === user.uid);
    if (board.ownerId === user.uid) return true;
    if (collab?.role === 'editor') return true;
    // Demo mode: board has no ownerId set
    if (!board.ownerId) return true;
    return false;
  })();

  const anyPanelOpen = dueDatePanelOpen || activityPanelOpen || analyticsPanelOpen || archivePanelOpen;

  return (
    <div className="flex h-full w-full">
      {/* Board / Calendar Container */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden min-w-0">
        {activeView === 'calendar' && activeBoard
          ? <CalendarView boardId={activeBoard} canEdit={canEdit} />
          : children
        }
      </div>

      {/* Side Panels - Desktop (animations handled within components) */}
      <div className="hidden md:flex">
        <ArchivePanel />
        <ActivityFeedPanel />
        <AnalyticsPanel />
        <DueDatePanel />
      </div>

      {/* Mobile Toggle Button and Overlay Panel */}
      <div className="md:hidden">
        {/* Toggle Button - Fixed in bottom right on mobile */}
        <DueDatePanelToggleButton badge={cardsWithDueDates} />

        {/* Backdrop when panel is open on mobile */}
        {anyPanelOpen && (
          <div
            className="fixed inset-0 top-16 bg-black/50 z-20 md:hidden"
            onClick={() => {
              if (dueDatePanelOpen) useKanbanStore.getState().toggleDueDatePanel();
              if (activityPanelOpen) useKanbanStore.getState().setActivityPanelOpen(false);
              if (analyticsPanelOpen) useKanbanStore.getState().setAnalyticsPanelOpen(false);
              if (archivePanelOpen) useKanbanStore.getState().setArchivePanelOpen(false);
            }}
          />
        )}

        {/* Panels on mobile */}
        {dueDatePanelOpen && <DueDatePanel />}
        {activityPanelOpen && <ActivityFeedPanel />}
        {analyticsPanelOpen && <AnalyticsPanel />}
        {archivePanelOpen && <ArchivePanel />}
      </div>
    </div>
  );
}

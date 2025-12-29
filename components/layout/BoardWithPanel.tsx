'use client';

import { useKanbanStore } from '@/lib/store';
import { DueDatePanel } from '@/components/kanban/DueDatePanel';
import { DueDatePanelToggleButton } from '@/components/ui/DueDatePanelToggleButton';

interface BoardWithPanelProps {
  children: React.ReactNode;
}

export function BoardWithPanel({ children }: BoardWithPanelProps) {
  const { dueDatePanelOpen, boards, activeBoard } = useKanbanStore();

  // Calculate total cards with due dates for badge
  const board = boards.find((b) => b.id === activeBoard);
  const cardsWithDueDates = board
    ? board.columns.flatMap((col) => col.cards.filter((card) => card.dueDate)).length
    : 0;

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full">
      {/* Board Container */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        {children}
      </div>

      {/* Due Date Panel - Desktop (conditionally rendered based on toggle state) */}
      {dueDatePanelOpen && (
        <div className="hidden md:flex">
          <DueDatePanel />
        </div>
      )}

      {/* Mobile Toggle Button and Overlay Panel */}
      <div className="md:hidden">
        {/* Toggle Button - Fixed in bottom right on mobile */}
        <DueDatePanelToggleButton badge={cardsWithDueDates} />

        {/* Backdrop when panel is open on mobile */}
        {dueDatePanelOpen && (
          <div
            className="fixed inset-0 top-16 bg-black/50 z-20 md:hidden"
            onClick={() => useKanbanStore.getState().toggleDueDatePanel()}
          />
        )}

        {/* Panel on mobile */}
        {dueDatePanelOpen && <DueDatePanel />}
      </div>
    </div>
  );
}

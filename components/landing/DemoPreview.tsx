'use client';

import KanbanBoard from '@/components/kanban/KanbanBoard';
import { BoardWithPanel } from '@/components/layout/BoardWithPanel';

export default function DemoPreview() {
  return (
    <div className="lg:w-3/5 relative bg-gray-50 dark:bg-gray-900 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700 min-h-[40vh] lg:min-h-auto overflow-hidden">
      {/* Demo Badge — bottom-left so it doesn't overlap the Background picker in the board title row */}
      <div className="absolute bottom-4 left-4 z-10 bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium pointer-events-none">
        Interactive Demo - Try Dragging Cards!
      </div>

      {/* Actual Board with Due Dates Panel */}
      <BoardWithPanel>
        <KanbanBoard />
      </BoardWithPanel>
    </div>
  );
}

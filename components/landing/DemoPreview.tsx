'use client';

import KanbanBoard from '@/components/kanban/KanbanBoard';

export default function DemoPreview() {
  return (
    <div className="lg:w-3/5 relative bg-gray-50 dark:bg-gray-900 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700 min-h-[40vh] lg:min-h-auto">
      {/* Demo Badge */}
      <div className="absolute top-4 right-4 z-10 bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium">
        Interactive Demo - Try Dragging Cards!
      </div>

      {/* Actual Board */}
      <div className="h-full overflow-auto">
        <KanbanBoard />
      </div>
    </div>
  );
}

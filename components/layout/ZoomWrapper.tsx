'use client';

import { useKanbanStore } from '@/lib/store';

export default function ZoomWrapper({ children }: { children: React.ReactNode }) {
  const zoomLevel = useKanbanStore((state) => state.zoomLevel);

  return (
    <div style={{ zoom: `${zoomLevel}%` }} className="flex-1 min-h-0">
      {children}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useKanbanStore } from '@/lib/store';

export default function ZoomWrapper({ children }: { children: React.ReactNode }) {
  const zoomLevel = useKanbanStore((state) => state.zoomLevel);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use default zoom on server/first render to avoid hydration mismatch
  const zoom = mounted ? zoomLevel : 80;

  return (
    <div style={{ zoom: `${zoom}%` }} className="flex-1 min-h-0">
      {children}
    </div>
  );
}

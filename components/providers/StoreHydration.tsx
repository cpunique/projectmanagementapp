'use client';

import { useEffect } from 'react';
import { useKanbanStore } from '@/lib/store';

/**
 * Triggers Zustand persist rehydration after client mount.
 * This prevents React hydration mismatches by ensuring the store
 * uses default values during SSR, then loads persisted values after mount.
 */
export default function StoreHydration() {
  useEffect(() => {
    useKanbanStore.persist.rehydrate();
    // After rehydration, bootstrap the dedicated darkMode key if it doesn't exist yet.
    // This handles existing users whose preference is in kanban-store (Zustand persist)
    // but not yet in kanban-ui-darkMode, preventing Firebase sync from overwriting it.
    if (localStorage.getItem('kanban-ui-darkMode') === null) {
      const { darkMode } = useKanbanStore.getState();
      try { localStorage.setItem('kanban-ui-darkMode', JSON.stringify(darkMode)); } catch {}
    }
  }, []);

  return null;
}

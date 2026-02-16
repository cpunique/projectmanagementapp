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
  }, []);

  return null;
}

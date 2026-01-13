'use client';

import { useEffect } from 'react';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from '@/lib/firebase/AuthContext';

/**
 * Shows a confirmation dialog when user tries to leave the page with unsaved changes
 */
export function UnsavedChangesWarning() {
  const { user } = useAuth();
  const hasUnsavedChanges = useKanbanStore((state) => state.hasUnsavedChanges);

  useEffect(() => {
    if (!user || !hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, hasUnsavedChanges]);

  // This component doesn't render anything, it just handles the beforeunload event
  return null;
}

'use client';

import { useEffect, useState } from 'react';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from '@/lib/firebase/AuthContext';
import { getActiveDemoConfig } from '@/lib/firebase/demoConfig';
import type { Board } from '@/types';
import MarketingPanel from './MarketingPanel';
import DemoPreview from './DemoPreview';

export default function LandingPage() {
  const { user } = useAuth();
  const [demoBoardLoaded, setDemoBoardLoaded] = useState(false);
  const [customDemoBoard, setCustomDemoBoard] = useState<Board | null>(null);

  // Load demo board from Firestore on mount
  useEffect(() => {
    async function loadDemoBoard() {
      try {
        // Try to fetch custom demo board from Firestore
        const customDemo = await getActiveDemoConfig();

        if (customDemo) {
          console.log('[LandingPage] Loaded custom demo board from Firestore');
          setCustomDemoBoard(customDemo);
        } else {
          console.log('[LandingPage] No custom demo found, using hardcoded fallback');
          setCustomDemoBoard(null);
        }
      } catch (error) {
        console.error('[LandingPage] Failed to load demo config, using hardcoded fallback:', error);
        setCustomDemoBoard(null);
      } finally {
        setDemoBoardLoaded(true);
      }
    }

    loadDemoBoard();
  }, []);

  // Load demo into store only when on landing page (not logged in)
  useEffect(() => {
    const store = useKanbanStore.getState();
    if (demoBoardLoaded && !user) {
      // CRITICAL: Always reload demo mode when customDemoBoard changes
      // Exit demo mode first, then re-enter with the new board
      if (store.demoMode) {
        store.setDemoMode(false);
      }

      // Now enter demo mode with the custom demo board
      store.setBoards([]);
      store.setDemoMode(true, customDemoBoard || undefined);
      store.setDueDatePanelOpen(false);
    }
  }, [demoBoardLoaded, user, customDemoBoard]);

  // Clear localStorage and reset store on mount/unmount
  // This ensures unauthenticated users start fresh each time
  useEffect(() => {
    // Clear the persisted store state when on landing page
    // This prevents demo modifications from being saved to localStorage
    localStorage.removeItem('kanban-store');

    // Reset store to clean state
    const store = useKanbanStore.getState();
    store.setBoards([]);
    // CRITICAL: Exit demo mode if it was persisted
    // Demo mode should only be active on the landing page during this mount
    if (store.demoMode) {
      store.setDemoMode(false);
    }

    return () => {
      // Also clear when leaving the landing page
      localStorage.removeItem('kanban-store');
    };
  }, []);

  // Auto-transition to full board after successful auth
  useEffect(() => {
    const store = useKanbanStore.getState();
    if (user && store.demoMode) {
      store.setDemoMode(false);
    }
  }, [user]);

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] bg-white dark:bg-gray-900">
      {/* Left Panel - Marketing + Auth */}
      <MarketingPanel />

      {/* Right Panel - Demo Board */}
      {demoBoardLoaded && <DemoPreview />}
    </div>
  );
}

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
      store.setDemoMode(true, customDemoBoard || undefined);
      store.setDueDatePanelOpen(false);
    }
  }, [demoBoardLoaded, user, customDemoBoard]);

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

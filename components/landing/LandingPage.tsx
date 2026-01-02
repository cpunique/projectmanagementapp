'use client';

import { useEffect, useState } from 'react';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from '@/lib/firebase/AuthContext';
import { getActiveDemoConfig } from '@/lib/firebase/demoConfig';
import MarketingPanel from './MarketingPanel';
import DemoPreview from './DemoPreview';

export default function LandingPage() {
  const { user } = useAuth();
  const [demoBoardLoaded, setDemoBoardLoaded] = useState(false);

  // Load demo board from Firestore on mount
  useEffect(() => {
    async function loadDemoBoard() {
      const store = useKanbanStore.getState();

      try {
        // Try to fetch custom demo board from Firestore
        const customDemo = await getActiveDemoConfig();

        if (customDemo) {
          console.log('[LandingPage] Loaded custom demo board from Firestore');
          store.setDemoMode(true, customDemo);
        } else {
          console.log('[LandingPage] No custom demo found, using hardcoded fallback');
          store.setDemoMode(true);
        }
      } catch (error) {
        console.error('[LandingPage] Failed to load demo config, using hardcoded fallback:', error);
        store.setDemoMode(true);
      } finally {
        setDemoBoardLoaded(true);
        store.setDueDatePanelOpen(false);
      }
    }

    loadDemoBoard();
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

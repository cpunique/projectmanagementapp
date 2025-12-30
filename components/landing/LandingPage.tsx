'use client';

import { useEffect } from 'react';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from '@/lib/firebase/AuthContext';
import MarketingPanel from './MarketingPanel';
import DemoPreview from './DemoPreview';

export default function LandingPage() {
  const { user } = useAuth();

  // Auto-enable demo mode and close due date panel when on landing page
  useEffect(() => {
    const store = useKanbanStore.getState();

    // Idempotent - safe to call multiple times
    store.setDemoMode(true);
    store.setDueDatePanelOpen(false);
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
      <DemoPreview />
    </div>
  );
}

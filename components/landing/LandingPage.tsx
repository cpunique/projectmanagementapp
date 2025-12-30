'use client';

import { useEffect, useRef } from 'react';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from '@/lib/firebase/AuthContext';
import MarketingPanel from './MarketingPanel';
import DemoPreview from './DemoPreview';

export default function LandingPage() {
  const { user } = useAuth();
  const initRef = useRef(false);

  // Auto-enable demo mode and close due date panel when on landing page
  useEffect(() => {
    // Only initialize once to avoid React Strict Mode double-mount issues
    if (initRef.current) return;
    initRef.current = true;

    const store = useKanbanStore.getState();

    // Ensure demo mode is enabled
    if (!store.demoMode) {
      console.log('[LandingPage] Enabling demo mode');
      store.toggleDemoMode();
    }

    // Ensure due date panel is closed on landing page
    console.log('[LandingPage] Closing due date panel');
    store.setDueDatePanelOpen(false);
  }, []);

  // Auto-transition to full board after successful auth
  useEffect(() => {
    const store = useKanbanStore.getState();
    if (user && store.demoMode) {
      store.toggleDemoMode();
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

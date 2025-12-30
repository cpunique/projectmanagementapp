'use client';

import { useEffect } from 'react';
import { useKanbanStore } from '@/lib/store';
import { useAuth } from '@/lib/firebase/AuthContext';
import MarketingPanel from './MarketingPanel';
import DemoPreview from './DemoPreview';

export default function LandingPage() {
  const { user } = useAuth();
  const demoMode = useKanbanStore((state) => state.demoMode);
  const toggleDemoMode = useKanbanStore((state) => state.toggleDemoMode);

  // Auto-enable demo mode when on landing page
  useEffect(() => {
    if (!demoMode) {
      console.log('[LandingPage] Enabling demo mode');
      toggleDemoMode();
    }
  }, []);

  // Auto-transition to full board after successful auth
  useEffect(() => {
    if (user && demoMode) {
      toggleDemoMode();
    }
  }, [user, demoMode]);

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] bg-white dark:bg-gray-900">
      {/* Left Panel - Marketing + Auth */}
      <MarketingPanel />

      {/* Right Panel - Demo Board */}
      <DemoPreview />
    </div>
  );
}

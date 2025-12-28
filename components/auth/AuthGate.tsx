'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import { useKanbanStore } from '@/lib/store';
import LoginModal from './LoginModal';

interface AuthGateProps {
  children: React.ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const { user, loading } = useAuth();
  const [loginModalOpen, setLoginModalOpen] = useState(!user);
  const demoMode = useKanbanStore((state) => state.demoMode);
  const toggleDemoMode = useKanbanStore((state) => state.toggleDemoMode);

  // Enable demo mode when not authenticated to hide user data
  useEffect(() => {
    if (!loading && !user && !demoMode) {
      console.log('[AuthGate] Not authenticated - enabling demo mode');
      toggleDemoMode();
    }
  }, [user, loading, demoMode, toggleDemoMode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        {/* Show demo board in background with login modal overlay */}
        {children}
        <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
      </>
    );
  }

  return <>{children}</>;
}

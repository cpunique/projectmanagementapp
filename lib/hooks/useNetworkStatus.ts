'use client';

import { useEffect } from 'react';
import { useKanbanStore } from '@/lib/store';

/**
 * Hook to monitor network connectivity and update store
 */
export function useNetworkStatus() {
  const setIsOnline = useKanbanStore((state) => state.setIsOnline);
  const setSyncState = useKanbanStore((state) => state.setSyncState);

  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      console.log('[NetworkStatus] Connection restored');
      setIsOnline(true);
      // Reset sync state from 'offline' to 'idle' when connection is restored
      // This clears the offline indicator and allows normal sync to resume
      setSyncState('idle');
    };

    const handleOffline = () => {
      console.log('[NetworkStatus] Connection lost');
      setIsOnline(false);
      setSyncState('offline');
    };

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline, setSyncState]);
}

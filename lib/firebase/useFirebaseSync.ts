'use client';

import { useEffect } from 'react';
import { useAuth } from './AuthContext';
import { initializeFirebaseSync, cleanupFirebaseSync, subscribeToStoreChanges } from './storeSync';

/**
 * Hook to manage Firebase sync lifecycle
 * - Initializes Firebase sync when user logs in
 * - Cleans up subscriptions when user logs out
 * - Syncs store changes to Firebase in real-time
 */
export function useFirebaseSync() {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Skip if loading or no user
    if (loading || !user) {
      return;
    }

    // Initialize Firebase sync
    initializeFirebaseSync(user);

    // Subscribe to store changes for real-time sync
    // Note: Auto-sync is now enabled but with guards to skip demo board and use debouncing
    const unsubscribeFromStore = subscribeToStoreChanges(user);

    // Cleanup function
    return () => {
      unsubscribeFromStore?.();
      cleanupFirebaseSync();
    };
  }, [user, loading]);
}

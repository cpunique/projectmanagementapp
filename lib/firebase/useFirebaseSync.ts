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
  const { user, loading, requiresToSAcceptance } = useAuth();

  useEffect(() => {
    // Skip if loading or no user
    if (loading || !user) {
      return;
    }

    // Skip if user needs to accept ToS first
    // Firebase sync will run once ToS is accepted
    if (requiresToSAcceptance) {
      console.log('[useFirebaseSync] Waiting for ToS acceptance before syncing boards');
      return;
    }

    console.log('[useFirebaseSync] Initializing Firebase sync for user:', user.uid);
    // Initialize Firebase sync
    initializeFirebaseSync(user);

    // AUTO-SYNC DISABLED: Using manual save button instead to avoid Firebase quota issues
    // Subscribe to store changes for real-time sync
    // const unsubscribeFromStore = subscribeToStoreChanges(user);

    // Cleanup function
    return () => {
      // unsubscribeFromStore?.();
      cleanupFirebaseSync();
    };
  }, [user, loading, requiresToSAcceptance]);
}

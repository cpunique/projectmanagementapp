'use client';

import { useEffect } from 'react';
import { useAuth } from './AuthContext';
import { initializeFirebaseSync, cleanupFirebaseSync, subscribeToStoreChanges } from './storeSync';
import { startPeriodicSync, stopPeriodicSync } from './periodicSync';

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

    // Add a small delay to ensure Firebase auth is fully settled
    // This prevents permission errors during initial sync on first login
    const delayAndSync = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await initializeFirebaseSync(user);

      // Start periodic sync for collaborative boards (every 15 seconds)
      // This checks for updates from other users on shared boards
      startPeriodicSync(user, 15000);
    };

    delayAndSync().catch(err => {
      console.error('[useFirebaseSync] Error during delayed initialization:', err);
    });

    // Subscribe to store changes for real-time sync to Firebase
    const unsubscribeFromStore = subscribeToStoreChanges(user);

    // Cleanup function
    return () => {
      unsubscribeFromStore?.();
      stopPeriodicSync();
      cleanupFirebaseSync();
    };
  }, [user, loading, requiresToSAcceptance]);
}

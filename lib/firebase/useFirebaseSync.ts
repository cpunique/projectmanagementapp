'use client';

import { useEffect } from 'react';
import { useAuth } from './AuthContext';
import { initializeFirebaseSync, cleanupFirebaseSync, subscribeToStoreChanges } from './storeSync';
import { startPeriodicSync, stopPeriodicSync } from './periodicSync';
import { startQueueProcessor, stopQueueProcessor, processQueue } from '@/lib/syncQueue';

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

    // Track subscription so cleanup can unsubscribe even if init is still running
    let unsubscribeFromStore: (() => void) | undefined;
    let cancelled = false;

    // Add a small delay to ensure Firebase auth is fully settled
    // This prevents permission errors during initial sync on first login
    const delayAndSync = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (cancelled) return;

      await initializeFirebaseSync(user);
      if (cancelled) return;

      // CRITICAL: Start the store subscription AFTER init completes.
      // Starting it before init caused a race condition where the subscription
      // would detect false "changes" (lastDefaultBoardId=null vs store value)
      // and sync stale/wrong values to Firestore before init could load the real ones.
      unsubscribeFromStore = subscribeToStoreChanges(user);

      // Start periodic sync for collaborative boards (every 15 seconds)
      startPeriodicSync(user, 15000);

      // Start sync queue processor and drain any pending operations from last session
      startQueueProcessor();
      processQueue().catch(err =>
        console.error('[useFirebaseSync] Failed to process initial queue:', err)
      );
    };

    delayAndSync().catch(err => {
      console.error('[useFirebaseSync] Error during delayed initialization:', err);
    });

    // Cleanup function
    return () => {
      cancelled = true;
      unsubscribeFromStore?.();
      stopPeriodicSync();
      stopQueueProcessor();
      cleanupFirebaseSync();
    };
  }, [user, loading, requiresToSAcceptance]);
}

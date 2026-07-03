'use client';

import { useState, useEffect, useRef } from 'react';
import { getDoc, setDoc, doc } from 'firebase/firestore';
import { useAuth } from '@/lib/firebase/AuthContext';
import { useKanbanStore } from '@/lib/store';
import { getDb } from '@/lib/firebase/config';

// Per-account key — must include uid so dismissing onboarding under one
// account never silences it for a different account signed into the same browser.
const ONBOARDING_KEY_PREFIX = 'kanban-onboarding-completed-';

export function useOnboarding() {
  const { user, loading: authLoading, requiresToSAcceptance } = useAuth();
  const syncState = useKanbanStore((s) => s.syncState);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const hasChecked = useRef(false);

  useEffect(() => {
    // Guards: must be fully settled and synced
    if (authLoading || !user || requiresToSAcceptance || syncState !== 'synced') return;

    // Prevent re-running if syncState flips
    if (hasChecked.current) return;
    hasChecked.current = true;

    const onboardingKey = ONBOARDING_KEY_PREFIX + user.uid;

    const detect = async () => {
      try {
        // Signal 1: localStorage fast-path, scoped per-account
        if (localStorage.getItem(onboardingKey) === 'true') return;

        // Signal 2: Firestore check (completed on another device, or
        // backfilled for accounts that pre-date this feature)
        try {
          const userSnap = await getDoc(doc(getDb(), 'users', user.uid));
          if (userSnap.exists() && userSnap.data()?.onboardingCompleted === true) return;
        } catch {
          // Fail closed on any error (permission-denied mid auth-swap, network, etc.).
          // Never show onboarding because a check errored — only show when a check
          // succeeds and confirms the flag is absent.
          return;
        }

        setShowOnboarding(true);
      } catch {
        // Never block the app on onboarding errors
      }
    };

    detect();
  }, [authLoading, user, requiresToSAcceptance, syncState]);

  const completeOnboarding = () => {
    setShowOnboarding(false);

    if (user) {
      localStorage.setItem(ONBOARDING_KEY_PREFIX + user.uid, 'true');
      // Non-blocking Firestore write
      setDoc(doc(getDb(), 'users', user.uid), { onboardingCompleted: true }, { merge: true }).catch(() => {});
    }
  };

  return { showOnboarding, completeOnboarding };
}

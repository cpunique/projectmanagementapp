'use client';

import { useState, useEffect, useRef } from 'react';
import { getDoc, setDoc, doc } from 'firebase/firestore';
import { useAuth } from '@/lib/firebase/AuthContext';
import { useKanbanStore } from '@/lib/store';
import { getDb } from '@/lib/firebase/config';

const ONBOARDING_KEY = 'kanban-onboarding-completed';
const NEW_USER_THRESHOLD_MS = 60_000; // 60 seconds

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

    const detect = async () => {
      try {
        // Signal 1: localStorage fast-path
        if (localStorage.getItem(ONBOARDING_KEY) === 'true') return;

        // Signal 2: returning user by account age
        const creationTime = user.metadata.creationTime;
        if (creationTime && Date.now() - new Date(creationTime).getTime() > NEW_USER_THRESHOLD_MS) return;

        // Signal 3: Firestore check (completed on another device)
        try {
          const userSnap = await getDoc(doc(getDb(), 'users', user.uid));
          if (userSnap.exists() && userSnap.data()?.onboardingCompleted === true) return;
        } catch {
          // Firestore unavailable — proceed with onboarding rather than blocking
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
    localStorage.setItem(ONBOARDING_KEY, 'true');

    // Non-blocking Firestore write
    if (user) {
      setDoc(doc(getDb(), 'users', user.uid), { onboardingCompleted: true }, { merge: true }).catch(() => {});
    }
  };

  return { showOnboarding, completeOnboarding };
}

'use client';

import { useFirebaseSync } from '@/lib/firebase/useFirebaseSync';
import { useAutoSave } from '@/lib/hooks/useAutoSave';
import { useDefaultBoardSaver } from '@/lib/hooks/useDefaultBoardSaver';
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus';

/**
 * Component that wraps the app and initializes Firebase sync and auto-save
 * Must be used within AuthProvider
 */
export function FirebaseWrapper({ children }: { children: React.ReactNode }) {
  useFirebaseSync();
  useAutoSave();
  useDefaultBoardSaver();
  useNetworkStatus();

  return <>{children}</>;
}

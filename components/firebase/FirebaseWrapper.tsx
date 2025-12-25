'use client';

import { useFirebaseSync } from '@/lib/firebase/useFirebaseSync';

/**
 * Component that wraps the app and initializes Firebase sync
 * Must be used within AuthProvider
 */
export function FirebaseWrapper({ children }: { children: React.ReactNode }) {
  useFirebaseSync();

  return <>{children}</>;
}

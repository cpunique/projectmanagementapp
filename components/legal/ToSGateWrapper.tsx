'use client';

import { useAuth } from '@/lib/firebase/AuthContext';
import ToSGateModal from './ToSGateModal';

/**
 * Wrapper component that shows ToS gate modal when user needs to accept terms
 * Place this inside AuthProvider to enforce ToS acceptance
 */
export default function ToSGateWrapper({ children }: { children: React.ReactNode }) {
  const { user, requiresToSAcceptance, signOut, markToSAccepted } = useAuth();

  const handleAccepted = () => {
    markToSAccepted();
  };

  const handleDeclined = async () => {
    await signOut();
  };

  // Show ToS gate if user is logged in but hasn't accepted current ToS
  if (user && requiresToSAcceptance) {
    return (
      <>
        {children}
        <ToSGateModal
          userId={user.uid}
          onAccepted={handleAccepted}
          onDeclined={handleDeclined}
        />
      </>
    );
  }

  return <>{children}</>;
}

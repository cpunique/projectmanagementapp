'use client';

import { useAuth } from '@/lib/firebase/AuthContext';
import { usePathname } from 'next/navigation';
import ToSGateModal from './ToSGateModal';

/**
 * Wrapper component that shows ToS gate modal when user needs to accept terms
 * Place this inside AuthProvider to enforce ToS acceptance
 *
 * Exempts admin/restore-consent and admin/check-consent pages to allow
 * users to restore/check their consent records without being blocked
 */
export default function ToSGateWrapper({ children }: { children: React.ReactNode }) {
  const { user, requiresToSAcceptance, signOut, markToSAccepted } = useAuth();
  const pathname = usePathname();

  const handleAccepted = () => {
    markToSAccepted();
  };

  const handleDeclined = async () => {
    await signOut();
  };

  // Pages exempt from ToS gate (admin tools to fix ToS/Privacy issues)
  const exemptPages = [
    '/admin/restore-consent',
    '/admin/check-consent',
  ];

  const isExempt = exemptPages.some(page => pathname?.startsWith(page));

  // Show ToS gate if user is logged in but hasn't accepted current ToS
  // UNLESS they're on an exempt page (admin tools)
  if (user && requiresToSAcceptance && !isExempt) {
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

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import { usePathname } from 'next/navigation';
import { hasAcceptedCurrentToS, hasAcceptedCurrentPrivacy } from '@/lib/firebase/legal';
import ToSGateModal from './ToSGateModal';

/**
 * Wrapper component that shows ToS gate modal when user needs to accept terms
 * Place this inside AuthProvider to enforce ToS acceptance
 *
 * Exempts admin/restore-consent and admin/check-consent pages to allow
 * users to restore/check their consent records without being blocked
 *
 * When navigating away from exempt pages, re-checks Firebase to see if
 * consent was restored, to avoid showing stale cached state
 */
export default function ToSGateWrapper({ children }: { children: React.ReactNode }) {
  const { user, requiresToSAcceptance, signOut, markToSAccepted } = useAuth();
  const pathname = usePathname();
  const [actualRequiresAcceptance, setActualRequiresAcceptance] = useState(requiresToSAcceptance);

  // Re-check consent status when navigating away from exempt pages
  useEffect(() => {
    if (!user) {
      setActualRequiresAcceptance(false);
      return;
    }

    // Pages exempt from ToS gate (admin tools to fix ToS/Privacy issues)
    const exemptPages = [
      '/admin/restore-consent',
      '/admin/check-consent',
    ];

    const isExempt = exemptPages.some(page => pathname?.startsWith(page));

    // When leaving an exempt page, re-check Firebase to see if consent was restored
    if (!isExempt && requiresToSAcceptance) {
      console.log('[ToSGate] Navigated away from exempt page, re-checking Firebase consent...');
      (async () => {
        try {
          const [tosAccepted, privacyAccepted] = await Promise.all([
            hasAcceptedCurrentToS(user.uid),
            hasAcceptedCurrentPrivacy(user.uid),
          ]);
          const stillNeedsAcceptance = !(tosAccepted && privacyAccepted);

          console.log('[ToSGate] Re-check result:', {
            tosAccepted,
            privacyAccepted,
            stillNeedsAcceptance,
          });

          setActualRequiresAcceptance(stillNeedsAcceptance);

          // If consent was restored, update local auth state
          if (!stillNeedsAcceptance) {
            console.log('[ToSGate] ✅ Consent was restored, marking as accepted');
            markToSAccepted();
          }
        } catch (error) {
          console.error('[ToSGate] Error re-checking consent:', error);
          // Keep current state on error
        }
      })();
    } else if (isExempt) {
      // On exempt pages, don't check - just set to false to hide modal
      setActualRequiresAcceptance(false);
    } else if (!requiresToSAcceptance) {
      // If initial check says no acceptance needed, trust it
      setActualRequiresAcceptance(false);
    }
  }, [pathname, user, requiresToSAcceptance, markToSAccepted]);

  const handleAccepted = () => {
    markToSAccepted();
    setActualRequiresAcceptance(false);
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
  if (user && actualRequiresAcceptance && !isExempt) {
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

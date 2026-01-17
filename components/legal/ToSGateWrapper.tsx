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
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [hasCheckedConsent, setHasCheckedConsent] = useState(false);

  // Handle pathname changes and re-checks
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
    const wasExempt = exemptPages.some(page => prevPathname?.startsWith(page));

    console.log('[ToSGate] Pathname changed:', {
      from: prevPathname,
      to: pathname,
      wasExempt,
      isExempt,
      requiresToSAcceptance,
    });

    // If we just LEFT an exempt page, always do a re-check
    if (wasExempt && !isExempt) {
      console.log('[ToSGate] Navigated away from exempt page, re-checking Firebase consent...');
      (async () => {
        try {
          // Use forceFresh=true to bypass cache and get fresh server data
          const [tosAccepted, privacyAccepted] = await Promise.all([
            hasAcceptedCurrentToS(user.uid, true),
            hasAcceptedCurrentPrivacy(user.uid, true),
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
      console.log('[ToSGate] On exempt page, hiding modal');
      setActualRequiresAcceptance(false);
    } else if (!requiresToSAcceptance) {
      // If initial check says no acceptance needed, trust it
      console.log('[ToSGate] requiresToSAcceptance is false, hiding modal');
      setActualRequiresAcceptance(false);
      setHasCheckedConsent(false);
    } else {
      // Default: Sync actualRequiresAcceptance with requiresToSAcceptance
      console.log('[ToSGate] Default: Setting actualRequiresAcceptance to', requiresToSAcceptance);
      setActualRequiresAcceptance(requiresToSAcceptance);
      // Mark that we need to do a fresh check on non-exempt pages
      if (!isExempt) {
        setHasCheckedConsent(false);
      }
    }

    setPrevPathname(pathname);
  }, [pathname, user, requiresToSAcceptance, markToSAccepted, prevPathname]);

  // Separate effect: Do a fresh consent check on non-exempt pages if acceptance is supposedly required
  // This handles race conditions or stale auth state
  useEffect(() => {
    if (!user || !requiresToSAcceptance || hasCheckedConsent) {
      return;
    }

    const exemptPages = ['/admin/restore-consent', '/admin/check-consent'];
    const isExempt = exemptPages.some(page => pathname?.startsWith(page));

    if (isExempt) {
      return;
    }

    console.log('[ToSGate] Performing fresh consent check on non-exempt page');
    setHasCheckedConsent(true);

    (async () => {
      try {
        const [tosAccepted, privacyAccepted] = await Promise.all([
          hasAcceptedCurrentToS(user.uid, true),
          hasAcceptedCurrentPrivacy(user.uid, true),
        ]);
        const stillNeedsAcceptance = !(tosAccepted && privacyAccepted);

        console.log('[ToSGate] Fresh consent check completed:', {
          tosAccepted,
          privacyAccepted,
          stillNeedsAcceptance,
        });

        setActualRequiresAcceptance(stillNeedsAcceptance);

        if (!stillNeedsAcceptance) {
          console.log('[ToSGate] ✅ Consent verified as already accepted');
          markToSAccepted();
        }
      } catch (error) {
        console.error('[ToSGate] Error in fresh consent check:', error);
      }
    })();
  }, [user, requiresToSAcceptance, hasCheckedConsent, pathname, markToSAccepted]);

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

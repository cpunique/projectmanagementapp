'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import { getUserLegalConsent, hasAcceptedCurrentToS, hasAcceptedCurrentPrivacy } from '@/lib/firebase/legal';
import { LEGAL_VERSIONS } from '@/types/legal';

export default function CheckConsentPage() {
  const { user } = useAuth();
  const [consent, setConsent] = useState<any>(null);
  const [checks, setChecks] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      checkConsent();
    }
  }, [user]);

  const checkConsent = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      console.log('[Check] Fetching consent for user:', user.uid);

      // Get raw consent data
      const consentData = await getUserLegalConsent(user.uid);
      setConsent(consentData);

      // Run the checks
      const [tosAccepted, privacyAccepted] = await Promise.all([
        hasAcceptedCurrentToS(user.uid),
        hasAcceptedCurrentPrivacy(user.uid),
      ]);

      setChecks({
        tosAccepted,
        privacyAccepted,
        bothAccepted: tosAccepted && privacyAccepted,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch consent: ${errorMsg}`);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Check ToS/Privacy Consent</h1>
        <p className="text-red-600">Please log in first</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Check ToS/Privacy Consent Data</h1>

      <button
        onClick={checkConsent}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 mb-6"
      >
        {loading ? 'Checking...' : 'Refresh Consent Data'}
      </button>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {checks && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="font-bold text-blue-900 mb-3">Acceptance Checks</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={checks.tosAccepted ? 'text-green-600' : 'text-red-600'}>
                {checks.tosAccepted ? '✓' : '✗'}
              </span>
              <span>hasAcceptedCurrentToS: <strong>{checks.tosAccepted ? 'true' : 'false'}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className={checks.privacyAccepted ? 'text-green-600' : 'text-red-600'}>
                {checks.privacyAccepted ? '✓' : '✗'}
              </span>
              <span>hasAcceptedCurrentPrivacy: <strong>{checks.privacyAccepted ? 'true' : 'false'}</strong></span>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-blue-200">
              <span className={checks.bothAccepted ? 'text-green-600 text-lg' : 'text-red-600 text-lg'}>
                {checks.bothAccepted ? '✓' : '✗'}
              </span>
              <span className="text-lg font-bold">Both Accepted: <strong>{checks.bothAccepted ? 'YES' : 'NO'}</strong></span>
            </div>
          </div>
        </div>
      )}

      {consent && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Raw Consent Data from Firestore</h2>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-bold mb-2">tosConsent</h3>
            <div className="font-mono text-sm whitespace-pre-wrap break-words">
              {consent?.tosConsent ? JSON.stringify(consent.tosConsent, null, 2) : 'null'}
            </div>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-bold mb-2">privacyConsent</h3>
            <div className="font-mono text-sm whitespace-pre-wrap break-words">
              {consent?.privacyConsent ? JSON.stringify(consent.privacyConsent, null, 2) : 'null'}
            </div>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-bold mb-2">needsTermsUpdate</h3>
            <div className="font-mono text-sm">
              {consent?.needsTermsUpdate === undefined ? 'undefined' : String(consent?.needsTermsUpdate)}
            </div>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-bold mb-2">Expected Values</h3>
            <div className="space-y-1 text-sm">
              <div>ToS version should be: <strong>{LEGAL_VERSIONS.TERMS_OF_SERVICE}</strong></div>
              <div>Privacy version should be: <strong>{LEGAL_VERSIONS.PRIVACY_POLICY}</strong></div>
              <div>needsTermsUpdate should be: <strong>false</strong></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

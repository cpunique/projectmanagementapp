'use client';

import { useState } from 'react';
import Link from 'next/link';
import { recordToSAcceptance, recordPrivacyAcceptance } from '@/lib/firebase/legal';
import { LEGAL_VERSIONS } from '@/types/legal';

interface ToSGateModalProps {
  userId: string;
  onAccepted: () => void;
  onDeclined: () => void;
}

/**
 * Modal that blocks access to the app until user accepts ToS and Privacy Policy
 * This enforces legal compliance for existing users and those who signed in via OAuth
 */
export default function ToSGateModal({ userId, onAccepted, onDeclined }: ToSGateModalProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAccept = async () => {
    if (!termsAccepted || !privacyAccepted) {
      setError('You must accept both the Terms of Service and Privacy Policy to continue');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Record both acceptances
      await Promise.all([
        recordToSAcceptance(userId),
        recordPrivacyAcceptance(userId)
      ]);

      onAccepted();
    } catch (err) {
      console.error('Error recording legal consent:', err);
      setError('Failed to record your consent. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleDecline = () => {
    if (confirm('You must accept the Terms of Service and Privacy Policy to use this application. Declining will sign you out.')) {
      onDeclined();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Terms of Service Update Required
          </h2>

          <p className="text-gray-700 mb-4">
            Before you can continue using our service, you must review and accept our updated Terms of Service and Privacy Policy.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">What's New</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Updated AI usage policy for Anthropic Claude integration</li>
              <li>Enhanced data privacy protections (GDPR/CCPA compliant)</li>
              <li>Clarified user content ownership and licensing</li>
              <li>Updated cookie and tracking disclosures</li>
            </ul>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start">
              <input
                type="checkbox"
                id="terms-gate"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                disabled={isSubmitting}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="terms-gate" className="ml-3 text-sm text-gray-700">
                I have read and agree to the{' '}
                <Link
                  href="/legal/terms"
                  target="_blank"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Terms of Service
                </Link>{' '}
                (Version {LEGAL_VERSIONS.TERMS_OF_SERVICE})
              </label>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                id="privacy-gate"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                disabled={isSubmitting}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="privacy-gate" className="ml-3 text-sm text-gray-700">
                I have read and agree to the{' '}
                <Link
                  href="/legal/privacy"
                  target="_blank"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Privacy Policy
                </Link>{' '}
                (Version {LEGAL_VERSIONS.PRIVACY_POLICY})
              </label>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleAccept}
              disabled={isSubmitting || !termsAccepted || !privacyAccepted}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Processing...' : 'Accept and Continue'}
            </button>

            <button
              onClick={handleDecline}
              disabled={isSubmitting}
              className="flex-1 bg-white text-gray-700 py-3 px-4 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Decline and Sign Out
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center">
            By accepting, you agree that your acceptance will be recorded with a timestamp and IP address for legal compliance purposes.
          </p>
        </div>
      </div>
    </div>
  );
}

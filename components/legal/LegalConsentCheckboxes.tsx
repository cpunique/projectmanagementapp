'use client';

import { useState } from 'react';
import { LEGAL_DOCUMENTS } from '@/types/legal';

interface LegalConsentCheckboxesProps {
  onConsentChange: (consents: {
    termsAccepted: boolean;
    privacyAccepted: boolean;
  }) => void;
  disabled?: boolean;
}

export default function LegalConsentCheckboxes({
  onConsentChange,
  disabled = false,
}: LegalConsentCheckboxesProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const handleTermsChange = (accepted: boolean) => {
    setTermsAccepted(accepted);
    onConsentChange({ termsAccepted: accepted, privacyAccepted });
  };

  const handlePrivacyChange = (accepted: boolean) => {
    setPrivacyAccepted(accepted);
    onConsentChange({ termsAccepted, privacyAccepted: accepted });
  };

  const termsDoc = LEGAL_DOCUMENTS.find(doc => doc.type === 'TERMS_OF_SERVICE');
  const privacyDoc = LEGAL_DOCUMENTS.find(doc => doc.type === 'PRIVACY_POLICY');

  return (
    <div className="space-y-3">
      {/* Terms of Service Checkbox */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => handleTermsChange(e.target.checked)}
          disabled={disabled}
          className="mt-1 w-4 h-4 text-purple-600 border-gray-300 dark:border-gray-600 rounded focus:ring-purple-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
          required
        />
        <span className="text-sm text-gray-700 dark:text-gray-300 select-none">
          I agree to the{' '}
          <a
            href={termsDoc?.path}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            Terms of Service
          </a>
          {' '}(v{termsDoc?.version})
        </span>
      </label>

      {/* Privacy Policy Checkbox */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={privacyAccepted}
          onChange={(e) => handlePrivacyChange(e.target.checked)}
          disabled={disabled}
          className="mt-1 w-4 h-4 text-purple-600 border-gray-300 dark:border-gray-600 rounded focus:ring-purple-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
          required
        />
        <span className="text-sm text-gray-700 dark:text-gray-300 select-none">
          I agree to the{' '}
          <a
            href={privacyDoc?.path}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            Privacy Policy
          </a>
          {' '}(v{privacyDoc?.version})
        </span>
      </label>

      {/* Additional Notice */}
      <p className="text-xs text-gray-600 dark:text-gray-400 pl-7">
        By creating an account, you also acknowledge our{' '}
        <a
          href="/legal/ai-usage"
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 dark:text-purple-400 hover:underline"
        >
          AI Usage Policy
        </a>
        {' '}and{' '}
        <a
          href="/legal/cookies"
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 dark:text-purple-400 hover:underline"
        >
          Cookie Policy
        </a>.
      </p>
    </div>
  );
}

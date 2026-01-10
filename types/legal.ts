/**
 * Legal Consent & Terms of Service Types
 *
 * These types define the structure for tracking user consent to legal documents
 * including Terms of Service, Privacy Policy, and other legal agreements.
 */

/**
 * Current version numbers for legal documents
 * Update these when legal documents are modified
 */
export const LEGAL_VERSIONS = {
  TERMS_OF_SERVICE: 'v1.0.0',
  PRIVACY_POLICY: 'v1.0.0',
  COOKIE_POLICY: 'v1.0.0',
  AI_USAGE_POLICY: 'v1.0.0',
} as const;

/**
 * Last updated dates for legal documents (ISO 8601 format)
 */
export const LEGAL_LAST_UPDATED = {
  TERMS_OF_SERVICE: '2026-01-04',
  PRIVACY_POLICY: '2026-01-04',
  COOKIE_POLICY: '2026-01-04',
  AI_USAGE_POLICY: '2026-01-04',
} as const;

/**
 * Individual consent record for a specific legal document
 */
export interface ConsentRecord {
  /** Version of the document that was accepted */
  version: string;
  /** ISO timestamp when user accepted */
  acceptedAt: string;
  /** IP address at time of acceptance (for dispute resolution) */
  ipAddress?: string;
  /** Method of acceptance (checkbox, click-through, etc.) */
  method: 'checkbox' | 'button' | 'implicit';
}

/**
 * Cookie consent preferences (GDPR requirement)
 */
export interface CookieConsent {
  /** Always required for site functionality */
  necessary: boolean;
  /** Google Analytics, usage tracking */
  analytics: boolean;
  /** Marketing and advertising cookies */
  marketing: boolean;
  /** When preferences were last updated */
  lastUpdated: string;
}

/**
 * Complete legal consent data stored in user document
 * This extends the base User type from Firestore
 */
export interface UserLegalConsent {
  /** Terms of Service acceptance */
  tosConsent?: ConsentRecord;

  /** Privacy Policy acceptance */
  privacyConsent?: ConsentRecord;

  /** Cookie Policy acceptance (EU users) */
  cookieConsent?: CookieConsent;

  /** AI Usage Policy acceptance */
  aiUsageConsent?: ConsentRecord;

  /** GDPR-specific consents */
  gdpr?: {
    /** Consent for data processing beyond essential operations */
    dataProcessing: boolean;
    /** Consent for marketing communications */
    marketing: boolean;
    /** Consent for profiling/analytics */
    profiling: boolean;
    /** When GDPR consents were last updated */
    lastUpdated: string;
  };

  /** CCPA-specific opt-outs (California users) */
  ccpa?: {
    /** User has opted out of data sale */
    doNotSell: boolean;
    /** When CCPA preference was set */
    lastUpdated: string;
  };

  /** Whether user has been shown updated terms and needs to re-accept */
  needsTermsUpdate?: boolean;
}

/**
 * Firestore user document structure (extends UserLegalConsent)
 */
export interface UserDocument extends UserLegalConsent {
  /** User's UID from Firebase Auth */
  uid: string;

  /** User's email */
  email: string;

  /** When the user account was created */
  createdAt: string;

  /** Last time user document was updated */
  updatedAt: string;

  /** User's default board preference */
  defaultBoardId?: string | null;

  /** UI preferences */
  dueDatePanelOpen?: boolean;
}

/**
 * Helper type for creating new consent records
 */
export type CreateConsentRecord = Omit<ConsentRecord, 'acceptedAt'> & {
  acceptedAt?: string;
};

/**
 * Legal document metadata
 */
export interface LegalDocument {
  /** Document type identifier */
  type: keyof typeof LEGAL_VERSIONS;
  /** Current version */
  version: string;
  /** Last updated date */
  lastUpdated: string;
  /** Path to the document */
  path: string;
  /** Display name */
  name: string;
}

/**
 * Available legal documents
 */
export const LEGAL_DOCUMENTS: readonly LegalDocument[] = [
  {
    type: 'TERMS_OF_SERVICE',
    version: LEGAL_VERSIONS.TERMS_OF_SERVICE,
    lastUpdated: LEGAL_LAST_UPDATED.TERMS_OF_SERVICE,
    path: '/legal/terms',
    name: 'Terms of Service',
  },
  {
    type: 'PRIVACY_POLICY',
    version: LEGAL_VERSIONS.PRIVACY_POLICY,
    lastUpdated: LEGAL_LAST_UPDATED.PRIVACY_POLICY,
    path: '/legal/privacy',
    name: 'Privacy Policy',
  },
  {
    type: 'COOKIE_POLICY',
    version: LEGAL_VERSIONS.COOKIE_POLICY,
    lastUpdated: LEGAL_LAST_UPDATED.COOKIE_POLICY,
    path: '/legal/cookies',
    name: 'Cookie Policy',
  },
  {
    type: 'AI_USAGE_POLICY',
    version: LEGAL_VERSIONS.AI_USAGE_POLICY,
    lastUpdated: LEGAL_LAST_UPDATED.AI_USAGE_POLICY,
    path: '/legal/ai-usage',
    name: 'AI Usage Policy',
  },
] as const;

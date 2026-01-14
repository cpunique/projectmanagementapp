/**
 * Firestore operations for legal consent tracking
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getDb } from './config';
import type {
  UserLegalConsent,
  UserDocument,
  ConsentRecord,
  CookieConsent,
  CreateConsentRecord,
} from '@/types/legal';
import { LEGAL_VERSIONS } from '@/types/legal';

/**
 * Get users collection reference
 */
const getUsersCollection = () => {
  const db = getDb();
  return doc(db, 'users', '{userId}').parent;
};

/**
 * Get user document reference
 */
const getUserDoc = (userId: string) => {
  const db = getDb();
  return doc(db, 'users', userId);
};

/**
 * Create a new consent record with current timestamp
 */
export function createConsentRecord(
  version: string,
  method: 'checkbox' | 'button' | 'implicit' = 'checkbox',
  ipAddress?: string
): ConsentRecord {
  const record: ConsentRecord = {
    version,
    acceptedAt: new Date().toISOString(),
    method,
  };

  // Only include ipAddress if it was successfully fetched
  // Firestore doesn't allow undefined values
  if (ipAddress) {
    record.ipAddress = ipAddress;
  }

  return record;
}

/**
 * Get user's IP address (client-side approximation)
 * In production, this should be captured server-side via API route
 *
 * TEMPORARILY DISABLED: Causing CSP issues with api.ipify.org
 * TODO: Implement server-side IP capture via API route
 */
async function getUserIpAddress(): Promise<string | undefined> {
  // Temporarily disabled due to CSP caching issues
  // Will implement proper server-side IP capture later
  console.log('[IP] ✅ NEW CODE: IP fetching disabled - returning undefined');
  return undefined;
}

/**
 * Initialize user legal consent data on first sign-up
 * Call this immediately after user account creation
 */
export async function initializeUserLegalConsent(
  userId: string,
  email: string,
  acceptedToS: boolean = false,
  acceptedPrivacy: boolean = false
): Promise<void> {
  const userRef = getUserDoc(userId);
  const ipAddress = await getUserIpAddress();

  const now = new Date().toISOString();

  const userData: Partial<UserDocument> = {
    uid: userId,
    email,
    createdAt: now,
    updatedAt: now,
  };

  // If user accepted ToS and Privacy during signup, record it
  if (acceptedToS) {
    userData.tosConsent = createConsentRecord(
      LEGAL_VERSIONS.TERMS_OF_SERVICE,
      'checkbox',
      ipAddress
    );
  }

  if (acceptedPrivacy) {
    userData.privacyConsent = createConsentRecord(
      LEGAL_VERSIONS.PRIVACY_POLICY,
      'checkbox',
      ipAddress
    );
  }

  // Initialize cookie consent with necessary cookies only
  userData.cookieConsent = {
    necessary: true,
    analytics: false,
    marketing: false,
    lastUpdated: now,
  };

  // Set needsTermsUpdate to false if both ToS and Privacy were accepted
  // This ensures new users don't see the update modal on first login
  userData.needsTermsUpdate = !(acceptedToS && acceptedPrivacy);

  try {
    await setDoc(userRef, userData, { merge: true });
    console.log('[Legal] ✅ Initialized legal consent for new user:', userId);
  } catch (error) {
    console.error('[Legal] ❌ Failed to initialize user legal consent:', error);
    throw error;
  }
}

/**
 * Record user's acceptance of Terms of Service
 */
export async function recordToSAcceptance(
  userId: string,
  method: 'checkbox' | 'button' | 'implicit' = 'checkbox'
): Promise<void> {
  const userRef = getUserDoc(userId);

  console.log('[recordToS] ✅ CREATING CONSENT RECORD (no IP)');
  const consent = createConsentRecord(
    LEGAL_VERSIONS.TERMS_OF_SERVICE,
    method,
    undefined // Skip IP address entirely due to caching issues
  );

  console.log('[recordToS] Consent object:', consent);

  try {
    // Use setDoc with merge to create document if it doesn't exist
    await setDoc(userRef, {
      tosConsent: consent,
      needsTermsUpdate: false,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log('[recordToS] ✅ Successfully saved to Firestore');
  } catch (error) {
    console.error('[recordToS] ❌ Failed to record ToS acceptance:', error);
    throw error;
  }
}

/**
 * Record user's acceptance of Privacy Policy
 */
export async function recordPrivacyAcceptance(
  userId: string,
  method: 'checkbox' | 'button' | 'implicit' = 'checkbox'
): Promise<void> {
  const userRef = getUserDoc(userId);

  console.log('[recordPrivacy] ✅ CREATING CONSENT RECORD (no IP)');
  const consent = createConsentRecord(
    LEGAL_VERSIONS.PRIVACY_POLICY,
    method,
    undefined // Skip IP address entirely due to caching issues
  );

  console.log('[recordPrivacy] Consent object:', consent);

  try {
    // Use setDoc with merge to create document if it doesn't exist
    await setDoc(userRef, {
      privacyConsent: consent,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log('[recordPrivacy] ✅ Successfully saved to Firestore');
  } catch (error) {
    console.error('[recordPrivacy] ❌ Failed to record privacy acceptance:', error);
    throw error;
  }
}

/**
 * Update user's cookie consent preferences
 */
export async function updateCookieConsent(
  userId: string,
  consent: Omit<CookieConsent, 'lastUpdated'>
): Promise<void> {
  const userRef = getUserDoc(userId);

  const cookieConsent: CookieConsent = {
    ...consent,
    necessary: true, // Always true
    lastUpdated: new Date().toISOString(),
  };

  try {
    await setDoc(userRef, {
      cookieConsent,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.error('Failed to update cookie consent:', error);
    throw error;
  }
}

/**
 * Record user's acceptance of AI Usage Policy
 */
export async function recordAIUsageAcceptance(
  userId: string,
  method: 'checkbox' | 'button' | 'implicit' = 'checkbox'
): Promise<void> {
  const userRef = getUserDoc(userId);
  const ipAddress = await getUserIpAddress();

  const consent = createConsentRecord(
    LEGAL_VERSIONS.AI_USAGE_POLICY,
    method,
    ipAddress
  );

  try {
    await setDoc(userRef, {
      aiUsageConsent: consent,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.error('Failed to record AI usage acceptance:', error);
    throw error;
  }
}

/**
 * Update GDPR-specific consents
 */
export async function updateGDPRConsent(
  userId: string,
  consents: {
    dataProcessing: boolean;
    marketing: boolean;
    profiling: boolean;
  }
): Promise<void> {
  const userRef = getUserDoc(userId);

  try {
    await setDoc(userRef, {
      gdpr: {
        ...consents,
        lastUpdated: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.error('Failed to update GDPR consent:', error);
    throw error;
  }
}

/**
 * Set CCPA "Do Not Sell" preference
 */
export async function setCCPADoNotSell(
  userId: string,
  doNotSell: boolean
): Promise<void> {
  const userRef = getUserDoc(userId);

  try {
    await setDoc(userRef, {
      ccpa: {
        doNotSell,
        lastUpdated: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.error('Failed to set CCPA preference:', error);
    throw error;
  }
}

/**
 * Get user's legal consent data
 */
export async function getUserLegalConsent(
  userId: string
): Promise<UserLegalConsent | null> {
  const userRef = getUserDoc(userId);

  try {
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.warn(`[Legal] User document does not exist for user: ${userId}`);
      return null;
    }

    const data = userSnap.data();
    const consent: UserLegalConsent = {
      tosConsent: data.tosConsent,
      privacyConsent: data.privacyConsent,
      cookieConsent: data.cookieConsent,
      aiUsageConsent: data.aiUsageConsent,
      gdpr: data.gdpr,
      ccpa: data.ccpa,
      needsTermsUpdate: data.needsTermsUpdate,
    };

    console.log(`[Legal] Retrieved consent for user ${userId}:`, {
      hasToS: !!data.tosConsent,
      tosVersion: data.tosConsent?.version,
      hasPrivacy: !!data.privacyConsent,
      privacyVersion: data.privacyConsent?.version,
      needsUpdate: data.needsTermsUpdate,
    });

    return consent;
  } catch (error) {
    console.error('Failed to get user legal consent:', error);
    return null;
  }
}

/**
 * Check if user has accepted current version of ToS
 */
export async function hasAcceptedCurrentToS(userId: string): Promise<boolean> {
  const consent = await getUserLegalConsent(userId);
  const accepted =
    consent?.tosConsent?.version === LEGAL_VERSIONS.TERMS_OF_SERVICE &&
    !consent?.needsTermsUpdate;

  console.log(`[Legal] hasAcceptedCurrentToS for ${userId}:`, {
    accepted,
    hasConsent: !!consent,
    tosExists: !!consent?.tosConsent,
    version: consent?.tosConsent?.version,
    expectedVersion: LEGAL_VERSIONS.TERMS_OF_SERVICE,
    needsUpdate: consent?.needsTermsUpdate,
  });

  return accepted;
}

/**
 * Check if user has accepted current version of Privacy Policy
 */
export async function hasAcceptedCurrentPrivacy(
  userId: string
): Promise<boolean> {
  const consent = await getUserLegalConsent(userId);
  const accepted = consent?.privacyConsent?.version === LEGAL_VERSIONS.PRIVACY_POLICY;

  console.log(`[Legal] hasAcceptedCurrentPrivacy for ${userId}:`, {
    accepted,
    hasConsent: !!consent,
    privacyExists: !!consent?.privacyConsent,
    version: consent?.privacyConsent?.version,
    expectedVersion: LEGAL_VERSIONS.PRIVACY_POLICY,
  });

  return accepted;
}

/**
 * Mark that user needs to accept updated terms
 * Call this when you update legal documents
 */
export async function flagUserForTermsUpdate(userId: string): Promise<void> {
  const userRef = getUserDoc(userId);

  try {
    await setDoc(userRef, {
      needsTermsUpdate: true,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.error('Failed to flag user for terms update:', error);
    throw error;
  }
}

/**
 * Bulk flag all users for terms update (run when you update ToS/Privacy)
 * WARNING: This should be run server-side, not client-side
 * Included here for reference - implement in Cloud Functions or admin SDK
 */
export async function flagAllUsersForTermsUpdate(): Promise<void> {
  throw new Error(
    'flagAllUsersForTermsUpdate must be implemented server-side with Admin SDK'
  );
  // Implementation would use Admin SDK to batch update all user documents
  // const usersRef = admin.firestore().collection('users');
  // const batch = admin.firestore().batch();
  // const users = await usersRef.get();
  // users.docs.forEach(doc => {
  //   batch.update(doc.ref, { needsTermsUpdate: true });
  // });
  // await batch.commit();
}

/**
 * Restore missing ToS/Privacy consent records for a user
 * Use this to fix accounts that have incomplete legal consent data
 */
export async function restoreMissingConsent(userId: string): Promise<void> {
  const userRef = getUserDoc(userId);
  const ipAddress = await getUserIpAddress();

  try {
    console.log('[Legal] Restoring missing consent records for user:', userId);

    // Create new consent records with current timestamp
    const tosConsent = createConsentRecord(
      LEGAL_VERSIONS.TERMS_OF_SERVICE,
      'checkbox', // Use checkbox method for explicit restoration
      ipAddress
    );

    const privacyConsent = createConsentRecord(
      LEGAL_VERSIONS.PRIVACY_POLICY,
      'checkbox', // Use checkbox method for explicit restoration
      ipAddress
    );

    // Update user document with missing consent records
    // Also set needsTermsUpdate to false to mark that user doesn't need to re-accept
    await setDoc(userRef, {
      tosConsent,
      privacyConsent,
      needsTermsUpdate: false,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    console.log('[Legal] ✅ Successfully restored consent records for user:', userId);
    console.log('[Legal] Restored data:', {
      tosVersion: tosConsent.version,
      privacyVersion: privacyConsent.version,
      needsTermsUpdate: false,
      acceptedAt: tosConsent.acceptedAt,
    });

    // Give Firestore a moment to ensure the write is complete
    // This helps prevent issues with cache inconsistency
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (error) {
    console.error('[Legal] ❌ Failed to restore consent records:', error);
    throw error;
  }
}

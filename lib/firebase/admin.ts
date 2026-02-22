/**
 * Firebase Admin SDK initialization.
 * Used for server-side operations that require admin privileges,
 * e.g. looking up any user by email for board sharing.
 *
 * Requires the FIREBASE_SERVICE_ACCOUNT_KEY environment variable:
 *   1. Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   2. Copy the entire JSON content and paste it as FIREBASE_SERVICE_ACCOUNT_KEY in Vercel / .env.local
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function initAdmin() {
  if (getApps().length > 0) return;

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
  }

  const serviceAccount = JSON.parse(serviceAccountKey);
  initializeApp({ credential: cert(serviceAccount) });
}

export function getAdminAuth() {
  initAdmin();
  return getAuth();
}

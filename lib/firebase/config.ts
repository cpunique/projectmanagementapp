'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, terminate } from 'firebase/firestore';
import { getAuth as getFirebaseAuth } from 'firebase/auth';

// Only initialize if we're in a browser environment with required env vars
const isValidConfig = () => {
  const hasApiKey = typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!hasApiKey && typeof window !== 'undefined') {
    console.error('Firebase config missing API key. Available env vars:', {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'present' : 'MISSING',
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'present' : 'MISSING',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'present' : 'MISSING',
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? 'present' : 'MISSING',
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? 'present' : 'MISSING',
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? 'present' : 'MISSING',
    });
  }
  return hasApiKey;
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

// Lazy initialization - only initialize when actually needed on client
let app: any = null;
let db: any = null;
let auth: any = null;

const initializeFirebase = () => {
  if (app) return { app, db, auth };

  if (!isValidConfig()) {
    throw new Error('Firebase configuration is missing or invalid. Check your .env.local file.');
  }

  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    auth = getFirebaseAuth(app);
    // Note: Not enabling enableIndexedDbPersistence() as it causes conflicts with multiple tabs
    // The Firebase SDK handles caching automatically without explicit persistence
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw error;
  }

  return { app, db, auth };
};

export const getApp = () => initializeFirebase().app;
export const getDb = () => initializeFirebase().db;
export const getAuth = () => initializeFirebase().auth;

/**
 * Terminate the current Firestore instance and reinitialize a fresh one.
 * Called when the Firestore SDK enters a permanently failed state due to
 * an internal assertion failure (ID: b815/ca9) — a known SDK v12 bug.
 * After reinitialization, all subsequent getDb() calls return the fresh instance.
 */
export async function reinitializeDb(): Promise<void> {
  if (!db) return;
  const oldDb = db;
  db = null; // Clear immediately so concurrent getDb() calls create a fresh instance
  try {
    await terminate(oldDb);
  } catch (_) {
    // Ignore — the instance was already in a failed state, terminate may throw too
  }
  // Re-create a fresh Firestore instance on the same app
  try {
    if (app) {
      db = getFirestore(app);
      console.log('[Firebase] Firestore instance reinitialized after SDK internal failure');
    }
  } catch (e) {
    console.error('[Firebase] Failed to reinitialize Firestore instance:', e);
  }
}

'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth as getFirebaseAuth } from 'firebase/auth';
import { getAnalytics, Analytics } from 'firebase/analytics';

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
let analytics: Analytics | null = null;

const initializeFirebase = () => {
  if (app) return { app, db, auth, analytics };

  if (!isValidConfig()) {
    throw new Error('Firebase configuration is missing or invalid. Check your .env.local file.');
  }

  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    auth = getFirebaseAuth(app);

    // Initialize Analytics only in browser (not during SSR)
    if (typeof window !== 'undefined') {
      analytics = getAnalytics(app);
    }
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw error;
  }

  return { app, db, auth, analytics };
};

export const getApp = () => initializeFirebase().app;
export const getDb = () => initializeFirebase().db;
export const getAuth = () => initializeFirebase().auth;
export const getFirebaseAnalytics = () => initializeFirebase().analytics;

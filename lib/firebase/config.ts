'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth as getFirebaseAuth } from 'firebase/auth';

// Only initialize if we're in a browser environment with required env vars
const isValidConfig = () => {
  return typeof window !== 'undefined' && process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
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
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw error;
  }

  return { app, db, auth };
};

export const getApp = () => initializeFirebase().app;
export const getDb = () => initializeFirebase().db;
export const getAuth = () => initializeFirebase().auth;

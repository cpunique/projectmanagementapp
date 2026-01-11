'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import * as Sentry from '@sentry/nextjs';
import { getAuth } from './config';
import { initializeUserLegalConsent, hasAcceptedCurrentToS, hasAcceptedCurrentPrivacy } from './legal';
import { trackSignup, setAnalyticsUserProperties } from './analytics';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  requiresToSAcceptance: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  markToSAccepted: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresToSAcceptance, setRequiresToSAcceptance] = useState(false);

  useEffect(() => {
    const auth = getAuth();

    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      // Check if user needs to accept ToS/Privacy
      if (user) {
        try {
          const [hasToS, hasPrivacy] = await Promise.all([
            hasAcceptedCurrentToS(user.uid),
            hasAcceptedCurrentPrivacy(user.uid)
          ]);

          // Require acceptance if either is missing
          setRequiresToSAcceptance(!hasToS || !hasPrivacy);

          // Set Sentry user context for error tracking
          Sentry.setUser({
            id: user.uid,
            email: user.email || undefined,
            username: user.displayName || undefined,
          });
        } catch (err) {
          console.error('Error checking ToS acceptance:', err);
          // If we can't check, require acceptance to be safe
          setRequiresToSAcceptance(true);

          // Still set Sentry user context even if ToS check fails
          Sentry.setUser({
            id: user.uid,
            email: user.email || undefined,
          });
        }
      } else {
        setRequiresToSAcceptance(false);
        // Clear Sentry user context on sign out
        Sentry.setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in';
      setError(errorMessage);
      throw err;
    }
  };

  const signUp = async (email: string, password: string) => {
    setError(null);
    try {
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Initialize legal consent in Firestore
      await initializeUserLegalConsent(
        userCredential.user.uid,
        email,
        true, // User accepted ToS during signup
        true  // User accepted Privacy Policy during signup
      );

      // Track signup event in Analytics
      trackSignup('email');
      setAnalyticsUserProperties(userCredential.user.uid, {
        signup_method: 'email',
        account_created: new Date().toISOString(),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account';
      setError(errorMessage);
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();

      // Force account selection - allows user to choose which Google account
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await signInWithPopup(auth, provider);

      // Check if this is a new user and initialize consent
      // Note: For Google sign-in, we assume consent by using the service
      // In production, you may want to show a consent modal for first-time Google users
      const additionalUserInfo = result.user.metadata;
      const isNewUser = additionalUserInfo.creationTime === additionalUserInfo.lastSignInTime;

      if (isNewUser && result.user.email) {
        await initializeUserLegalConsent(
          result.user.uid,
          result.user.email,
          true, // Implicit consent by using Google sign-in
          true  // Implicit consent by using Google sign-in
        );

        // Track signup event for new Google users
        trackSignup('google');
        setAnalyticsUserProperties(result.user.uid, {
          signup_method: 'google',
          account_created: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      console.error('[Auth] ❌ Google Sign-In error:', err);
      console.error('[Auth] Error code:', err.code);
      console.error('[Auth] Error message:', err.message);
      console.error('[Auth] Full error:', JSON.stringify(err, null, 2));

      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in with Google';
      setError(errorMessage);
      throw err;
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      const auth = getAuth();
      await firebaseSignOut(auth);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign out';
      setError(errorMessage);
      throw err;
    }
  };

  const markToSAccepted = () => {
    setRequiresToSAcceptance(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      requiresToSAcceptance,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      markToSAccepted,
      error
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

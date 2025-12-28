'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { getAuth } from './config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();

    // Handle redirect result (will be null if not coming from redirect)
    console.log('[Auth] Initializing auth, checking for redirect...');
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          console.log('[Auth] ✅ Google Sign-In redirect successful:', result.user.email);
          console.log('[Auth] User ID:', result.user.uid);
        } else {
          console.log('[Auth] No redirect result (normal page load)');
        }
      })
      .catch((error) => {
        console.error('[Auth] ❌ Redirect error:', error);
        console.error('[Auth] Error code:', error.code);
        console.error('[Auth] Error message:', error.message);

        // Check for common errors
        if (error.code === 'auth/unauthorized-domain') {
          console.error('[Auth] ⚠️ UNAUTHORIZED DOMAIN - Add this domain to Firebase Console:');
          console.error('[Auth] Domain:', window.location.hostname);
          setError(`Unauthorized domain: ${window.location.hostname}. Please add this domain to Firebase Console.`);
        } else if (error.code === 'auth/operation-not-allowed') {
          console.error('[Auth] ⚠️ Google Sign-In not enabled in Firebase Console');
          setError('Google Sign-In is not enabled. Please enable it in Firebase Console.');
        } else {
          setError(error.message || 'Failed to sign in with Google');
        }
      });

    // Always set up auth state listener - it will pick up the authenticated user
    // whether from redirect or existing session
    console.log('[Auth] Setting up auth state listener...');
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('[Auth] Auth state changed:', user?.email || 'no user');
      if (user) {
        console.log('[Auth] ✅ User authenticated:', user.email);
        console.log('[Auth] User ID:', user.uid);
      }
      setUser(user);
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
      await createUserWithEmailAndPassword(auth, email, password);
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

      // Use redirect instead of popup for better multi-account handling
      // User will be redirected to Google, select account, then redirected back
      await signInWithRedirect(auth, provider);
    } catch (err) {
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

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut, error }}>
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

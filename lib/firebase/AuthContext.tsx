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
    const initAuth = async () => {
      try {
        const auth = getAuth();

        // First, check for redirect result from Google Sign-In
        console.log('[Auth] Checking for redirect result...');
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('[Auth] Google Sign-In redirect successful:', result.user.email);
          setUser(result.user);
          setLoading(false);
          return;
        }
        console.log('[Auth] No redirect result found');

        // Set up auth state listener
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          console.log('[Auth] Auth state changed:', user?.email || 'no user');
          setUser(user);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error: any) {
        console.error('[Auth] Failed to initialize auth:', error);
        setError(error.message || 'Firebase is not properly configured');
        setLoading(false);
      }
    };

    initAuth();
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

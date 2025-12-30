'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';

type AuthMode = 'login' | 'signup';

export default function AuthForm() {
  const { signIn, signUp, signInWithGoogle, error } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleEmailAuth = async () => {
    setLocalError(null);
    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setLocalError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Google sign-in failed';
      setLocalError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-2 border-gray-200 dark:border-gray-700 mb-8">
      {/* Tab Switcher */}
      <div className="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg">
        <button
          onClick={() => {
            setMode('signup');
            setLocalError(null);
          }}
          className={`flex-1 py-2 rounded-md font-medium transition-all ${
            mode === 'signup'
              ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          Sign Up
        </button>
        <button
          onClick={() => {
            setMode('login');
            setLocalError(null);
          }}
          className={`flex-1 py-2 rounded-md font-medium transition-all ${
            mode === 'login'
              ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          Sign In
        </button>
      </div>

      {/* Email Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          disabled={loading}
          className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        />
      </div>

      {/* Password Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleEmailAuth();
            }
          }}
          className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        />
      </div>

      {/* Error Message */}
      {displayError && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <p className="text-red-800 dark:text-red-200 text-sm">{displayError}</p>
        </div>
      )}

      {/* Email/Password Button */}
      <button
        onClick={handleEmailAuth}
        disabled={loading}
        className="w-full px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-colors duration-200 font-medium shadow-sm hover:shadow-md disabled:cursor-not-allowed mb-4"
      >
        {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-4 my-4">
        <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
        <span className="text-sm text-gray-500 dark:text-gray-400">or</span>
        <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
      </div>

      {/* Google Sign-In Button */}
      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full px-6 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center justify-center gap-2 mb-4"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continue with Google
      </button>
    </div>
  );
}

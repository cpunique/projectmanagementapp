'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import LegalConsentCheckboxes from '@/components/legal/LegalConsentCheckboxes';

type AuthMode = 'login' | 'signup';

export default function AuthForm() {
  const { signIn, signUp, signInWithGoogle, error } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [legalConsents, setLegalConsents] = useState({
    termsAccepted: false,
    privacyAccepted: false,
  });

  const handleEmailAuth = async () => {
    setLocalError(null);
    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    // Check legal consents for sign-up
    if (mode === 'signup') {
      if (!legalConsents.termsAccepted || !legalConsents.privacyAccepted) {
        setLocalError('You must accept the Terms of Service and Privacy Policy to create an account');
        return;
      }
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
    <div
      className="p-6 mb-8"
      style={{
        background: 'rgba(42, 37, 34, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.09)',
        borderRadius: '18px',
        backdropFilter: 'blur(24px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Tab Switcher */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        background: 'var(--surface-2)',
        padding: '3px',
        borderRadius: '11px',
        border: '1px solid var(--border)',
      }}>
        <button
          onClick={() => {
            setMode('signup');
            setLocalError(null);
          }}
          style={{
            flex: 1,
            padding: '7px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '500',
            border: 'none',
            cursor: 'pointer',
            background: mode === 'signup' ? 'var(--purple)' : 'transparent',
            color: mode === 'signup' ? '#fff' : 'var(--body)',
            boxShadow: mode === 'signup' ? '0 0 16px var(--glow)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          Sign Up
        </button>
        <button
          onClick={() => {
            setMode('login');
            setLocalError(null);
          }}
          style={{
            flex: 1,
            padding: '7px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '500',
            border: 'none',
            cursor: 'pointer',
            background: mode === 'login' ? 'var(--purple)' : 'transparent',
            color: mode === 'login' ? '#fff' : 'var(--body)',
            boxShadow: mode === 'login' ? '0 0 16px var(--glow)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          Sign In
        </button>
      </div>

      {/* Email Input */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: '500',
          color: 'var(--text)',
          marginBottom: '8px',
        }}>
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid var(--border-2)',
            borderRadius: '10px',
            background: 'rgba(22,20,18,.6)',
            color: 'var(--text)',
            fontSize: '13px',
            fontFamily: 'inherit',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--purple-l)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(147,51,234,.18)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-2)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Password Input */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: '500',
          color: 'var(--text)',
          marginBottom: '8px',
        }}>
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
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid var(--border-2)',
            borderRadius: '10px',
            background: 'rgba(22,20,18,.6)',
            color: 'var(--text)',
            fontSize: '13px',
            fontFamily: 'inherit',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--purple-l)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(147,51,234,.18)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-2)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Error Message */}
      {displayError && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <p className="text-red-800 dark:text-red-200 text-sm">{displayError}</p>
        </div>
      )}

      {/* Legal Consent Checkboxes (Sign Up Only) */}
      {mode === 'signup' && (
        <div className="mb-4">
          <LegalConsentCheckboxes
            onConsentChange={setLegalConsents}
            disabled={loading}
          />
        </div>
      )}

      {/* Email/Password Button */}
      <button
        onClick={handleEmailAuth}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: 'var(--purple)',
          color: '#fff',
          border: 'none',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: '500',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? '0.6' : '1',
          boxShadow: '0 0 24px var(--glow)',
          marginBottom: '16px',
          transition: 'all 0.2s',
        }}
      >
        {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
      </button>

      {/* Divider */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        margin: '16px 0',
      }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,.1)' }}></div>
        <span style={{ fontSize: '12px', color: 'var(--body)' }}>or</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,.1)' }}></div>
      </div>

      {/* Google Sign-In Button */}
      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: '1px solid var(--border-2)',
          borderRadius: '10px',
          background: 'rgba(255,255,255,.05)',
          color: 'var(--text)',
          fontSize: '13px',
          fontWeight: '500',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? '0.6' : '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '16px',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!loading) e.currentTarget.style.background = 'rgba(255,255,255,.08)';
        }}
        onMouseLeave={(e) => {
          if (!loading) e.currentTarget.style.background = 'rgba(255,255,255,.05)';
        }}
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

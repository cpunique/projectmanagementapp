'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/firebase/AuthContext';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'login' | 'signup';

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { signIn, signUp, signInWithGoogle, error } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
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
      onClose();
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
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Google sign-in failed';
      setLocalError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || error;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-md mx-auto">
        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          background: 'rgba(35,31,28,.5)',
          padding: '4px',
          borderRadius: '10px',
        }}>
          <button
            onClick={() => setMode('login')}
            style={{
              flex: 1,
              padding: '8px 16px',
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
          <button
            onClick={() => setMode('signup')}
            style={{
              flex: 1,
              padding: '8px 16px',
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
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Email Input */}
          <div>
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
          <div>
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
          <div style={{
            background: 'rgba(244,63,94,.12)',
            border: '1px solid rgba(251,113,133,.3)',
            borderRadius: '10px',
            padding: '12px',
          }}>
            <p style={{ color: '#fb7185', fontSize: '13px' }}>{displayError}</p>
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
            boxShadow: '0 0 16px var(--glow)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            if (!loading) e.currentTarget.style.opacity = '1';
          }}
        >
          {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
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
      </div>
    </Modal>
  );
}

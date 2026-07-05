'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/firebase/AuthContext';
import { useRouter } from 'next/navigation';
import SettingsNav from '@/components/settings/SettingsNav';

interface TokenMeta {
  label: string;
  createdAt: string;
  expiresAt?: string;
  boardId?: string;
  boardName?: string;
}

type SettingsSection = 'account' | 'appearance' | 'ai-integrations' | 'notifications' | 'subscription' | 'advanced' | 'about-legal';

const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: 'account', label: 'Account' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'ai-integrations', label: 'AI & Integrations' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'subscription', label: 'Subscription' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'about-legal', label: 'About & Legal' },
];

const SectionLoader = () => (
  <div className="flex items-center justify-center py-10">
    <div className="w-5 h-5 rounded-full border-2 border-purple-800 border-t-purple-400 animate-spin" />
  </div>
);

// Lazy-load each section so the initial Settings route chunk is small;
// each section's JS is fetched only when first opened.
const AccountSection = dynamic(() => import('@/components/settings/sections/AccountSection'), { ssr: false, loading: SectionLoader });
const AppearanceSection = dynamic(() => import('@/components/settings/sections/AppearanceSection'), { ssr: false, loading: SectionLoader });
const AIIntegrationsSection = dynamic(() => import('@/components/settings/sections/AIIntegrationsSection'), { ssr: false, loading: SectionLoader });
const NotificationsSection = dynamic(() => import('@/components/settings/sections/NotificationsSection'), { ssr: false, loading: SectionLoader });
const SubscriptionSection = dynamic(() => import('@/components/settings/sections/SubscriptionSection'), { ssr: false, loading: SectionLoader });
const AdvancedSection = dynamic(() => import('@/components/settings/sections/AdvancedSection'), { ssr: false, loading: SectionLoader });
const AboutLegalSection = dynamic(() => import('@/components/settings/sections/AboutLegalSection'), { ssr: false, loading: SectionLoader });

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SettingsSection>('account');

  // Token list — fetched once per Settings session, shared across section switches.
  // tokensLoading starts true so AI & Integrations shows a spinner immediately,
  // never the misleading "No active tokens" empty state while the fetch is in flight.
  const [tokens, setTokens] = useState<TokenMeta[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const initialFetchDone = useRef(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  const fetchTokens = useCallback(async (showLoading: boolean) => {
    if (!user) return;
    if (showLoading) setTokensLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/mcp/tokens', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTokens(data.tokens ?? []);
        if (typeof data.isPro === 'boolean') setIsPro(data.isPro);
      }
    } finally {
      if (showLoading) setTokensLoading(false);
    }
  }, [user]);

  // Fetch once on Settings mount — not repeated on every section switch.
  useEffect(() => {
    if (user && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchTokens(true);
    }
  }, [user, fetchTokens]);

  // Silent refresh (no loading flash) — called after generate/revoke.
  const handleRefreshTokens = useCallback(() => fetchTokens(false), [fetchTokens]);

  if (!user) {
    return (
      <div style={{ padding: '20px', color: 'white' }}>
        <p>Redirecting to login...</p>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'account':
        return <AccountSection />;
      case 'appearance':
        return <AppearanceSection />;
      case 'ai-integrations':
        return (
          <AIIntegrationsSection
            tokens={tokens}
            tokensLoading={tokensLoading}
            onRefreshTokens={handleRefreshTokens}
            isPro={isPro}
            onNavigateTo={(s) => setActiveSection(s as SettingsSection)}
          />
        );
      case 'notifications':
        return <NotificationsSection />;
      case 'subscription':
        return <SubscriptionSection isPro={isPro} />;
      case 'advanced':
        return <AdvancedSection />;
      case 'about-legal':
        return <AboutLegalSection />;
      default:
        return null;
    }
  };

  return (
    <div style={{
      padding: '20px',
      background: 'var(--bg)',
      minHeight: '100vh',
    }}>
      {/* Outer container with max-width */}
      <div style={{
        maxWidth: '1080px',
        margin: '0 auto',
      }}>
        {/* Close button */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => router.back()}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--body)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.12s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-2)';
              e.currentTarget.style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--body)';
            }}
          >
            ← Back
          </button>
        </div>

        <div style={{
          display: 'flex',
          gap: '20px',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: '18px',
          padding: '20px',
          boxShadow: '0 16px 44px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.05)',
          minHeight: '560px',
        }}>
      {/* Left Nav */}
      <SettingsNav
        sections={SECTIONS}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      {/* Right Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {renderSection()}
      </div>
        </div>
      </div>
    </div>
  );
}

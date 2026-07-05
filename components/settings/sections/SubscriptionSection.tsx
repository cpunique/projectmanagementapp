'use client';

import SettingCard from '../SettingCard';

interface SubscriptionSectionProps {
  isPro: boolean | null;
}

export default function SubscriptionSection({ isPro }: SubscriptionSectionProps) {
  if (isPro === null) {
    return (
      <div>
        <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>
          Subscription
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--body)', lineHeight: '1.55', marginBottom: '18px', maxWidth: '560px' }}>
          Manage your plan and billing.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
          <div className="w-5 h-5 rounded-full border-2 border-purple-800 border-t-purple-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>
        Subscription
      </div>
      <div style={{ fontSize: '12.5px', color: 'var(--body)', lineHeight: '1.55', marginBottom: '18px', maxWidth: '560px' }}>
        Manage your plan and billing.
      </div>

      <SettingCard title="Your Plan">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 0' }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '5px 12px',
            borderRadius: '99px',
            background: isPro ? 'rgba(147,51,234,.18)' : 'var(--surface-3)',
            color: isPro ? 'var(--purple-l)' : 'var(--body)',
            border: isPro ? '1px solid rgba(147,51,234,.3)' : '1px solid var(--border-2)',
          }}>
            {isPro ? 'PRO' : 'FREE'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
              {isPro ? 'Pro plan' : 'Free plan'}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>
              {isPro ? 'Unlimited boards · MCP integration · priority support' : '3 boards · unlimited cards'}
            </div>
          </div>
          <button style={{
            padding: '9px 16px',
            borderRadius: '9px',
            border: '1px solid var(--border-2)',
            background: 'transparent',
            color: 'var(--text)',
            fontSize: '12.5px',
            fontWeight: 500,
            cursor: 'default',
            opacity: 0.55,
            fontFamily: 'inherit',
          }}>
            Manage · soon
          </button>
        </div>
      </SettingCard>
    </div>
  );
}

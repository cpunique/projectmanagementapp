'use client';

import SettingCard from '../SettingCard';

export default function SubscriptionSection() {
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
            background: 'var(--surface-3)',
            color: 'var(--body)',
            border: '1px solid var(--border-2)',
          }}>FREE</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>Free plan</div>
            <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>3 boards · unlimited cards</div>
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
          }}>
            Manage · soon
          </button>
        </div>
      </SettingCard>
    </div>
  );
}

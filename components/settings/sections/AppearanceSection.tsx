'use client';

import SettingCard from '../SettingCard';

export default function AppearanceSection() {
  return (
    <div>
      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>
        Appearance
      </div>
      <div style={{ fontSize: '12.5px', color: 'var(--body)', lineHeight: '1.55', marginBottom: '18px', maxWidth: '560px' }}>
        Customize how Kan-do looks on your device.
      </div>

      <SettingCard title="Theme">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 0', borderTop: '1px solid var(--border)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Light mode</div>
            <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '3px' }}>
              Coming soon
            </div>
          </div>
          <button
            disabled
            aria-disabled="true"
            title="Light mode is coming soon"
            style={{
              width: '34px',
              height: '19px',
              borderRadius: '99px',
              background: 'var(--surface-3)',
              border: '1px solid var(--border-2)',
              position: 'relative',
              cursor: 'not-allowed',
              opacity: 0.5,
              flexShrink: 0,
            }}
          >
            <span style={{
              position: 'absolute',
              top: '1px',
              left: '1px',
              width: '15px',
              height: '15px',
              borderRadius: '50%',
              background: 'var(--body)',
            }} />
          </button>
        </div>
      </SettingCard>
    </div>
  );
}

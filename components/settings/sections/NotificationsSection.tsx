'use client';

import SettingCard from '../SettingCard';

export default function NotificationsSection() {
  return (
    <div>
      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>
        Notifications
      </div>
      <div style={{ fontSize: '12.5px', color: 'var(--body)', lineHeight: '1.55', marginBottom: '18px', maxWidth: '560px' }}>
        Choose what notifications you want to receive.
      </div>

      <SettingCard title="Email Notifications">
        <p style={{ fontSize: '12.5px', color: 'var(--body)', padding: '12px 0' }}>
          Coming soon...
        </p>
      </SettingCard>
    </div>
  );
}

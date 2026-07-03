'use client';

import { useAuth } from '@/lib/firebase/AuthContext';
import SettingCard from '../SettingCard';

export default function AccountSection() {
  const { user } = useAuth();

  return (
    <div>
      <div style={{
        fontSize: '16px',
        fontWeight: 600,
        marginBottom: '4px',
        color: 'var(--text)',
      }}>
        Account
      </div>
      <div style={{
        fontSize: '12.5px',
        color: 'var(--body)',
        lineHeight: '1.55',
        marginBottom: '18px',
        maxWidth: '560px',
      }}>
        Manage your account settings and profile information.
      </div>

      <SettingCard title="Profile">
        <SettingRow
          label="Email"
          description="Your account email address"
          value={user?.email || ''}
          disabled
        />
        <SettingRow
          label="Name"
          description="Display name across the app"
          value={user?.displayName || 'User'}
          editable
        />
        <SettingRow
          label="Avatar"
          description="Your profile picture"
          value={user?.photoURL ? 'Set' : 'Not set'}
          action="Change"
        />
      </SettingCard>

      <SettingCard title="Authentication">
        <SettingRow
          label="Password"
          description="Change your account password"
          action="Update"
        />
        <SettingRow
          label="Two-Factor Authentication"
          description="Add extra security to your account"
          action="Enable"
        />
      </SettingCard>
    </div>
  );
}

interface SettingRowProps {
  label: string;
  description?: string;
  value?: string;
  action?: string;
  disabled?: boolean;
  editable?: boolean;
}

function SettingRow({ label, description, value, action, disabled, editable }: SettingRowProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '12px 0',
      borderTop: '1px solid var(--border)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--text)',
        }}>
          {label}
        </div>
        {description && (
          <div style={{
            fontSize: '11.5px',
            color: 'var(--muted)',
            marginTop: '3px',
            lineHeight: '1.4',
          }}>
            {description}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>
        {value && (
          <div style={{
            fontSize: '12.5px',
            color: disabled ? 'var(--muted)' : 'var(--body)',
            marginRight: action ? '12px' : 0,
            display: 'inline-block',
          }}>
            {value}
          </div>
        )}
        {action && (
          <button style={{
            padding: '9px 16px',
            borderRadius: '9px',
            border: '1px solid var(--border-2)',
            background: 'transparent',
            color: 'var(--text)',
            fontSize: '12.5px',
            fontWeight: 500,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            transition: 'all 0.12s',
          }}
          onMouseEnter={(e) => {
            if (!disabled) e.currentTarget.style.background = 'var(--surface-3)';
          }}
          onMouseLeave={(e) => {
            if (!disabled) e.currentTarget.style.background = 'transparent';
          }}>
            {action}
          </button>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '@/lib/firebase/AuthContext';
import { useToast } from '@/components/ui/Toast';
import SettingCard from '../SettingCard';

export default function AccountSection() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleEditName = () => {
    setNameValue(user?.displayName || '');
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user, { displayName: nameValue.trim() || null });
      setEditingName(false);
      showToast('Display name updated', 'success');
    } catch (err) {
      console.error('[AccountSection] updateProfile failed:', err);
      showToast('Failed to update name. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelName = () => {
    setEditingName(false);
  };

  return (
    <div>
      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>
        Account
      </div>
      <div style={{ fontSize: '12.5px', color: 'var(--body)', lineHeight: '1.55', marginBottom: '18px', maxWidth: '560px' }}>
        Manage your account settings and profile information.
      </div>

      <SettingCard title="Profile">
        <SettingRow
          label="Email"
          description="Your account email address"
          value={user?.email || ''}
          disabled
        />

        {/* Name — inline edit */}
        <div style={{
          display: 'flex',
          alignItems: editingName ? 'flex-start' : 'center',
          gap: '16px',
          padding: '12px 0',
          borderTop: '1px solid var(--border)',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Name</div>
            <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '3px', lineHeight: '1.4' }}>
              Display name across the app
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>
            {editingName ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                <input
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') handleCancelName();
                  }}
                  autoFocus
                  placeholder="Display name"
                  maxLength={60}
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border-2)',
                    borderRadius: '9px',
                    padding: '8px 12px',
                    color: 'var(--text)',
                    fontSize: '13px',
                    outline: 'none',
                    fontFamily: 'inherit',
                    width: '200px',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--purple-l)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(147,51,234,.15)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-2)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={handleSaveName}
                    disabled={saving}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'var(--purple)',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.6 : 1,
                      fontFamily: 'inherit',
                      boxShadow: saving ? 'none' : '0 2px 8px var(--glow)',
                    }}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelName}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-2)',
                      background: 'transparent',
                      color: 'var(--body)',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--body)' }}>
                  {user?.displayName || '—'}
                </span>
                <button
                  onClick={handleEditName}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '9px',
                    border: '1px solid var(--border-2)',
                    background: 'transparent',
                    color: 'var(--text)',
                    fontSize: '12.5px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>

        <SettingRow
          label="Avatar"
          description="Your profile picture"
          value={user?.photoURL ? 'Set' : 'Not set'}
          action="Change · soon"
          disabled
        />
      </SettingCard>

      <SettingCard title="Authentication">
        <SettingRow
          label="Password"
          description="Change your account password"
          action="Update · soon"
          disabled
        />
        <SettingRow
          label="Two-Factor Authentication"
          description="Add extra security to your account"
          action="Enable · soon"
          disabled
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
}

function SettingRow({ label, description, value, action, disabled }: SettingRowProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '12px 0',
      borderTop: '1px solid var(--border)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>
          {label}
        </div>
        {description && (
          <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '3px', lineHeight: '1.4' }}>
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
          <button
            disabled={disabled}
            style={{
              padding: '9px 16px',
              borderRadius: '9px',
              border: '1px solid var(--border-2)',
              background: 'transparent',
              color: disabled ? 'var(--muted)' : 'var(--text)',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.55 : 1,
              transition: 'all 0.12s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              if (!disabled) e.currentTarget.style.background = 'var(--surface-3)';
            }}
            onMouseLeave={(e) => {
              if (!disabled) e.currentTarget.style.background = 'transparent';
            }}
          >
            {action}
          </button>
        )}
      </div>
    </div>
  );
}

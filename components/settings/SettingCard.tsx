'use client';

interface SettingCardProps {
  title: string;
  children: React.ReactNode;
}

export default function SettingCard({ title, children }: SettingCardProps) {
  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderRadius: '14px',
      padding: '18px 20px',
      marginBottom: '16px',
      boxShadow: '0 4px 14px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05)',
    }}>
      <div style={{
        fontSize: '11px',
        fontWeight: 600,
        color: 'var(--purple-l)',
        letterSpacing: '0.7px',
        textTransform: 'uppercase',
        marginBottom: '14px',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

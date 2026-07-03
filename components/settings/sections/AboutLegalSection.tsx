'use client';

import SettingCard from '../SettingCard';

const LEGAL_LINKS = [
  { label: 'Terms of Service', url: '/legal/terms' },
  { label: 'Privacy Policy', url: '/legal/privacy' },
  { label: 'Cookie Policy', url: '/legal/cookies' },
  { label: 'AI Usage Policy', url: '/legal/ai-usage' },
];

export default function AboutLegalSection() {
  return (
    <div>
      <div style={{
        fontSize: '16px',
        fontWeight: 600,
        marginBottom: '4px',
        color: 'var(--text)',
      }}>
        About & Legal
      </div>
      <div style={{
        fontSize: '12.5px',
        color: 'var(--body)',
        lineHeight: '1.55',
        marginBottom: '18px',
        maxWidth: '560px',
      }}>
        Legal documents and app information.
      </div>

      <SettingCard title="Legal & Compliance">
        {LEGAL_LINKS.map((link, idx) => (
          <a
            key={idx}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '11px 0',
              borderTop: idx === 0 ? 'none' : '1px solid var(--border)',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              const text = e.currentTarget.querySelector('[data-label]') as HTMLElement | null;
              if (text) text.style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              const text = e.currentTarget.querySelector('[data-label]') as HTMLElement | null;
              if (text) text.style.color = 'var(--body)';
            }}
          >
            <span
              data-label
              style={{
                fontSize: '13px',
                color: 'var(--body)',
                transition: 'color 0.12s',
              }}
            >
              {link.label}
            </span>
            <span style={{
              fontSize: '12px',
              color: 'var(--muted)',
            }}>
              ↗
            </span>
          </a>
        ))}
        <div style={{
          padding: '11px 0',
          borderTop: '1px solid var(--border)',
          fontSize: '12.5px',
          color: 'var(--muted)',
        }}>
          Kan-do v1.0 · build 2026.06
        </div>
      </SettingCard>
    </div>
  );
}

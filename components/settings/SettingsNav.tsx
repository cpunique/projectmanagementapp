'use client';

interface SettingsNavProps {
  sections: { id: string; label: string }[];
  activeSection: string;
  onSectionChange: (section: any) => void;
}

// SVG icon components matching the mockup
const iconMap: { [key: string]: React.ReactNode } = {
  account: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>,
  appearance: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/></svg>,
  'ai-integrations': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2.2 4.8L19 9.5l-3.5 3.4.9 5.1L12 15.6 7.6 18l.9-5.1L5 9.5l4.8-1.7z"/></svg>,
  notifications: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>,
  subscription: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>,
  advanced: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/></svg>,
  'about-legal': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h0"/></svg>,
};

const SettingsNav = ({ sections, activeSection, onSectionChange }: SettingsNavProps) => {
  return (
    <div style={{
      flex: '0 0 218px',
      display: 'flex',
      flexDirection: 'column',
      gap: '3px',
    }}>
      <div style={{
        fontSize: '18px',
        fontWeight: 600,
        letterSpacing: '-0.3px',
        padding: '6px 12px 14px',
        color: 'var(--text)',
      }}>
        Settings
      </div>

      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => onSectionChange(section.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '11px',
            padding: '10px 12px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 500,
            color: activeSection === section.id ? 'var(--text)' : 'var(--body)',
            background: activeSection === section.id ? 'rgba(147,51,234,.12)' : 'transparent',
            border: activeSection === section.id ? '1px solid rgba(147,51,234,.25)' : '1px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.12s',
            boxShadow: activeSection === section.id ? 'inset 2px 0 0 var(--purple)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (activeSection !== section.id) {
              e.currentTarget.style.background = 'var(--surface-1)';
              e.currentTarget.style.color = 'var(--text)';
            }
          }}
          onMouseLeave={(e) => {
            if (activeSection !== section.id) {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--body)';
            }
          }}
        >
          <span style={{
            width: '17px',
            height: '17px',
            flexShrink: 0,
            color: activeSection === section.id ? 'var(--purple-l)' : 'var(--muted)',
            transition: 'color 0.12s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {iconMap[section.id]}
          </span>
          {section.label}
        </button>
      ))}
    </div>
  );
};

export default SettingsNav;

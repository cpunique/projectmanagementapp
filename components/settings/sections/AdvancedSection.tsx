'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import SettingCard from '../SettingCard';

const HealthDashboard = dynamic(() => import('@/components/ui/HealthDashboard'), { ssr: false });

const DIAGNOSTIC_TOOLS = [
  {
    id: 'system-health',
    label: 'System Health',
    description: 'Board sizes, storage, connection status.',
  },
  {
    id: 'board-recovery',
    label: 'Board Recovery',
    description: 'Restore a recently deleted board.',
  },
  {
    id: 'advanced-recovery',
    label: 'Advanced Recovery',
    description: 'Lower-level restore tools.',
  },
];

export default function AdvancedSection() {
  const [showHealthDashboard, setShowHealthDashboard] = useState(false);

  const handleOpenTool = (toolId: string) => {
    if (toolId === 'system-health') {
      setShowHealthDashboard(true);
    } else if (toolId === 'board-recovery') {
      window.location.href = '/admin/recover';
    } else if (toolId === 'advanced-recovery') {
      window.location.href = '/admin/advanced-recover';
    }
  };

  return (
    <div>
      <div style={{
        fontSize: '16px',
        fontWeight: 600,
        marginBottom: '4px',
        color: 'var(--text)',
      }}>
        Advanced
      </div>
      <div style={{
        fontSize: '12.5px',
        color: 'var(--body)',
        lineHeight: '1.55',
        marginBottom: '18px',
        maxWidth: '560px',
      }}>
        System tools and diagnostics.
      </div>

      <SettingCard title="Diagnostics">
        {DIAGNOSTIC_TOOLS.map((tool, idx) => (
          <div
            key={tool.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '12px 0',
              borderTop: idx === 0 ? '1px solid var(--border)' : '1px solid var(--border)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text)',
              }}>
                {tool.label}
              </div>
              <div style={{
                fontSize: '11.5px',
                color: 'var(--muted)',
                marginTop: '3px',
                lineHeight: '1.4',
              }}>
                {tool.description}
              </div>
            </div>
            <button
              onClick={() => handleOpenTool(tool.id)}
              style={{
                flexShrink: 0,
                padding: '9px 16px',
                borderRadius: '9px',
                border: '1px solid var(--border-2)',
                background: 'transparent',
                color: 'var(--text)',
                fontSize: '12.5px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Open
            </button>
          </div>
        ))}
      </SettingCard>

      {/* System Health Modal */}
      <HealthDashboard
        isOpen={showHealthDashboard}
        onClose={() => setShowHealthDashboard(false)}
      />
    </div>
  );
}

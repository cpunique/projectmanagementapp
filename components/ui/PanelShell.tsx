'use client';

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PanelShellProps {
  open: boolean;
  id?: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  width?: number | string;
  overlay?: ReactNode;
  children: ReactNode;
}

const PANEL_SPRING = { type: 'spring' as const, stiffness: 300, damping: 30 };

export default function PanelShell({
  open,
  id,
  title,
  subtitle,
  onClose,
  width = 320,
  overlay,
  children,
}: PanelShellProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id={id}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={PANEL_SPRING}
          className="fixed right-0 top-16 z-30 bottom-0"
          style={{
            width: typeof width === 'number' ? `${width}px` : width,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'var(--surface-1)',
            borderLeft: '1px solid var(--border)',
            boxShadow: '-6px 0 24px rgba(0,0,0,.28)',
          }}
        >
          {overlay}
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '16px 16px 14px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2, margin: 0 }}>
                {title}
              </h2>
              {subtitle && (
                <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3, marginBottom: 0 }}>
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label={`Close ${title} panel`}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
                color: 'var(--body)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Body — flex column; each panel manages its own scroll inside */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

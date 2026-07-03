'use client';

import { useState, useRef, useEffect } from 'react';
import Tooltip from '@/components/ui/Tooltip';

interface OverflowMenuProps {
  items: {
    id: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    tooltip?: string;
    disabled?: boolean;
  }[];
}

const ToolbarOverflowMenu = ({ items }: OverflowMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative">
      <Tooltip position="bottom" text="More options">
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            padding: '8px 10px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: isOpen ? 'var(--surface-2)' : 'transparent',
            color: 'var(--text)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
          onMouseEnter={(e) => {
            if (!isOpen) {
              e.currentTarget.style.background = 'rgba(35,31,28,.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isOpen) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
          aria-label="More options menu"
        >
          ⋮
        </button>
      </Tooltip>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: '8px',
            minWidth: '200px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.05)',
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          {items.map((item, index) => (
            <button
              key={item.id}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              disabled={item.disabled}
              style={{
                width: '100%',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                borderRadius: 0,
                border: 'none',
                borderBottom: index < items.length - 1 ? '1px solid var(--border)' : 'none',
                background: 'transparent',
                color: item.disabled ? 'var(--muted)' : 'var(--text)',
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'all 0.2s',
                opacity: item.disabled ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!item.disabled) {
                  e.currentTarget.style.background = 'rgba(147,51,234,.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ToolbarOverflowMenu;

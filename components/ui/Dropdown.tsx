'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  width?: string;
  glass?: boolean;
}

const Dropdown = ({
  trigger,
  children,
  align = 'left',
  width = 'w-48',
  glass = false,
}: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setIsOpen(false);
  };

  const panelStyle: React.CSSProperties = glass
    ? {
        background: 'rgba(29, 26, 23, 0.92)',
        backdropFilter: 'blur(20px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-3)',
      }
    : {
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        boxShadow: 'var(--shadow-1)',
      };

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center"
      >
        {trigger}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn('absolute top-full mt-2 z-50', width, align === 'right' ? 'right-0' : 'left-0')}
          style={panelStyle}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default Dropdown;

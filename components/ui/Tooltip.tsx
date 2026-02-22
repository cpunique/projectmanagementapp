'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
}

export default function Tooltip({ text, children, position = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({
        top: position === 'top' ? rect.top - 4 : rect.bottom + 4,
        left: rect.left + rect.width / 2,
      });
    }
    setVisible(true);
  };

  return (
    <div ref={ref} onMouseEnter={handleMouseEnter} onMouseLeave={() => setVisible(false)} className="inline-flex">
      {children}
      {visible && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            top: position === 'top' ? pos.top : pos.top,
            left: pos.left,
            transform: position === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            zIndex: 9999,
          }}
          className="px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs rounded-md shadow-md border border-gray-200 dark:border-transparent whitespace-nowrap pointer-events-none"
        >
          {text}
        </div>,
        document.body
      )}
    </div>
  );
}

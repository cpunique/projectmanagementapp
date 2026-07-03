'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

// Dark-only app: this modal always renders the locked glass pattern
// (rgba(42,37,34,.7) + blur(24px) saturate(1.2), canonical tokens for text).
// There is no light variant to fall back to.
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className,
  contentClassName,
}: ModalProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={cn('fixed inset-0 z-50', className)}>
      {/* Backdrop dimming the page behind */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal positioning container (centers modal, allows it to scroll if needed) */}
      <div className="absolute inset-0 overflow-y-auto p-8 flex items-center justify-center">
        {/* OUTER: positioning/animation wrapper (no glass, no transform on glass ancestor) */}
        <div
          className={cn(
            'relative w-full max-w-3xl my-8',
            contentClassName
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* MODAL PANEL: fixed-height flex container with glass surface */}
          <div
            style={{
              position: 'relative',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(42,37,34,.7)',
              backdropFilter: 'blur(24px) saturate(1.2)',
              WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
              border: '1px solid rgba(255,255,255,.09)',
              borderRadius: '18px',
              boxShadow: '0 24px 60px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.08)',
              overflow: 'hidden',
            }}
            className="transform transition-all duration-200"
          >
            {/* Header - frozen at top */}
            {title && (
              <div
                style={{
                  flexShrink: 0,
                  paddingLeft: '32px',
                  paddingRight: '32px',
                  paddingTop: '20px',
                  paddingBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  borderBottom: '1px solid rgba(255,255,255,.08)',
                  borderRadius: '18px 18px 0 0',
                }}
              >
                <h2 style={{ color: 'var(--text)', fontSize: '20px', fontWeight: 'bold' }}>
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  style={{
                    position: 'absolute',
                    right: '32px',
                    color: 'var(--muted)',
                    padding: '4px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}

            {/* Scrollable body - scrolls inside the fixed-height modal */}
            <div
              style={{ flex: 1, overflowY: 'auto', minHeight: 0, color: 'var(--text)', paddingLeft: '32px', paddingRight: '32px', paddingTop: '24px', paddingBottom: '24px' }}
            >
              {children}
            </div>

            {/* Footer - frozen at bottom */}
            {footer && (
              <div
                style={{
                  flexShrink: 0,
                  borderTop: '1px solid rgba(255,255,255,.08)',
                  paddingLeft: '32px',
                  paddingRight: '32px',
                  paddingTop: '16px',
                  paddingBottom: '16px',
                  borderRadius: '0 0 18px 18px',
                }}
              >
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

Modal.displayName = 'Modal';

export default Modal;

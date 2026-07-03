'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface OnboardingModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  onCreateFirstBoard: () => void;
}

export default function OnboardingModal({ isOpen, onDismiss, onCreateFirstBoard }: OnboardingModalProps) {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onDismiss]);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <>
      <style>{`
        .kdo-onb-root{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:32px}
        .kdo-onb-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.5);z-index:1}
        .kdo-onb-outer{position:relative;z-index:2;width:100%;display:flex;justify-content:center}

        .kdo-onb-modal{position:relative;width:440px;max-width:calc(100% - 40px);
          background:rgba(42,37,34,.7);backdrop-filter:blur(24px) saturate(1.2);-webkit-backdrop-filter:blur(24px) saturate(1.2);
          border:1px solid rgba(255,255,255,.09);border-radius:18px;
          box-shadow:0 24px 60px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.08);
          padding:34px 32px 26px;text-align:center}
        @supports not (backdrop-filter: blur(1px)) { .kdo-onb-modal{ background:#2a2522; } }

        .kdo-onb-close{position:absolute;top:16px;right:16px;width:30px;height:30px;border-radius:8px;border:1px solid transparent;
          background:transparent;color:var(--muted);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .12s}
        .kdo-onb-close:hover{background:var(--surface-2);color:var(--text)}

        .kdo-onb-hero{width:64px;height:64px;border-radius:18px;background:linear-gradient(135deg,#9333ea,#7c1d6f);
          display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:28px;margin:0 auto 20px;
          box-shadow:0 0 38px var(--glow),inset 0 1px 0 rgba(255,255,255,.18)}

        .kdo-onb-h{font-size:22px;font-weight:600;letter-spacing:-.4px;margin-bottom:9px;color:var(--text)}
        .kdo-onb-sub{font-size:13.5px;color:var(--body);line-height:1.6;max-width:330px;margin:0 auto 22px}

        .kdo-onb-tease{background:rgba(35,31,28,.5);border:1px solid var(--border);border-radius:14px;padding:16px;text-align:left;margin-bottom:24px}
        .kdo-onb-tease-top{display:flex;align-items:center;gap:10px;margin-bottom:12px}
        .kdo-onb-tease-spark{width:30px;height:30px;border-radius:9px;background:rgba(147,51,234,.14);border:1px solid rgba(147,51,234,.3);
          display:flex;align-items:center;justify-content:center;color:var(--purple-l);flex-shrink:0}
        .kdo-onb-tease-ttl{flex:1;font-size:13px;font-weight:600;color:var(--text)}
        .kdo-onb-pro-pill{font-size:9.5px;font-weight:700;letter-spacing:.5px;color:var(--purple-l);background:rgba(147,51,234,.14);
          border:1px solid rgba(147,51,234,.3);padding:3px 8px;border-radius:99px}
        .kdo-onb-tease-desc{font-size:12px;color:var(--body);line-height:1.55;margin-bottom:13px}

        .kdo-onb-mini{display:flex;align-items:center;gap:10px}
        .kdo-onb-mini-type{flex:1;background:rgba(22,20,18,.6);border:1px solid var(--border-2);border-radius:8px;padding:8px 10px;
          font-size:10.5px;color:var(--muted);font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .kdo-onb-mini-arrow{color:var(--purple-l);flex-shrink:0;display:flex}
        .kdo-onb-mini-board{display:flex;gap:3px;flex-shrink:0}
        .kdo-onb-mc{width:16px;height:30px;border-radius:4px;background:var(--surface-3);border:1px solid var(--border)}
        .kdo-onb-mc span{display:block;height:4px;margin:3px 2px;border-radius:2px;background:var(--purple);opacity:.55}
        .kdo-onb-mc span:nth-child(2){opacity:.35}

        .kdo-onb-btn-primary{width:100%;padding:13px;border-radius:11px;border:none;background:var(--purple);color:#fff;
          font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 0 24px var(--glow);
          display:flex;align-items:center;justify-content:center;gap:8px;transition:opacity .15s}
        .kdo-onb-btn-primary:hover{opacity:.92}
        .kdo-onb-btn-ghost{width:100%;padding:11px;margin-top:6px;border:none;background:transparent;color:var(--muted);
          font-family:inherit;font-size:12.5px;font-weight:500;cursor:pointer}
        .kdo-onb-btn-ghost:hover{color:var(--body)}

        @media (max-width:560px){
          .kdo-onb-root{align-items:flex-end;padding:0}
          .kdo-onb-modal{width:100%;max-width:100%;border-radius:20px 20px 0 0;
            padding:30px 22px calc(22px + env(safe-area-inset-bottom, 0px))}
          .kdo-onb-btn-primary,.kdo-onb-btn-ghost{min-height:44px}
          .kdo-onb-close{width:44px;height:44px;top:8px;right:8px}
        }
      `}</style>
      <AnimatePresence>
        {isOpen && (
          <div className="kdo-onb-root">
            <motion.div
              className="kdo-onb-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
              onClick={onDismiss}
            />

            {/* OUTER: animation wrapper — transform/opacity only, no glass here.
                backdrop-filter on the inner panel breaks under a transformed ancestor,
                so the glass surface must live on a separate, static element. */}
            <motion.div
              className="kdo-onb-outer"
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* INNER: static glass panel, no transform */}
              <div className="kdo-onb-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Welcome to Kan-do">
                <button className="kdo-onb-close" title="Dismiss" aria-label="Dismiss" onClick={onDismiss}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>

                <div className="kdo-onb-hero">K</div>
                <div className="kdo-onb-h">Welcome to Kan-do</div>
                <div className="kdo-onb-sub">
                  A Kanban board that builds itself. Organize work your way — or let Kan-do do the heavy lifting.
                </div>

                <div className="kdo-onb-tease">
                  <div className="kdo-onb-tease-top">
                    <div className="kdo-onb-tease-spark">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" />
                        <path d="M19 14l.7 1.8L21.5 16.5l-1.8.7L19 19l-.7-1.8L16.5 16.5l1.8-.7z" />
                      </svg>
                    </div>
                    <div className="kdo-onb-tease-ttl">Describe it, and it&apos;s built</div>
                    <span className="kdo-onb-pro-pill">PRO</span>
                  </div>
                  <div className="kdo-onb-tease-desc">
                    Tell Kan-do what you&apos;re working on in plain language, and it generates the columns and cards for you — a ready-to-work board in seconds.
                  </div>
                  <div className="kdo-onb-mini">
                    <div className="kdo-onb-mini-type">&quot;Plan a product launch&hellip;&quot;</div>
                    <div className="kdo-onb-mini-arrow">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </div>
                    <div className="kdo-onb-mini-board">
                      <div className="kdo-onb-mc"><span /><span /></div>
                      <div className="kdo-onb-mc"><span /><span /></div>
                      <div className="kdo-onb-mc"><span /></div>
                    </div>
                  </div>
                </div>

                <button className="kdo-onb-btn-primary" onClick={onCreateFirstBoard}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Create your first board
                </button>
                <button className="kdo-onb-btn-ghost" onClick={onDismiss}>I&apos;ll explore on my own</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}

'use client';

import { useState, useEffect } from 'react';
import AuthForm from './AuthForm';

// ─── Auth Modal ───────────────────────────────────────────────────────────────

function AuthModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#231f1c] rounded-2xl shadow-2xl w-full max-w-md border border-[#322d2a] relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#6b5e58] hover:text-[#f5f0ee] transition-colors z-10"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="p-2">
          <AuthForm />
        </div>
      </div>
    </div>
  );
}

// ─── Mini Board Visual (hero) ─────────────────────────────────────────────────

const HERO_COLUMNS = [
  {
    title: 'Todo',
    cards: [
      { title: 'Auth system', tag: 'High', tagColor: 'rgba(244,63,94,0.16)', tagTextColor: '#fb7185' },
      { title: 'Prompt gen', tag: 'High', tagColor: 'rgba(244,63,94,0.16)', tagTextColor: '#fb7185' },
    ],
  },
  {
    title: 'In Progress',
    cards: [
      { title: 'Dashboard UI', tag: 'Medium', tagColor: 'rgba(147,51,234,0.16)', tagTextColor: '#c084fc' },
    ],
  },
  {
    title: 'Done',
    cards: [
      { title: 'API setup', tag: 'Done', tagColor: 'rgba(34,197,94,0.16)', tagTextColor: '#4ade80' },
    ],
  },
];

function MiniBoardVisual() {
  return (
    <div className="relative">
      {/* Purple glow behind board */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '-30px',
          background: 'radial-gradient(circle at 60% 40%, rgba(147,51,234,0.4), transparent 70%)',
          filter: 'blur(40px)',
          zIndex: -1,
          borderRadius: '50%',
        }}
      />

      {/* Glass board */}
      <div
        className="rounded-[20px] p-5 glass-surface"
        style={{
          background: 'rgba(35,31,28,0.55)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <span
            style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#9333ea',
              boxShadow: '0 0 10px #9333ea',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span className="text-[#a89890] text-xs font-medium">My Project · Live board</span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {HERO_COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-[#6b5e58] text-[10px] font-semibold uppercase tracking-[0.7px] mb-2">
                {col.title}
              </p>
              <div className="space-y-2">
                {col.cards.map((card) => (
                  <div
                    key={card.title}
                    style={{
                      background: 'rgba(22,20,18,0.7)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 11,
                      padding: '11px 12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    }}
                  >
                    <p className="text-[#f5f0ee] text-[12px] font-medium mb-1.5">{card.title}</p>
                    <span
                      className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ background: card.tagColor, color: card.tagTextColor }}
                    >
                      {card.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Prompt chip */}
        <div
          className="mt-3.5 flex items-center gap-2"
          style={{
            background: 'rgba(147,51,234,0.12)',
            border: '1px solid rgba(147,51,234,0.32)',
            borderRadius: 11,
            padding: '10px 13px',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <span style={{ color: '#c084fc', fontSize: 14, flexShrink: 0 }}>✦</span>
          <p className="text-[#c084fc] text-[12px]">
            Prompt generated from <span className="font-medium">&ldquo;Auth system&rdquo;</span> card — ready to use
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────

export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistDone, setWaitlistDone] = useState(false);

  useEffect(() => {
    // Landing page is always dark — ensure the class is set so AuthForm dark: variants activate
    document.documentElement.classList.add('dark');
    localStorage.removeItem('kanban-store');
    return () => { localStorage.removeItem('kanban-store'); };
  }, []);

  const handleWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (waitlistEmail.trim()) setWaitlistDone(true);
  };

  const freeFeatures = [
    { text: '3 boards', included: true },
    { text: 'Unlimited cards', included: true },
    { text: 'Real-time collaboration', included: true },
    { text: 'Offline support', included: true },
    { text: 'AI prompt generation', included: false },
    { text: 'AI task card generation', included: false },
    { text: 'Claude Agent MCP access', included: false },
  ];

  const proFeatures = [
    { text: 'Unlimited boards', included: true },
    { text: 'Unlimited cards', included: true },
    { text: 'Real-time collaboration', included: true },
    { text: 'Offline support', included: true },
    { text: 'AI prompt generation', included: true },
    { text: 'AI task card generation', included: true },
    { text: 'Claude Agent MCP access', included: true },
  ];

  const featureCards = [
    {
      iconBg: 'rgba(147,51,234,0.18)',
      iconGlow: '0 0 24px rgba(147,51,234,0.3)',
      iconColor: '#c084fc',
      iconSymbol: '✦',
      pro: true,
      title: 'From card to prompt in one click',
      body: 'Every card field — title, description, checklist, notes, priority — becomes a structured directive. Five instruction styles for different task types.',
    },
    {
      iconBg: 'rgba(244,114,182,0.14)',
      iconGlow: '0 0 24px rgba(244,114,182,0.25)',
      iconColor: '#f472b6',
      iconSymbol: '◈',
      pro: true,
      title: 'Give your AI agent a seat at the board',
      body: 'Claude Code connects directly to your boards via MCP. Your agent reads card context automatically — no copy-pasting, no re-explaining.',
    },
    {
      iconBg: 'rgba(45,212,191,0.14)',
      iconGlow: '0 0 24px rgba(45,212,191,0.22)',
      iconColor: '#2dd4bf',
      iconSymbol: '▦',
      pro: false,
      title: 'All the Kanban you need. None of the bloat.',
      body: 'Drag-and-drop boards, real-time collaboration, WIP limits, due dates, attachments, and activity feeds. No enterprise pricing, no feature tax.',
    },
  ];

  return (
    <div
      className="min-h-screen text-[#f5f0ee]"
      style={{ background: '#161412', colorScheme: 'dark' }}
    >
      {/* ── Fallback + motion CSS ────────────────────────────────────────────── */}
      <style>{`
        @supports not (backdrop-filter: blur(1px)) {
          .glass-surface { background: #231f1c !important; }
          .glass-nav { background: rgba(22,20,18,0.98) !important; }
          .glass-social { background: #231f1c !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .landing-hover { transition: color 0.15s, background-color 0.15s, box-shadow 0.15s, border-color 0.15s !important; transform: none !important; }
        }
        .landing-hover { transition: all 0.2s; }
        .landing-hover:hover { transform: translateY(-2px); }
        .landing-card-hover { transition: transform 0.25s, box-shadow 0.25s; }
        .landing-card-hover:hover { transform: translateY(-4px); }
        @media (prefers-reduced-motion: reduce) {
          .landing-card-hover { transition: box-shadow 0.2s !important; transform: none !important; }
          .landing-card-hover:hover { transform: none !important; }
        }
      `}</style>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}

      {/* ── Gradient mesh blobs (fixed, behind everything) ───────────────────── */}
      <div
        aria-hidden="true"
        style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}
      >
        <div style={{ position: 'absolute', width: 620, height: 620, borderRadius: '50%', background: '#5b21b6', top: -180, left: -120, filter: 'blur(120px)', opacity: 0.5 }} />
        <div style={{ position: 'absolute', width: 520, height: 520, borderRadius: '50%', background: '#7c1d6f', top: 120, right: -160, filter: 'blur(120px)', opacity: 0.4 }} />
        <div style={{ position: 'absolute', width: 480, height: 480, borderRadius: '50%', background: '#3b1d80', bottom: -160, left: '30%', filter: 'blur(120px)', opacity: 0.35 }} />
      </div>

      {/* ── Grain texture ────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ── Content layer ────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 2 }}>

        {/* ── Nav ──────────────────────────────────────────────────────────── */}
        <nav
          className="sticky top-0 z-40 border-b border-[#322d2a] glass-nav"
          style={{
            background: 'rgba(22,20,18,0.6)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div className="max-w-[1240px] mx-auto px-10 h-[58px] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #9333ea, #7c1d6f)',
                  boxShadow: '0 0 20px rgba(147,51,234,0.5)',
                }}
              >
                <span className="text-white font-semibold text-sm">K</span>
              </div>
              <span className="text-[#f5f0ee] font-semibold text-[17px]">Kan-do</span>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-[#a89890] hover:text-[#f5f0ee] text-sm transition-colors">Features</a>
              <a href="#pricing" className="text-[#a89890] hover:text-[#f5f0ee] text-sm transition-colors">Pricing</a>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setAuthOpen(true)}
                className="landing-hover px-4 py-2 text-sm text-[#f5f0ee] rounded-[10px] hover:bg-white/[0.04]"
                style={{ border: '1px solid #4a4240', background: 'transparent' }}
              >
                Sign in
              </button>
              <button
                onClick={() => setAuthOpen(true)}
                className="landing-hover px-[18px] py-2 text-sm font-medium text-white rounded-[10px]"
                style={{
                  background: '#9333ea',
                  boxShadow: '0 0 24px rgba(147,51,234,0.45)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 34px rgba(147,51,234,0.7)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 24px rgba(147,51,234,0.45)'; }}
              >
                Get started free
              </button>
            </div>
          </div>
        </nav>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="border-b border-[#322d2a]">
          <div className="max-w-[1240px] mx-auto px-10 py-[90px] grid lg:grid-cols-[1.05fr_1fr] gap-14 items-center">
            <div>
              {/* Eyebrow */}
              <div
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-[#c084fc] mb-6"
                style={{
                  background: 'rgba(147,51,234,0.12)',
                  border: '1px solid rgba(147,51,234,0.32)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span>✦</span>
                AI-native project management
              </div>

              {/* H1 */}
              <h1
                className="font-semibold text-[#f5f0ee] mb-[22px]"
                style={{
                  fontSize: 'clamp(40px, 5vw, 54px)',
                  lineHeight: 1.05,
                  letterSpacing: '-1.5px',
                  fontFamily: 'var(--font-geist, var(--font-inter), system-ui, sans-serif)',
                }}
              >
                Your Kanban board
                <br />
                <span
                  style={{
                    background: 'linear-gradient(100deg, #c084fc, #f472b6)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  has a brain now
                </span>
              </h1>

              <p className="text-[#a89890] text-[18px] leading-[1.6] mb-3.5 max-w-[440px]">
                Kan-do turns your task cards into AI-ready prompts — so you spend less time explaining your work and more time shipping it.
              </p>

              <p className="text-[#6b5e58] text-[14px] leading-[1.55] mb-8 max-w-[430px]">
                Built for developers, solopreneurs, and small teams done paying enterprise prices for tools they barely use.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 mb-8">
                <button
                  onClick={() => setAuthOpen(true)}
                  className="landing-hover px-[26px] py-3 text-[15px] font-medium text-white rounded-xl"
                  style={{
                    background: '#9333ea',
                    boxShadow: '0 0 30px rgba(147,51,234,0.5)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 44px rgba(147,51,234,0.75)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 30px rgba(147,51,234,0.5)'; }}
                >
                  Start free — no credit card
                </button>
                <a
                  href="#features"
                  className="landing-hover flex items-center gap-2 px-6 py-3 text-[15px] text-[#f5f0ee] rounded-xl"
                  style={{
                    border: '1px solid #4a4240',
                    background: 'rgba(255,255,255,0.02)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#c084fc'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#4a4240'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  See it in action
                </a>
              </div>

              {/* Waitlist */}
              {!waitlistDone ? (
                <form onSubmit={handleWaitlist} className="flex gap-2.5 max-w-[430px]">
                  <input
                    type="email"
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 px-4 py-3 text-sm text-[#f5f0ee] placeholder-[#6b5e58] rounded-[11px] focus:outline-none transition-all"
                    style={{
                      background: 'rgba(35,31,28,0.6)',
                      border: '1px solid #4a4240',
                      backdropFilter: 'blur(8px)',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#c084fc'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(147,51,234,0.18)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#4a4240'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                  <button
                    type="submit"
                    className="landing-hover px-5 py-3 text-sm font-medium text-[#c084fc] rounded-[11px] whitespace-nowrap"
                    style={{
                      background: 'rgba(147,51,234,0.16)',
                      border: '1px solid rgba(147,51,234,0.4)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(147,51,234,0.28)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(147,51,234,0.16)'; }}
                  >
                    Join waitlist
                  </button>
                </form>
              ) : (
                <p className="text-sm text-[#c084fc] flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  You&apos;re on the list — founding members get 3 months Pro free.
                </p>
              )}
            </div>

            <div className="hidden lg:block">
              <MiniBoardVisual />
            </div>
          </div>
        </section>

        {/* ── Social proof ───────────────────────────────────────────────────── */}
        <div
          className="border-b border-[#322d2a] glass-social"
          style={{
            background: 'rgba(35,31,28,0.4)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <div className="max-w-[1240px] mx-auto px-10 py-[22px]">
            <div className="flex flex-wrap items-center justify-center gap-8">
              {[
                'Built on Firebase',
                'Deployed on Vercel',
                'Powered by Claude AI',
                'Built on Firebase — SOC-2 certified infrastructure',
                'Free to start',
              ].map((item) => (
                <span key={item} className="flex items-center gap-1.5 text-[#a89890] text-[13px]">
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#c084fc', display: 'inline-block', flexShrink: 0 }} />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Problem statement ──────────────────────────────────────────────── */}
        <section id="features" className="border-b border-[#322d2a]">
          <div className="max-w-[1240px] mx-auto px-10 py-[88px]">
            <p className="text-[#c084fc] text-[12px] font-semibold uppercase tracking-[1px] text-center mb-4">The problem</p>
            <h2
              className="text-[#f5f0ee] font-semibold text-center mx-auto mb-[18px]"
              style={{
                fontSize: 34,
                lineHeight: 1.25,
                letterSpacing: '-0.8px',
                maxWidth: 720,
                fontFamily: 'var(--font-geist, var(--font-inter), system-ui, sans-serif)',
              }}
            >
              You&apos;re managing tasks in one tool and prompting AI in another. That context gap is killing your momentum.
            </h2>
            <p className="text-[#a89890] text-[16px] leading-[1.7] text-center mx-auto" style={{ maxWidth: 620 }}>
              Every time you switch to an AI tool, you&apos;re re-explaining your project, your stack, your constraints.
              Kan-do closes that gap — your card <em className="text-[#c084fc] not-italic">is</em> the prompt. One click turns task context into a directive your AI can act on immediately.
            </p>
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────────────────────── */}
        <section className="border-b border-[#322d2a]">
          <div className="max-w-[1240px] mx-auto px-10 py-[88px]">
            <p className="text-[#c084fc] text-[12px] font-semibold uppercase tracking-[1px] text-center mb-4">Features</p>
            <h2
              className="text-[#f5f0ee] font-semibold text-center mb-12"
              style={{
                fontSize: 34,
                letterSpacing: '-0.8px',
                fontFamily: 'var(--font-geist, var(--font-inter), system-ui, sans-serif)',
              }}
            >
              Everything you need. Nothing you don&apos;t.
            </h2>
            <div className="grid md:grid-cols-3 gap-[18px]">
              {featureCards.map((card) => (
                <div
                  key={card.title}
                  className="landing-card-hover rounded-[20px] p-[26px] glass-surface cursor-default"
                  style={{
                    background: 'rgba(35,31,28,0.55)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 18px 50px rgba(0,0,0,0.5), 0 0 40px rgba(147,51,234,0.18), inset 0 1px 0 rgba(255,255,255,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 10px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)';
                  }}
                >
                  <div
                    className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center mb-4 text-[22px]"
                    style={{ background: card.iconBg, boxShadow: card.iconGlow, color: card.iconColor }}
                  >
                    {card.iconSymbol}
                  </div>
                  {card.pro && (
                    <span
                      className="inline-block text-[9px] font-semibold text-white px-2 py-0.5 rounded-full mb-2.5"
                      style={{ background: '#9333ea', boxShadow: '0 0 16px rgba(147,51,234,0.5)' }}
                    >
                      Pro
                    </span>
                  )}
                  <h3 className="text-[#f5f0ee] font-semibold text-[18px] mb-2.5">{card.title}</h3>
                  <p className="text-[#a89890] text-[14px] leading-[1.65]">{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ────────────────────────────────────────────────────────── */}
        <section id="pricing" className="border-b border-[#322d2a]">
          <div className="max-w-[1240px] mx-auto px-10 py-[88px]">
            <p className="text-[#c084fc] text-[12px] font-semibold uppercase tracking-[1px] text-center mb-4">Pricing</p>
            <h2
              className="text-[#f5f0ee] font-semibold text-center mb-2"
              style={{
                fontSize: 34,
                letterSpacing: '-0.8px',
                fontFamily: 'var(--font-geist, var(--font-inter), system-ui, sans-serif)',
              }}
            >
              Simple. No surprises.
            </h2>
            <p className="text-[#a89890] text-[16px] text-center mb-12">Start free. Upgrade when you&apos;re ready.</p>

            <div className="grid md:grid-cols-2 gap-5 max-w-[760px] mx-auto">
              {/* Free plan */}
              <div
                className="rounded-[20px] p-8 flex flex-col glass-surface"
                style={{
                  background: 'rgba(35,31,28,0.55)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                <div className="mb-6">
                  <p className="text-[#a89890] text-sm mb-2">Free</p>
                  <p
                    className="text-[#f5f0ee] font-semibold mb-1"
                    style={{ fontSize: 42, letterSpacing: '-1px' }}
                  >
                    $0
                  </p>
                  <p className="text-[#6b5e58] text-[13px]">Forever free on 3 boards</p>
                </div>
                <ul className="space-y-1.5 mb-7 flex-1">
                  {freeFeatures.map((f) => (
                    <li key={f.text} className="flex items-center gap-2.5 py-1.5 text-[14px]">
                      {f.included ? (
                        <span style={{ color: '#4ade80', flexShrink: 0 }}>✓</span>
                      ) : (
                        <span style={{ color: '#4a4240', flexShrink: 0 }}>✕</span>
                      )}
                      <span style={{ color: f.included ? '#a89890' : '#4a4240' }}>{f.text}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setAuthOpen(true)}
                  className="landing-hover w-full py-3 text-[15px] font-medium text-[#f5f0ee] rounded-xl"
                  style={{ border: '1px solid #4a4240', background: 'transparent' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  Get started free
                </button>
              </div>

              {/* Pro plan */}
              <div
                className="rounded-[20px] p-8 flex flex-col relative glass-surface"
                style={{
                  background: 'rgba(35,31,28,0.55)',
                  border: '1px solid rgba(147,51,234,0.5)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  boxShadow: '0 10px 50px rgba(147,51,234,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
                }}
              >
                <span
                  className="absolute top-5 right-6 text-[10px] font-semibold text-[#c084fc] px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(147,51,234,0.2)', border: '1px solid rgba(147,51,234,0.4)' }}
                >
                  Most popular
                </span>
                <div className="mb-6">
                  <p className="text-[#a89890] text-sm mb-2">Pro</p>
                  <p
                    className="text-[#f5f0ee] font-semibold mb-1"
                    style={{ fontSize: 42, letterSpacing: '-1px' }}
                  >
                    $10<span className="text-[15px] text-[#a89890] font-normal"> /mo</span>
                  </p>
                  <p className="text-[#c084fc] text-[13px]">or $96/year — save 20%</p>
                </div>
                <ul className="space-y-1.5 mb-7 flex-1">
                  {proFeatures.map((f) => (
                    <li key={f.text} className="flex items-center gap-2.5 py-1.5 text-[14px]">
                      <span style={{ color: '#4ade80', flexShrink: 0 }}>✓</span>
                      <span className="text-[#a89890]">{f.text}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setAuthOpen(true)}
                  className="landing-hover w-full py-3 text-[15px] font-medium text-white rounded-xl"
                  style={{
                    background: '#9333ea',
                    boxShadow: '0 0 30px rgba(147,51,234,0.5)',
                    border: 'none',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 44px rgba(147,51,234,0.75)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 30px rgba(147,51,234,0.5)'; }}
                >
                  Start Pro
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Final CTA ──────────────────────────────────────────────────────── */}
        <section className="relative border-b border-[#322d2a]">
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', inset: 0, zIndex: 0,
              background: 'radial-gradient(ellipse at center, rgba(147,51,234,0.22), transparent 65%)',
            }}
          />
          <div className="relative z-10 max-w-[1240px] mx-auto px-10 py-[100px] text-center">
            <h2
              className="text-[#f5f0ee] font-semibold mb-3.5"
              style={{
                fontSize: 40,
                letterSpacing: '-1px',
                fontFamily: 'var(--font-geist, var(--font-inter), system-ui, sans-serif)',
              }}
            >
              Your next project deserves a smarter board.
            </h2>
            <p className="text-[#a89890] text-[17px] leading-[1.7] mb-8 mx-auto" style={{ maxWidth: 500 }}>
              Join developers and solopreneurs done switching between tools to get things done.
            </p>
            <button
              onClick={() => setAuthOpen(true)}
              className="landing-hover px-[26px] py-3 text-[15px] font-medium text-white rounded-xl"
              style={{
                background: '#9333ea',
                boxShadow: '0 0 30px rgba(147,51,234,0.5)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 44px rgba(147,51,234,0.75)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 30px rgba(147,51,234,0.5)'; }}
            >
              Start free — no credit card required
            </button>
            <p className="text-[#6b5e58] text-[13px] mt-3.5">Free forever on 3 boards. Upgrade anytime.</p>
          </div>
        </section>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <footer
          className="border-t border-[#322d2a] glass-surface"
          style={{
            background: 'rgba(35,31,28,0.5)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <div className="max-w-[1240px] mx-auto px-10 py-[44px] grid md:grid-cols-[2fr_1fr_1fr] gap-8">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div
                  className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #9333ea, #7c1d6f)',
                    boxShadow: '0 0 20px rgba(147,51,234,0.5)',
                  }}
                >
                  <span className="text-white font-semibold text-sm">K</span>
                </div>
                <span className="text-[#f5f0ee] font-semibold text-[17px]">Kan-do</span>
              </div>
              <p className="text-[#a89890] text-[13px] leading-[1.6] max-w-[240px]">
                AI-native project management for developers and solopreneurs.
              </p>
            </div>

            <div>
              <p className="text-[#f5f0ee] text-[13px] font-semibold mb-3">Legal</p>
              <ul className="space-y-1.5">
                {['Terms of Service', 'Privacy Policy', 'Cookie Policy', 'AI Usage Policy'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-[#a89890] hover:text-[#f5f0ee] text-[13px] transition-colors py-0.5 block">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[#f5f0ee] text-[13px] font-semibold mb-3">Contact</p>
              <ul className="space-y-1.5">
                {[
                  { label: 'support@kan-do.app', href: 'mailto:support@kan-do.app' },
                  { label: 'X / Twitter', href: '#' },
                  { label: 'IndieHackers', href: '#' },
                  { label: 'ProductHunt', href: '#' },
                ].map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-[#a89890] hover:text-[#f5f0ee] text-[13px] transition-colors py-0.5 block">{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="md:col-span-3 pt-5"
              style={{ borderTop: '1px solid #322d2a', marginTop: 8 }}
            >
              <p className="text-[#6b5e58] text-[12px]">
                © {new Date().getFullYear()} Kan-do. All rights reserved.
              </p>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}

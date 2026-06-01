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
      { title: 'Auth system', tag: 'High', color: '#ef4444' },
      { title: 'Prompt gen', tag: 'High', color: '#ef4444' },
    ],
  },
  {
    title: 'In Progress',
    cards: [
      { title: 'Dashboard UI', tag: 'Medium', color: '#f59e0b' },
    ],
  },
  {
    title: 'Done',
    cards: [
      { title: 'API setup', tag: 'Done', color: '#22c55e' },
    ],
  },
];

function MiniBoardVisual() {
  return (
    <div>
      <div className="bg-[#161412] rounded-xl border border-[#322d2a] p-4 shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded bg-purple-600 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-[9px]">K</span>
          </div>
          <span className="text-[#f5f0ee] text-xs font-medium">My Project</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {HERO_COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-[#6b5e58] text-[10px] font-medium uppercase tracking-wide mb-2 px-0.5">
                {col.title}
              </p>
              <div className="space-y-2">
                {col.cards.map((card) => (
                  <div
                    key={card.title}
                    className="bg-[#231f1c] rounded-lg p-2 border border-[#322d2a]"
                    style={{ borderLeft: `3px solid ${card.color}` }}
                  >
                    <p className="text-[#f5f0ee] text-[11px] font-medium leading-snug mb-1.5">
                      {card.title}
                    </p>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                      style={{ backgroundColor: `${card.color}22`, color: card.color }}
                    >
                      {card.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prompt chip */}
      <div className="mt-3 flex items-center gap-2 bg-[#231f1c] border border-purple-600/30 rounded-lg px-3 py-2.5 shadow-lg">
        <div className="w-5 h-5 rounded bg-purple-600/20 flex items-center justify-center shrink-0">
          <svg className="w-3 h-3 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
        <p className="text-[#a89890] text-[11px]">
          Prompt generated from{' '}
          <span className="text-purple-400 font-medium">"Auth system"</span>{' '}
          card — ready to use
        </p>
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
      icon: (
        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      pro: true,
      title: 'From card to prompt in one click',
      body: 'Every card field — title, description, checklist, notes, priority — becomes a structured directive. Five instruction styles for different task types.',
    },
    {
      icon: (
        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      pro: true,
      title: 'Give your AI agent a seat at the board',
      body: 'Claude Code connects directly to your boards via MCP. Your agent reads card context automatically — no copy-pasting, no re-explaining.',
    },
    {
      icon: (
        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      ),
      pro: false,
      title: 'All the Kanban you need. None of the bloat.',
      body: 'Drag-and-drop boards, real-time collaboration, WIP limits, due dates, attachments, and activity feeds. No enterprise pricing, no feature tax.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#161412] text-[#f5f0ee]">
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-[#161412] border-b border-[#322d2a]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <span className="text-[#f5f0ee] font-semibold">Kan-do</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-[#a89890] hover:text-[#f5f0ee] text-sm transition-colors">Features</a>
            <a href="#pricing" className="text-[#a89890] hover:text-[#f5f0ee] text-sm transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAuthOpen(true)}
              className="px-3 py-1.5 text-sm text-[#a89890] border border-[#4a4240] rounded-lg hover:text-[#f5f0ee] hover:border-[#6b5e58] transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => setAuthOpen(true)}
              className="px-3 py-1.5 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Get started free
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(135deg, #231f1c, #161412)' }} className="border-b border-[#322d2a]">
        <div className="max-w-6xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-purple-400 mb-6"
              style={{ background: 'rgba(147,51,234,0.18)', border: '0.5px solid rgba(147,51,234,0.30)' }}
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              AI-native project management
            </div>

            <h1 className="text-[32px] font-[500] leading-tight mb-4 text-[#f5f0ee]">
              Your Kanban board
              <br />
              <span style={{
                background: 'linear-gradient(90deg, #c084fc, #f472b6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                has a brain now
              </span>
            </h1>

            <p className="text-[#a89890] text-[14px] leading-[1.7] mb-3 max-w-md">
              Kan-do turns your task cards into AI-ready prompts — so you spend less time explaining your work and more time shipping it.
            </p>

            <p className="text-[#6b5e58] text-[12px] leading-[1.7] mb-8 max-w-md">
              Built for developers, solopreneurs, and small teams done paying enterprise prices for tools they barely use.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-8">
              <button
                onClick={() => setAuthOpen(true)}
                className="px-5 py-2.5 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-lg"
              >
                Start free — no credit card
              </button>
              <a
                href="#features"
                className="flex items-center gap-2 px-5 py-2.5 text-sm text-[#a89890] border border-[#4a4240] rounded-lg hover:text-[#f5f0ee] hover:border-[#6b5e58] transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                See it in action
              </a>
            </div>

            {!waitlistDone ? (
              <form onSubmit={handleWaitlist} className="flex gap-2 max-w-sm">
                <input
                  type="email"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 px-3 py-2 text-sm rounded-lg text-[#f5f0ee] placeholder-[#6b5e58] focus:outline-none focus:border-purple-600 transition-colors"
                  style={{ background: '#231f1c', border: '1px solid #4a4240' }}
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-purple-400 rounded-lg hover:bg-purple-600/20 transition-colors whitespace-nowrap"
                  style={{ background: 'rgba(147,51,234,0.12)', border: '1px solid rgba(147,51,234,0.30)' }}
                >
                  Join waitlist
                </button>
              </form>
            ) : (
              <p className="text-sm text-purple-400 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                You're on the list — founding members get 3 months Pro free.
              </p>
            )}
          </div>

          <div className="hidden lg:block">
            <MiniBoardVisual />
          </div>
        </div>
      </section>

      {/* ── Social proof ───────────────────────────────────────────────────── */}
      <section className="bg-[#231f1c] border-b border-[#322d2a]">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex flex-wrap items-center justify-center gap-8">
            {[
              'Built on Firebase',
              'Deployed on Vercel',
              'Powered by Claude AI',
              'Built on Firebase — SOC-2 certified infrastructure',
              'Free to start',
            ].map((item) => (
              <span key={item} className="flex items-center gap-1.5 text-[#6b5e58] text-xs font-medium">
                <span className="w-1 h-1 rounded-full bg-purple-600 shrink-0" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem statement ──────────────────────────────────────────────── */}
      <section id="features" className="bg-[#161412] border-b border-[#322d2a]">
        <div className="max-w-[480px] mx-auto px-6 py-20 text-center">
          <p className="text-purple-400 text-[11px] font-medium uppercase tracking-widest mb-5">The problem</p>
          <h2 className="text-[22px] font-[500] text-[#f5f0ee] leading-snug mb-5">
            You're managing tasks in one tool and prompting AI in another. That context gap is killing your momentum.
          </h2>
          <p className="text-[#a89890] text-[14px] leading-[1.7]">
            Every time you switch to an AI tool, you're re-explaining your project, your stack, your constraints. Kan-do closes that gap — your card <em>is</em> the prompt. One click turns task context into a directive your AI can act on immediately.
          </p>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section className="bg-[#231f1c] border-b border-[#322d2a]">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid md:grid-cols-3 gap-6" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            {featureCards.map((card) => (
              <div key={card.title} className="bg-[#161412] rounded-xl border border-[#322d2a] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-purple-600/20 flex items-center justify-center">
                    {card.icon}
                  </div>
                  {card.pro && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium text-purple-400"
                      style={{ background: 'rgba(147,51,234,0.18)', border: '0.5px solid rgba(147,51,234,0.30)' }}
                    >
                      Pro
                    </span>
                  )}
                </div>
                <h3 className="text-[#f5f0ee] font-[500] text-[15px] mb-2">{card.title}</h3>
                <p className="text-[#a89890] text-[13px] leading-[1.7]">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────────── */}
      <section id="pricing" className="bg-[#161412] border-b border-[#322d2a]">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <p className="text-purple-400 text-[11px] font-medium uppercase tracking-widest text-center mb-4">Pricing</p>
          <h2 className="text-[22px] font-[500] text-[#f5f0ee] text-center mb-12">Simple. No surprises.</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#231f1c] rounded-xl border border-[#322d2a] p-8 flex flex-col">
              <div className="mb-6">
                <p className="text-[#a89890] text-sm mb-1">Free</p>
                <p className="text-[#f5f0ee] text-3xl font-[500]">$0</p>
                <p className="text-[#6b5e58] text-xs mt-1">Forever free on 3 boards</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {freeFeatures.map((f) => (
                  <li key={f.text} className="flex items-center gap-2.5 text-sm">
                    {f.included ? (
                      <svg className="w-4 h-4 shrink-0 text-[#4ade80]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 shrink-0" style={{ color: '#4a4240' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span style={{ color: f.included ? '#a89890' : '#4a4240' }}>{f.text}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setAuthOpen(true)}
                className="w-full py-2.5 text-sm font-medium text-[#a89890] border border-[#4a4240] rounded-lg hover:text-[#f5f0ee] hover:border-[#6b5e58] transition-colors"
              >
                Get started free
              </button>
            </div>

            <div className="bg-[#231f1c] rounded-xl border-2 border-purple-600 p-8 flex flex-col relative">
              <div className="absolute top-4 right-4">
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium text-purple-400"
                  style={{ background: 'rgba(147,51,234,0.18)', border: '0.5px solid rgba(147,51,234,0.30)' }}
                >
                  Most popular
                </span>
              </div>
              <div className="mb-6">
                <p className="text-[#a89890] text-sm mb-1">Pro</p>
                <p className="text-[#f5f0ee] text-3xl font-[500]">
                  $10<span className="text-lg text-[#a89890] font-normal">/mo</span>
                </p>
                <p className="text-purple-400 text-xs mt-1">or $96/year — save 20%</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {proFeatures.map((f) => (
                  <li key={f.text} className="flex items-center gap-2.5 text-sm">
                    <svg className="w-4 h-4 shrink-0 text-[#4ade80]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-[#a89890]">{f.text}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setAuthOpen(true)}
                className="w-full py-2.5 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Start Pro
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(135deg, #231f1c, #161412)' }} className="border-b border-[#322d2a]">
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <h2 className="text-[22px] font-[500] text-[#f5f0ee] mb-4">
            Your next project deserves a smarter board.
          </h2>
          <p className="text-[#a89890] text-[14px] leading-[1.7] mb-8">
            Join developers and solopreneurs done switching between tools to get things done.
          </p>
          <button
            onClick={() => setAuthOpen(true)}
            className="px-8 py-3 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-lg mb-3"
          >
            Start free — no credit card required
          </button>
          <p className="text-[#6b5e58] text-xs">Free forever on 3 boards. Upgrade anytime.</p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-[#231f1c]">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-purple-600 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">K</span>
                </div>
                <span className="text-[#f5f0ee] font-semibold text-sm">Kan-do</span>
              </div>
              <p className="text-[#6b5e58] text-xs leading-relaxed">
                AI-native project management for developers and solopreneurs.
              </p>
            </div>

            <div>
              <p className="text-[#6b5e58] text-xs font-medium uppercase tracking-wide mb-3">Legal</p>
              <ul className="space-y-2">
                {['Terms of Service', 'Privacy Policy', 'Cookie Policy', 'AI Usage Policy'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-[#6b5e58] hover:text-[#a89890] text-xs transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[#6b5e58] text-xs font-medium uppercase tracking-wide mb-3">Contact</p>
              <ul className="space-y-2">
                {[
                  { label: 'support@kan-do.app', href: 'mailto:support@kan-do.app' },
                  { label: 'X / Twitter', href: '#' },
                  { label: 'IndieHackers', href: '#' },
                  { label: 'ProductHunt', href: '#' },
                ].map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-[#6b5e58] hover:text-[#a89890] text-xs transition-colors">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-[#322d2a] pt-6">
            <p className="text-[#6b5e58] text-xs text-center">
              © {new Date().getFullYear()} Kan-do. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

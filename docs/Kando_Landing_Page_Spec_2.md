# Kan-do — Landing Page Implementation Spec

**Version 2** · Generated May 31, 2026 at 08:47 AM EDT · Confidential · Build brief for the marketing landing page (Phase 1)

> Updated from v1 with pre-build review decisions: Loops prerequisite added, Demo nav link removed, SOC-2 claim corrected, annual pricing confirmed.

---

## 1. Overview & Scope

Replace the current signup-only screen with a full marketing landing page that leads with Kan-do's AI differentiation. This is the front door — it must be live before driving any traffic or launching the waitlist.

### In scope

- New marketing landing page at the root route, with the existing auth flow reachable from it
- Eight sections: nav, hero, social proof bar, problem statement, features, pricing, final CTA, footer
- Waitlist email capture embedded in the hero (goes live with the page, not after)
- App's exact dark color system and Geist display font

### Out of scope

- No changes to app UI, board view, card modal, or component internals (that is Phase 2)
- No changes to the data layer, Firestore schema, or auth logic
- No 14-day trial implementation at launch — keep messaging as "Free forever on 3 boards"

**Stack:** React + Tailwind, deployed on Vercel. The page is a standalone marketing surface — keep it isolated from app logic.

---

## 2. Color Tokens

Use these exact values — they match the production app dark theme. Define them as Tailwind theme extensions or CSS custom properties so they are reusable in Phase 2.

| Role | Hex | Usage |
|---|---|---|
| Page background | `#161412` | Outer page, alternating sections |
| Surface / cards | `#231f1c` | Hero bg, feature cards, footer, pricing cards |
| Borders / dividers | `#322d2a` | All borders and section dividers |
| Input / ghost borders | `#4a4240` | Ghost button borders, muted icons |
| Primary purple | `#9333ea` | CTAs, Pro badge, logo, Pro card border |
| Accent purple | `#c084fc` | Section labels, eyebrow, gradient start, annual price |
| Gradient pink | `#f472b6` | Gradient text end (headline span) |
| Body text | `#a89890` | Body copy, descriptions, nav links |
| Muted text | `#6b5e58` | Footer copy, micro-copy, column headers |
| Primary text | `#f5f0ee` | Headings, card titles, nav logo |

### Gradient treatments

```css
/* Headline gradient text (the second line span) */
background: linear-gradient(90deg, #c084fc, #f472b6);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
background-clip: text;

/* Hero + final CTA section background */
background: linear-gradient(135deg, #231f1c, #161412);

/* Eyebrow pill + Most popular badge */
background: rgba(147,51,234,0.18);
color: #c084fc;
border: 0.5px solid rgba(147,51,234,0.30);
```

---

## 3. Typography

- Headings / display: **Geist** (load via next/font or self-host). Cal Sans is an acceptable display alternative for the hero headline.
- Body: Geist or the app's existing sans stack — keep consistent with the app.
- Hero H1 ~30-32px / weight 500; section H2 ~20-22px / 500; body 12-14px / 400; line-height ~1.6-1.7.
- Sentence case throughout. Two weights only (400 / 500). Ensure fonts degrade gracefully if loading fails.

---

## 4. Page Structure

Eight sections, top to bottom. Section backgrounds alternate between `#161412` and `#231f1c` for visual rhythm.

### 4.1 Nav bar

- Left: logo badge (`#9333ea` rounded square, white "K") + "Kan-do" wordmark (`#f5f0ee`)
- Center: **Features | Pricing** links (`#a89890`)
- Right: "Sign in" ghost button (`#4a4240` border) + "Get started free" solid purple button
- Background `#161412`, bottom border `#322d2a`. Minimal — should not compete with the hero.

> **Demo nav link intentionally omitted at launch.** Re-add when a demo (Loom walkthrough or sandbox board) is available. Do not ship a placeholder `#` link.

### 4.2 Hero (two-column)

**Left column — copy + waitlist**

- Eyebrow pill: "AI-native project management" with a sparkles icon
- H1: "Your Kanban board" / "has a brain now" — second line uses the gradient text treatment
- Subheadline: "Kan-do turns your task cards into AI-ready prompts — so you spend less time explaining your work and more time shipping it."
- Support line (`#6b5e58`): "Built for developers, solopreneurs, and small teams done paying enterprise prices for tools they barely use."
- Primary CTA: "Start free — no credit card" | Secondary CTA: "See it in action" (ghost, play icon)
- Waitlist email capture: email input + "Join the waitlist" button + live signup count for social proof

**Right column — live board visual**

- Mini Kanban board (Todo / In progress / Completed) using real card examples
- Below the board: a purple prompt chip — "Prompt generated from 'Security' card — ready to use"
- This visual is the strongest asset — it communicates the core value instantly. A subtle animation of a card selection + prompt generation is a strong enhancement.

### 4.3 Social proof bar

- Single centered row on `#231f1c`: Built on Firebase, Deployed on Vercel, Powered by Claude AI, **Built on Firebase — SOC-2 certified infrastructure**, Free to start
- *Note:* The security claim is infrastructure-accurate — Firebase/Firestore is SOC-2 certified; Kan-do itself is not certified. Do not claim Kan-do is SOC-2 certified.
- Replace with a real user count ("Joined by 500+ developers") once the waitlist has numbers

### 4.4 Problem statement

- Section label: "The problem" (`#c084fc`, uppercase, letter-spaced)
- H2: "You're managing tasks in one tool and prompting AI in another. That context gap is killing your momentum."
- Body explains the context-switching pain and how Kan-do closes the gap. Max ~480px width for readability.

### 4.5 Features (3-card grid)

- **Card 1 (Pro badge):** "From card to prompt in one click" — AI prompt generation
- **Card 2 (Pro badge):** "Give your AI agent a seat at the board" — Claude Agent MCP access
- **Card 3:** "All the Kanban you need. None of the bloat." — core features
- AI features lead; Kanban basics last. Each card: icon tile, optional Pro badge, title, 2-3 line body.
- Use `minmax(0, 1fr)` columns to prevent grid overflow.

### 4.6 Pricing (two columns)

- **Free:** $0, "Forever free on 3 boards", checklist with AI features crossed out
- **Pro:** $10/month, "or $96/year — save 20%", "Most popular" badge, 2px `#9333ea` border, all features checked
- Pro CTA copy at launch: "Get started free" / "Start Pro" — do NOT advertise a 14-day trial
- Checks `#4ade80`, crosses `#4a4240`

### 4.7 Final CTA

- Centered on the hero gradient background
- H2: "Your next project deserves a smarter board."
- Sub: "Join developers and solopreneurs done switching between tools to get things done."
- Button: "Start free — no credit card required" + micro-copy "Free forever on 3 boards. Upgrade anytime."

### 4.8 Footer

- Three columns: brand + tagline, Legal (ToS, Privacy, Cookie, AI Usage), Contact (support email, X, IndieHackers, ProductHunt)
- Bottom: copyright line on `#231f1c` with `#322d2a` top border

---

## 5. Waitlist Integration

> **Prerequisite:** Loops account active, API key in Vercel env vars, waitlist list ID confirmed. The waitlist form and confirmation flow cannot be implemented until these exist.

- Email capture lives in the hero and ships with the page
- Store emails via **Loops** (confirmed vendor; also used later for notification + lifecycle emails) — one vendor
- Display a live signup count beneath the form for social proof momentum
- Founding member offer in confirmation copy: "3 months Pro free for founding members"
- Send a warm-up sequence: welcome, behind-the-scenes, feature preview, launch announcement
- Do NOT auto-create accounts from the waitlist — collect email only; users create accounts themselves at launch

---

## 6. Technical Requirements

- React + Tailwind; single marketing route isolated from app logic
- Fully mobile responsive — stack the hero columns vertically on small screens; verify on iOS Safari and Android Chrome
- Connect "Get started free" and "Sign in" to the existing auth flow
- Geist via next/font (or self-hosted) with graceful fallback
- Keep the page lightweight — defer non-critical assets; target fast first paint
- Deploy to Vercel; verify on the production URL before announcing
- Reuse the color tokens as Tailwind theme values so Phase 2 (app modernization) inherits them

---

## 7. Acceptance Criteria

- [ ] All eight sections render top-to-bottom matching the agreed mockup layout
- [ ] Exact hex color tokens applied (see Section 2) — no off-palette colors
- [ ] Hero headline uses the purple-to-pink gradient text treatment
- [ ] AI features lead the feature section; Kanban basics last
- [ ] Pricing shows $10/mo and $96/yr; no 14-day trial messaging
- [ ] Nav shows Features | Pricing only — no Demo link
- [ ] Social proof reads "Built on Firebase — SOC-2 certified infrastructure" — no unqualified SOC-2 claim
- [ ] Waitlist email capture works and stores to Loops with a live count
- [ ] Fully responsive on iOS Safari and Android Chrome
- [ ] Get started free + Sign in route correctly into the existing auth flow
- [ ] Deployed and verified on the production Vercel URL

---

## 8. Reference

- Layout and copy: the color-matched landing page mockup produced in consultation
- Messaging source of truth: the Marketing Notes card on the Kanban-app Features board
- Track: Marketing (green) — runs in parallel with the engineering track; does not block or depend on Stripe/MCP work
- **Dependencies:** Loops account provisioned (Section 5); board #4 enforcement must be live before the "Start free" CTA leads to real account creation at launch (see roadmap Launch Gate)

---

## Change Log

- **v1:** Initial landing page implementation spec.
- **v2 (May 31, 2026, 08:47 AM EDT):** Annual pricing confirmed ($96/yr — no copy change). Loops prerequisite added to §5. Demo nav link removed from §4.1 (re-add when demo exists). SOC-2 claim in §4.3 replaced with "Built on Firebase — SOC-2 certified infrastructure." Acceptance criteria updated for Demo and SOC-2.

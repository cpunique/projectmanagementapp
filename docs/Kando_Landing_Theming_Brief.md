# Kan-do — Landing Page Theming & Dark Mode Brief

**Date:** May 31, 2026, 11:33 PM EDT
**For:** Development
**Re:** Landing page has no dark mode toggle — clarifying intent before any work
**Related:** Pairs with `Kando_Landing_Visual_Polish_Brief.md` and `Kando_Landing_Richer_Reference.html`

---

## Context

The landing page that shipped has no light/dark theming. Before we add anything, I want to confirm intent rather than treat this as a straight bug — because the answer differs for the landing page versus the app itself.

---

## The key distinction

The 2026 aesthetic in the reference file — gradient mesh, ambient glow, glassmorphism — is **fundamentally a dark-mode design**. Those effects don't translate to a light background: glow doesn't read on white, and glass loses its depth. A light variant of this specific design would water down the exact qualities that make it feel premium.

So this isn't really "add dark mode." It's two separate decisions for two separate surfaces.

---

## Decision 1 — Landing page theming

**My direction: dark-only landing page.**

- The marketing page stays dark, matching the reference aesthetic. No light variant, no toggle.
- Rationale: the landing page is a ~30-second first impression. Brand impact and visual consistency matter more here than user theme preference. The dark aesthetic *is* the brand.
- Many modern dark-aesthetic SaaS products do exactly this — dark-only marketing page, with theming reserved for the app.

**What I need from you:** Confirm this works, or flag if there's a reason to build a light variant anyway (SEO, accessibility, a specific audience expectation I'm not seeing). If we go dark-only, make sure the page explicitly sets a dark theme rather than inheriting the user's system preference — so a user with light-mode OS settings still sees the intended dark design.

---

## Decision 2 — App theming (separate, not part of this pass)

The **app itself** (board view, cards, modals) is a different question. There, users spend extended time working, so a light/dark toggle is a legitimate feature with real preference value.

- Current state: the app appears to be dark-only (the color tokens are all dark-mode values).
- This is **not** part of the landing page work — flagging it as a separate, future consideration.

**What I need from you:** No action now. Just confirm whether the app currently supports light mode at all, or if it's dark-only today. That tells us whether "app light mode" is a future feature to scope (likely Phase 2 or later) or already partially there.

---

## Summary of asks

| # | Surface | Direction | Action needed |
|---|---|---|---|
| 1 | Landing page | Dark-only by design | Confirm, or flag a reason to build light. Ensure page forces dark regardless of system preference. |
| 2 | App | Light/dark toggle is a future consideration | No action now — just confirm current app theme support (dark-only vs. has light mode) |

---

## Why I'm framing it this way

I don't want you to build a light-mode landing page that undercuts the design we just aligned on. The "flat" problem we're fixing with the visual polish brief is a dark-design problem — a light variant would reintroduce flatness in a different form. Let's get the dark design right first, keep the marketing page dark-only, and treat app theming as its own scoped conversation down the line.

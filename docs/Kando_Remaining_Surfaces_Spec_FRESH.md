# Kan-do — Remaining Surfaces Modernization (Fresh Spec for New Chat)

**Date:** June 7, 2026, 12:44 PM EDT
**Purpose:** Self-contained handoff to continue the app modernization in a new chat. Covers the toolbar consolidation + all remaining surfaces, plus the context and hard-won lessons from the work so far.

---

## Project context

**Kan-do** — AI-native Kanban SaaS/PWA. Stack: React/Next, Tailwind, Firebase/Firestore, Node, Vercel. MCP server on Railway. Live at projectmanagementapp-gamma.vercel.app; dev at localhost:3000 (real-phone testing via LAN IP). Dev work is done by **Claude Sonnet in Claude Code** (VS Code), reading spec + mockup files from `kanban_app/docs`.

**The modernization goal:** dark-first 2026 aesthetic — glass, glow, elevation; Linear-level restraint. Flatness is a DEPTH problem, not a color problem: fix with elevation/glass/selective accent, not more color. Glow only on active/primary states. Every surface responsive (desktop + mobile/PWA designed together, not retrofitted).

---

## Done so far (do NOT redo)

- Landing page (deployed)
- Board view — desktop + mobile (full responsive, swipe-pager, bottom tab bar, FAB)
- Calendar view (elevated panel, today = glowing purple circle, priority event chips; mobile = agenda list)
- Due Dates panel (modernized slide-in: elevated cards, surface-2, colored left-border by priority)
- All three modals: **Login, Edit Card, Generate Instructions** — full glass treatment, complete

## Remaining (this spec)

- **#4 Toolbar consolidation** (desktop)
- **#5 Remaining surfaces:** settings, analytics/dashboard, onboarding modal, search, alerts panel

---

## The token + elevation foundation (already built — reuse, don't redefine)

```
--bg #161412 (+ faint ambient mesh)  →  page background
--surface-1 #1d1a17                   →  panels / columns / containers
--surface-2 #231f1c                   →  cards / elevated items
--surface-3 #2a2522                   →  count badges, raised chips
--border #322d2a                      →  borders/dividers
--border2 #4a4240                     →  stronger borders / input borders
--text #f5f0ee · --body #a89890 · --muted #6b5e58
--purple #9333ea · --purple-light #c084fc · --pink #f472b6
--glow rgba(147,51,234,.45)
Level-2 shadow: 0 4px 14px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05)
Priority colors: red #fb7185 · amber #fbbf24 · green #4ade80 · blue #60a5fa
```

Every surface uses these. No hardcoded colors (keeps light mode a future `[data-theme="light"]` flip).

---

## The proven glass-modal pattern (solved the hard way — reuse for any new modal)

The onboarding modal (and any future modal) should reuse this exact pattern, which took significant debugging to get right:

1. **backdrop-filter breaks under transform.** Framer Motion applies `transform` to animated elements, which silently disables `backdrop-filter` (renders as `none`). **Fix:** split them — animation on an OUTER `motion.div`, glass on an INNER static div with NO transform.
2. **Glass goes on the VISIBLE panel,** not a layer behind a solid one. Remove any old opaque `bg-white/dark:bg-gray-800` classes from the visible panel.
3. **Fixed-height container with frozen header/footer + scrollable body** — so the glass always covers what's visible and you never scroll past it:
   ```css
   .modal { position:relative; max-height:85vh; display:flex; flex-direction:column;
     background:rgba(42,37,34,.7); backdrop-filter:blur(24px) saturate(1.2);
     -webkit-backdrop-filter:blur(24px) saturate(1.2);
     border:1px solid rgba(255,255,255,.09); border-radius:18px;
     box-shadow:0 24px 60px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.08);
     overflow:hidden; }
   .modal-header { flex-shrink:0; }   /* frozen; close × INSIDE panel, top/right:16px */
   .modal-body   { flex:1; overflow-y:auto; min-height:0; }   /* only this scrolls */
   .modal-footer { flex-shrink:0; }   /* frozen; primary action = glow, secondary = subtle */
   ```
4. **Backdrop overlay** behind the modal (`rgba(0,0,0,.5)` full-screen) so the page is dimmed.
5. **Interior elements get the treatment too** — not just the frame. Inputs: `rgba(22,20,18,.6)` bg, `--border2`, purple focus ring (`border-color:var(--purple-light); box-shadow:0 0 0 3px rgba(147,51,234,.18); outline:none`). Active tabs/primary buttons get the glow.
6. **Section vs. field distinction:** section headings = 11px/600 uppercase `--purple-light` + elevated `.modal-section` container (`rgba(35,31,28,.4)` bg, border, radius:12px, padding:14px). Field labels inside sections stay plain/subordinate — don't promote them to section headings.

---

## #4 — Toolbar consolidation (desktop)

The desktop top icon row is a dense ~dozen-icon strip. Consolidate:
```
Primary (always visible, well-spaced):
  Board/Calendar toggle (active = purple + glow) · Search · Notifications (badge) · Profile/avatar
Secondary (group into overflow "•••" menu):
  archive, analytics/charts, help, settings, and other low-frequency tools
Zoom %: move into a view menu or discreet corner control, not the main bar
```
4-5 primary actions with breathing room reads modern; a dozen equal-weight icons reads cluttered. Mobile nav is already done (bottom tab bar) — this is desktop only.

---

## #5 — Remaining surfaces

Apply the token + elevation + restraint system so every surface feels like one app:

- **Settings** (incl. the **Claude Agent API Token** screen): grouped sections on elevated panels, token-styled inputs, primary actions with glow. This is also the new home for the **legal links** (Terms/Privacy/Cookie/AI-Usage) that were removed from the mobile board view. For the API token screen specifically: "Generate token" should output a complete ready-to-run `claude mcp add ...` CLI command with the token embedded (one-and-done copy/paste — target client is Claude Code CLI).
- **Analytics / dashboard:** panels on `surface-1`, metric cards on `surface-2` with Level-2 shadow; charts use the accent palette; crisp numbers with weight hierarchy. Mobile: panels stack to single column.
- **Onboarding modal:** reuse the proven glass-modal pattern above.
- **Search:** elevated input + results on `surface-2`; mobile = full-screen.
- **Alerts / notifications panel:** elevated cards — reuse the Due Dates item pattern (`surface-2`, shadow, colored left-border by priority).
- **Any dropdowns / popovers / toasts:** glass + elevation, consistent. (Note: native `<select>` option styling is limited cross-browser — `option { background:var(--surface-2); color:var(--text); }` handles most cases; a custom dropdown is only worth it if pixel-perfect control is required.)

---

## Global rules

- Theme tokens only — no hardcoded colors
- Depth/elevation reads clearly — **calibrate richer than feels necessary** (on every prior surface it came back too subtle the first pass)
- Glow only on active/selected/primary states
- Every surface responsive: desktop + mobile together (modals → sheets, panels stack, 44px touch targets, safe areas)
- Respect `prefers-reduced-motion`; animate only transform/opacity; `backdrop-filter` fallback (solid surface)
- No functional/logic changes — visual + structural only
- **Checkpoint after EACH surface before going wide** — don't build all five flat. (This discipline caught every major issue in the board/modal work.)
- Real-device check (iOS Safari + Android Chrome) for anything with a mobile layout

---

## Process lessons (what made the prior work succeed)

- **Build from the mockup's literal CSS values** — open the .html mockup and copy values; don't approximate from screenshots. This single thing broke every stuck cycle.
- **Sonnet, not Haiku** — Haiku regresses nuanced visual work. If Sonnet context runs low, continue in a fresh Sonnet window; don't fall back to Haiku.
- **Distinguish styling vs. layout problems** — e.g. the mobile board's "flat" issue was styling, but the "narrow centered band" and "left skew" were layout (column not viewport-width; scrollbar eating the right gutter).
- **Don't match the mockup's fake phone frame at the screen edges** — the app correctly sits below the OS status bar; PWA standalone mode handles full-screen. Match the mockup for layout/spacing/color/depth, not device-edge behavior.
- **Mockups are communication tools** — iterate the mockup with the founder first, THEN hand the dev a locked target.

---

## Suggested order

1. Toolbar consolidation (finishes the board environment)
2. Settings (holds the API token screen + relocated legal links)
3. Onboarding modal (fast — reuses the glass modal pattern)
4. Alerts panel (fast — reuses the Due Dates card pattern)
5. Analytics/dashboard
6. Search

Checkpoint each before the next.

---

## After modernization — the engineering critical path (what's next, post-visual)

Once all surfaces are modernized, pivot back to launch-gating work:
- Stripe test mode → 3-board enforcement (free tier) → **featureGate.ts cleanup (remove hardcoded UID list — MUST precede Stripe live keys)** → cancellation/downgrade handling → Stripe live keys → MCP Phase B (Pro gating, revocation on cancel, audit logging)
- Operational prereq: Loops account + API key + waitlist audience before the waitlist goes live
- Landing fast-follow: Loom demo behind "See how it works"

(Decisions already locked: $10/mo Pro, $96/yr annual; Free = 3 boards/unlimited cards; AI features Pro, assignees/calendar/notifications free; 30-day downgrade grace, MCP revoked immediately; no trial at launch; Stripe US-only + Stripe Tax; Loops email vendor.)

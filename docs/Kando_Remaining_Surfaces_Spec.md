# Kan-do — Remaining Surfaces Modernization (for Claude Code / Sonnet)

**Date:** June 6, 2026, 03:09 PM EDT
**For:** Development / Sonnet
**Re:** Modernize all remaining app surfaces, applying the established board pattern
**Status:** Board view (desktop + mobile) is done and matches its mockups. This doc covers everything still flat.

**Reference files (open these — match the literal CSS values):**
- `Kando_Calendar_Modernized_Mockup.html` — the calendar target
- `Kando_Default_Board_Modernized_Mockup.html` — board / desktop card + column pattern (already built; reuse for consistency)
- `Kando_App_Modernization_Mockups.html` — component patterns incl. login + edit-card modal glass treatment

---

## How to do this pass

Open the reference mockups and copy the literal CSS values. Don't approximate from screenshots. Everything reuses the theme tokens and elevation system already in place from the board pass — these surfaces should *inherit* that foundation, not reinvent it. (Reference files use Inter as a Geist stand-in — use real Geist in production.)

The recurring lesson, restated: **build from the mockup CSS values, and calibrate depth richer than feels necessary** — across every prior surface the depth came back too subtle on the first try.

**Model:** Sonnet, not Haiku. If context runs low, continue in a fresh Sonnet window — do not fall back to Haiku.

---

## The token + elevation foundation (already built — reuse, don't redefine)

```
--bg #161412 (+ faint ambient mesh)  →  page background
--surface-1 #1d1a17                   →  panels / columns / containers
--surface-2 #231f1c                   →  cards / elevated items
--surface-3 #2a2522                   →  count badges, raised chips
--border #322d2a                      →  borders/dividers
Level-2 shadow: 0 4px 14px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05)
glow: 0 0 18px var(--glow) on primary actions / active states
```

Every surface below uses these. The principle is the same throughout: **distinct elevation levels (bg → panel → card), crisp priority color that carries meaning, glow only on active/primary states, restraint on dense surfaces.**

---

## Implementation order

```
1. Due Dates panel        — finishes the board; small, reuses card pattern
2. Calendar view          — second primary nav tab; mockup provided
3. Login + Edit Card modals — high-frequency; glass treatment
4. Toolbar consolidation  — desktop icon row → primary + overflow
5. Remaining surfaces     — analytics, settings, onboarding, search, alerts
```

---

## 1. Due Dates panel

Currently a slide-in-from-the-right panel (triggered by the top-bar icon with the 9+ badge) with the OLD flat red-block styling.

**Decision:** keep the slide-in panel on BOTH desktop and mobile for now — just modernize the styling. (A dedicated mobile Due Dates view under the Alerts tab is a noted FUTURE enhancement, not part of this pass.)

**Panel container:**
```css
background: var(--surface-1);
border-left: 1px solid var(--border);
box-shadow: -8px 0 40px rgba(0,0,0,.5);   /* depth as it slides over the board */
backdrop-filter: blur(8px);                 /* optional, subtle */
```

**Each due-date item — elevated card (NOT a flat red block):**
```css
background: var(--surface-2);
border: 1px solid var(--border);
border-left: 3px solid [priority color];   /* red #fb7185 / amber #fbbf24 / etc. */
border-radius: 12px;
padding: 14px;
margin-bottom: 10px;
box-shadow: 0 4px 14px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05);
```
- Title in priority color, date + "Overdue" status below, the H/M priority badge, and the column/status line ("TODO", "In Progress") in muted text.
- "OVERDUE" section header: keep, style as a centered label with a hairline divider in the priority color at low opacity.
- Header: "Due Dates" title + "7 upcoming" subtext on the panel surface.

**Mobile:** the panel still slides in, full styling applied. Touch-friendly (44px tap targets on items). Respect safe areas.

---

## 2. Calendar view

Match `Kando_Calendar_Modernized_Mockup.html` exactly.

**Calendar panel (the whole grid):**
```css
background: var(--surface-1);
border: 1px solid var(--border);
border-radius: 18px;
overflow: hidden;
box-shadow: 0 10px 40px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05);
```

**Weekday header row:**
```css
background: rgba(35,31,28,.5);
border-bottom: 1px solid var(--border);
/* labels: 11px, 600, --muted, uppercase, letter-spacing .7px */
```

**Day cells:**
```css
border-right: 1px solid var(--border);
border-bottom: 1px solid var(--border);   /* token borders, not harsh lines */
/* hover: background rgba(255,255,255,.02) */
/* out-of-month cells: background rgba(0,0,0,.2), day number dimmed/opacity .4 */
```

**Today's cell:**
```css
/* day number: filled purple circle with glow */
background: var(--purple); color:#fff; width:26px; height:26px; border-radius:50%;
box-shadow: 0 0 14px var(--glow);
/* cell itself: subtle background rgba(147,51,234,.06) */
```

**Event chips (due-date items on a day):**
```css
font-size:10px; font-weight:500; padding:3px 7px; border-radius:6px;
/* leading colored dot (::before, 5px) + priority-tinted bg, matching board tag colors */
.high  → rgba(244,63,94,.16) / #fb7185
.med   → rgba(251,191,36,.16) / #fbbf24
.done  → rgba(74,222,128,.14) / #4ade80
.purple→ rgba(147,51,234,.16) / var(--purple-light)
/* overflow: "+N more" in muted text */
```

**Header:** month title (24px/600), prev/next as token buttons (`surface-2` + border), "Today" as a bordered pill, scheduled count with accent color. Remove the desktop footer links from this view.

**Mobile calendar:** a full 7-column grid doesn't fit a phone. On mobile, render an **agenda/list view** — upcoming items as a scrollable list of elevated cards (same `surface-2` card pattern), grouped by date, instead of the month grid. (Mock this if needed before building.)

---

## 3. Modals — Login + Edit Card

Apply the glass treatment from `Kando_App_Modernization_Mockups.html`.

**Modal container (both):**
```css
background: rgba(42,37,34,.7);              /* surface-3 at ~70% */
border: 1px solid rgba(255,255,255,.09);
border-radius: 18px;
backdrop-filter: blur(24px) saturate(1.2);
box-shadow: 0 24px 60px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.08);
/* + a faint radial purple glow behind the modal */
```

**Inputs/selects:**
```css
background: rgba(22,20,18,.6);
border: 1px solid var(--border2);
border-radius: 10px;
/* focus: border --purple-light + box-shadow 0 0 0 3px rgba(147,51,234,.18) */
```

**Login modal:** glass panel, tab switcher (Sign Up / Sign In — active tab gets purple + glow), purple-glow primary button ("Create Account"), keep ToS/Privacy/AI-Usage/Cookie consent rows (restyled). Google sign-in button full-width.

**Edit Card modal:** glass panel; **group fields into labeled sections** (Core: priority/due · People: assignees · Dependencies · Tags · Color · Checklist) with subtle dividers so it has rhythm instead of a uniform wall of fields. Selected color swatch gets a ring + glow. Save = accented primary; Archive/Close = secondary. Keep the "✓ Saved" auto-save indicator.

**Mobile (both modals):** become full-screen / bottom sheets, field rows stack, primary action pinned to a bottom bar that stays visible while the body scrolls. 44px touch targets.

---

## 4. Toolbar consolidation (desktop)

The desktop top icon row is still the dense ~dozen-icon strip. Consolidate:
```
Primary (always visible, well-spaced):
  Board/Calendar toggle (active = purple + glow) · Search · Notifications (badge) · Profile/avatar

Secondary (group into an overflow "•••" menu):
  archive, analytics/charts, help, zoom controls, settings, and other low-frequency tools

Zoom %: move into a view menu or a discreet corner control, not the main bar
```
- 4-5 primary actions with real breathing room read as modern; a dozen equal-weight icons read cluttered.
- Mobile nav is already done (bottom tab bar) — this item is desktop only.

---

## 5. Remaining surfaces

Apply the same token + elevation + restraint system so every surface feels like one app:
- **Analytics / health dashboard:** panels on `surface-1`, metric cards on `surface-2` with Level-2 shadow; charts use the accent palette; crisp numbers with weight hierarchy. Mobile: panels stack to single column.
- **Settings** (incl. the Claude Agent API Token screen): grouped sections on elevated panels, token-styled inputs, primary actions with glow. This is also where the **legal links** (Terms/Privacy/Cookie/AI-Usage) that were removed from the mobile board view should live.
- **Onboarding modal:** glass treatment, consistent with the other modals.
- **Search:** elevated input + results on `surface-2`; mobile = full-screen.
- **Alerts / notifications panel:** elevated cards (same pattern as Due Dates items). (Future: Due Dates may live here as a mobile view.)
- **Any dropdowns / popovers / toasts:** glass + elevation, consistent.

---

## Global rules (carry from the board pass)

- Theme tokens only — no hardcoded colors (keeps light mode a future flip)
- Depth/elevation reads clearly — calibrate richer than feels necessary
- Glow only on active/selected/primary states, not everywhere
- Every surface responsive: desktop + mobile designed together (modals→sheets, panels stack, 44px touch targets, safe areas)
- Respect `prefers-reduced-motion`; animate only transform/opacity; `backdrop-filter` fallback (solid surface)
- No functional/logic changes — visual + structural only
- Checkpoint: after EACH surface (or small group), show it before going wide — don't build all five flat
- Real-device check (iOS Safari + Android Chrome) for anything with a mobile layout

---

## Acceptance check (per surface)

- [ ] Due Dates items are elevated cards (surface-2, shadow, colored left-border) — not flat red blocks
- [ ] Calendar matches the mockup (elevated panel, today = glowing purple circle, priority event chips, soft grid); mobile = agenda list
- [ ] Login + Edit Card modals are glass; Edit Card fields grouped into sections; modals → sheets on mobile
- [ ] Toolbar consolidated to primary actions + overflow menu (desktop)
- [ ] Analytics, settings, onboarding, search, alerts all on the token + elevation system
- [ ] Legal links relocated to Settings (off the mobile board view)
- [ ] No hardcoded colors; responsive; reduced-motion + backdrop-filter fallback
- [ ] Built on Sonnet; verified on real device where applicable

---

*Open the reference mockups, read the values, match them. The board pass proved this works — same approach, every remaining surface.*

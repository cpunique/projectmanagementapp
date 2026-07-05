# Kanban App Development Guide

## Dev Server Restart Procedure

**CRITICAL: After file edits, always kill and restart cleanly.**

When the dev server becomes unresponsive or appears stale:

```bash
# Kill all node processes and clear .next cache
pkill -9 -f "next dev" 2>/dev/null
rm -rf .next

# Restart dev server
npx next dev --port 3000
```

**Why:** Next.js caches webpack chunks in `.next/`. On Windows, the file watcher may not trigger on edits. Hard refresh hits stale cache → blank pages or "Cannot read properties of undefined" errors.

**Never skip this step after edits.** If the browser shows a blank white page after code changes, this is almost certainly the issue.

## Resolved Issues (kept for history — not open)

- **System Health Modal status colors:** was caused by the `--green`/`--amber`/`--red` CSS variables not existing yet in `app/globals.css`. They're now defined (see Design Tokens below) and `components/ui/HealthDashboard.tsx` resolves `var(--green)` correctly. Resolved.
- **Duplicate board names:** boards are keyed by `board.id` everywhere, never by `board.name` — two boards can legitimately share a name. Resolved/by design; keep this invariant when touching board-lookup code.
- **Viewer write permissions (fixed 2026-07-04):** Role-based permissions are now enforced server-side on ALL write paths. The viewer/editor distinction was UI-only; Firestore rules gated board access but `canEdit()` had an `editorUserIds == null` legacy fallback that let pre-role-system boards treat all shared users as editors — viewers could write. Fixed: `canEdit() = isOwner || isEditor`, no fallback. Also tightened activities-subcollection writes to board members only (was: any authenticated user could inject feed entries). Viewer comments go through a dedicated Admin-SDK server route (`app/api/boards/[boardId]/cards/[cardId]/comment/route.ts`) that checks membership (viewers allowed, non-members 403) — comments don't open a board-write hole. All three write paths enforce role: client (Firestore rules), MCP (Admin SDK, already had it), comments (new route). Rejection-tested in prod with a real viewer account. Lesson: "server-enforced" must be verified for the SPECIFIC guarantee (access ≠ role); check EVERY write path; and audit legacy compat-fallbacks — they silently defeat security models.

## Design Tokens (`app/globals.css`)

Source of truth — verified against the stylesheet directly, don't redefine elsewhere:

- Elevation: `--bg` #161412 · `--surface-1` #1d1a17 · `--surface-2` #231f1c · `--surface-3` #2a2522
- Borders: `--border` #322d2a · `--border-2` #4a4240
- Text: `--text` #f5f0ee · `--body` #a89890 · `--muted` #6b5e58
- Accent: `--purple` #9333ea · `--purple-l` #c084fc · `--pink` #f472b6 · `--glow` rgba(147,51,234,.45)
- Status: `--green` #4ade80 · `--amber` #fbbf24 · `--red` #fb7185
- Shadows: `--shadow-1`/`--shadow-2` `0 4px 14px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05)`; `--shadow-2h` (hover, larger); `--shadow-3` (largest)
- No `--blue` token exists — blue (#60a5fa) is used as a literal value in a few places, not a CSS variable.
- Dark-only app: `--background`/`--foreground` are pinned dark and must not respond to `prefers-color-scheme`. A future `[data-theme="light"]` block is the planned light-mode mechanism — zero component rewrites needed when that happens, since everything already reads these variables.

## Glass-Modal Pattern (reuse for any new modal)

1. `backdrop-filter` breaks under transform — Framer Motion applies `transform` to animated elements, silently disabling `backdrop-filter`. Fix: animation on the OUTER `motion.div`, glass on an INNER static div with no transform.
2. Glass lives on the visible panel — no opaque `bg-white`/`dark:bg-gray-800` classes.
3. Fixed-height (`max-height: 85vh`) flex column: frozen header (`flex-shrink: 0`, × inside panel top/right 16px), scrollable body (`flex: 1`, `overflow-y: auto`, `min-height: 0`), frozen footer (primary = glow, secondary = subtle).
4. Backdrop overlay `rgba(0,0,0,.5)` dims the page behind.
5. Interior treatment: inputs `rgba(22,20,18,.6)` + `--border-2` + purple focus ring (`border-color: var(--purple-l)`; `box-shadow: 0 0 0 3px rgba(147,51,234,.18)`).
6. Section vs field: section headings = 11px/600 uppercase `var(--purple-l)` inside an elevated `.modal-section` container (`rgba(35,31,28,.4)`, border, `radius: 12px`, `padding: 14px`). Field labels inside stay plain.
7. `components/ui/Modal.tsx` has no `glass` prop anymore — it always renders the locked glass pattern (the prop used to default to `false`, which rendered a fully hardcoded white theme; this was the real cause of several "modal renders white" bugs, not a missing `dark:` class). New modals should use this shared component rather than reimplementing the pattern; a few existing modals (`AITasksModal.tsx`) apply the same values (`rgba(42,37,34,.7)` panel background) inline instead of through the shared component — functionally equivalent, just not centralized.

## Dark-Only Lock (shipped 2026-06-18)

App is locked to dark-only; light mode is deferred post-launch (the light token set was never completed).

- Root causes fixed: `Modal.tsx`'s `glass` prop default (see above); `globals.css`'s legacy `--background`/`--foreground` media-query override (deleted); `lib/store.ts`'s `setDarkMode`/`toggleDarkMode` now unconditionally coerce to `true`; pre-hydration script (`app/layout.tsx`) and `DarkModeProvider.tsx` unconditionally pin `.dark`.
- Entry points removed: ••• overflow menu dark-mode toggle (`Header.tsx`); Settings → Appearance shows a disabled "Light mode — coming soon" row (`components/settings/sections/AppearanceSection.tsx`).
- Modals rewritten onto canonical dark tokens (no `dark:` conditionals): `AITasksModal.tsx`, `ShareBoardModal.tsx` (via the shared `Modal` component), `ConflictDialog.tsx`/`ConflictMergePanel.tsx`, `BoardSwitcher.tsx`'s Create Board modal, `BoardTemplateSelector.tsx`.
- **Deferred cleanup, not broken** — these render correctly because `.dark` is permanently forced; converting them is cosmetic consistency, not a fix. Verified `dark:` occurrence counts (2026-06-21): `components/ui/HelpModal.tsx` (64), `components/legal/ToSGateModal.tsx` (27, not under `components/auth/`), `components/ui/KeyboardShortcutsModal.tsx` (14), plus other non-modal components (`Card.tsx`, `Column.tsx`, `CardModal.tsx`, `Toast.tsx`, `Tooltip.tsx`, et al.). Bundle this conversion with the future light-mode project rather than doing it twice. Cheap to fix opportunistically if already editing one of these files for an unrelated reason — don't propose converting proactively.
- Dead code: `components/settings/SettingsModal.tsx` (old MCP-token modal) — confirmed zero imports anywhere in the repo, superseded by `app/settings/`. Candidate for deletion whenever convenient.

## UI Modernization Status

The "dark-first 2026 aesthetic" pass (glass/glow/elevation, Linear-level restraint) is **complete**, not pending. As of 2026-06-21, all surfaces that were tracked as remaining are built and wired up:

- Toolbar consolidation (desktop) — `components/layout/ToolbarOverflowMenu.tsx`, imported in `Header.tsx`.
- Settings — `app/settings/page.tsx` (7 tabs: Account, Appearance, AI & Integrations, Notifications, Subscription, Advanced, About & Legal) backed by `components/settings/SettingsNav.tsx`, `SettingCard.tsx`, and `components/settings/sections/*`. `AboutLegalSection.tsx` is the relocated home for Privacy/Cookie/AI-Usage policy links.
- Analytics — `components/kanban/AnalyticsPanel.tsx`, wired into `BoardWithPanel.tsx` and the header menu.
- Onboarding — `components/onboarding/OnboardingModal.tsx`, dynamically imported in `app/page.tsx`.
- Search — `components/ui/SearchBar.tsx`, wired into `Header.tsx`.
- Alerts/notifications — `components/ui/NotificationBell.tsx`, wired into `Header.tsx`.

Locked mockup references for these (still present in `docs/`): `Kando_Toolbar_Overflow_Locked_Mockup.html`, `Kando_Settings_Locked_Mockup.html`, `Kando_Onboarding_Modal_Locked_Mockup.html`.

Goal that drove this work, for context on future visual changes: flatness is a depth problem (fix with elevation/glass/selective accent), not a color problem — glow only on active/primary states, every surface designed for desktop + mobile/PWA together.

### Process lessons from the modernization pass
- Build from the mockup's literal CSS values (open the `.html`, copy values) — don't approximate from screenshots.
- Sonnet, not Haiku, for visual work — Haiku regresses nuanced styling. If context runs low, continue in a fresh Sonnet window rather than falling back to Haiku.
- Distinguish styling vs. layout problems — e.g. a mobile "narrow band"/"left skew" turned out to be a layout bug (column instead of viewport-width, scrollbar eating the gutter), not a styling one.
- Don't match a mockup's fake phone-frame edges — the real app sits below the OS status bar; PWA standalone handles full-screen. Match layout/spacing/color/depth, not chrome.

## Free Generation Gate (`app/api/generate-prompt/route.ts`)

Server-enforced "one free AI generation (lifetime)" for non-Pro users — Firestore is the sole source of truth, the client is never trusted.

- Fields on `users/{uid}`: `isPro` (boolean), `freeGenerationUsed` (boolean, default false = eligible), `freeGenerationClaimedAt` (Firestore Timestamp, transient — deleted on finalize/release).
- Flow: read `isPro` server-side via Admin SDK → Pro is unlimited. Non-Pro: `claimFreeGeneration()` runs a Firestore transaction that checks `freeGenerationUsed`, and if unused and not already claimed, sets `freeGenerationClaimedAt` and returns `'claimed'`. The Anthropic call itself happens *outside* the transaction (deliberate — an external HTTP call inside a Firestore transaction risks duplicate calls on transaction retry under contention).
- `FREE_GEN_CLAIM_STALE_MS = 90_000` — a claim older than 90s is treated as abandoned (e.g. server crashed mid-request) and a new attempt is allowed.
- Success criterion: ≥1 generated task with a non-empty `title` triggers `finalizeFreeGeneration()` (sets `freeGenerationUsed: true`), regardless of whether the user likes the result. Any real failure (API error, empty/malformed output) calls `releaseFreeGenerationClaim()`, leaving the user still eligible.
- Responses: already-used → `403` with `{ error: 'upgrade_required' }`; a concurrent in-progress claim → `429`.
- `firestore.rules` has a `protectedUserFieldsUnchanged()` guard blocking client writes to `isPro`/`freeGenerationUsed`/`freeGenerationClaimedAt` on `users/{userId}` create/update — verified live (2026-06-21): a non-Pro client changing `freeGenerationUsed` or setting `isPro: true` on its own doc gets HTTP 403; the Admin SDK (used by this route) still writes all three fields fine, since it bypasses Security Rules entirely.
- Model id: `DEFAULT_CLAUDE_MODEL` constant (currently `claude-sonnet-4-6`), overridable via `NEXT_PUBLIC_CLAUDE_MODEL` in `.env.local`. Use a non-dated alias, not a dated snapshot (e.g. `claude-sonnet-4-20250514`) — Anthropic retires dated snapshots, which surfaces as a 404 here; aliases get redirected forward instead. `logIfModelNotFound()` in the route logs an explicit "model not found, likely retired" message on a 404 so this doesn't require log archaeology again.
- One-time backfill: `scripts/backfill-free-generation.js` (dry-run by default, `--commit` to write) — already run with `--commit` on 2026-06-21.
- Legal copy (`app/legal/ai-usage/page.tsx`, `app/legal/ai-usage/AI_USAGE_POLICY_OUTLINE.md`) states the model as "Claude Sonnet 4.6 (claude-sonnet-4-6)" — keep this in sync with `DEFAULT_CLAUDE_MODEL` if it changes again.

## MCP ENFORCEMENT LIVES IN TWO SEPARATE CODEBASES (critical — enforce security in BOTH)

Kan-do's MCP integration spans two independent, separately-deployed codebases that
share NO code. Any security boundary (board-scope, token validation, Pro-gating,
revocation) must be enforced in BOTH — a fix in one does not protect the other.

1. Next.js app (this repo) — handles MCP **WRITE** routes.
   - `app/api/mcp/boards/[boardId]/cards/route.ts` (and future update/move/comment/delete)
   - Enforcement: `lib/mcp/validateMcpToken.ts` — per-request; decodes uid, bcrypt-compares
     secret, rejects Phase-A tokens (no boardId), enforces board-scope on writes.

2. Railway MCP server (SEPARATE repo: `cpunique/kando-mcp-server`) — handles MCP **READ**
   operations (`list_boards`, `get_board`, `get_cards`, `get_card`) over SSE.
   - Separate deploy: `kando-mcp-server-production.up.railway.app`
   - Its OWN validator (`src/auth.ts` `validateToken → TokenClaims | TokenError`) — must be
     kept in sync with `validateMcpToken.ts`. Rejects Phase-A tokens; scopes all reads to
     `token.boardId` (`list_boards` returns only the token's board; `get_board`/`get_cards`/`get_card`
     reject any boardId ≠ token's).
   - Both read from the SAME Firestore `users/{uid}.mcpTokens` array (with `boardId`/`boardName`).

WHY THIS NOTE EXISTS: MCP Phase B originally scoped WRITES (Next.js) but reads silently
stayed unscoped — because reads live on the Railway server, a repo not visible when working
in the Next.js codebase. A board-scoped token could still read ALL boards until the Railway
validator was fixed separately (2026-06-30). The split is invisible unless you know to look.

RULE: For any MCP security question, ask it TWICE — "enforced in Next.js?" AND "enforced on
the Railway server (`cpunique/kando-mcp-server`)?" Fixing one repo does not fix the other.
They must be kept in sync manually.

Verified state (2026-06-30): board-scope enforced on BOTH sides, rejection-tested live —
Phase-A tokens rejected on reads+writes; Phase-B token scoped to board A cannot read or
write board B. Confirmed on the live Railway deployment, not just locally.

## AGENT COMMENT TRUTHFULNESS — conscious deferral (decided 2026-07-01)
The MCP comment route accepts any free-text content and does NOT server-verify that the
action a comment describes actually happened. The move route and comment route are
independent calls with no transactional link — an agent could post "I moved this to In
Progress" even if the move failed or was never called. Comment truthfulness therefore
relies on LLM behavior (Claude Code checks tool responses and narrates only real actions).

DECISION: Not fixing server-side comment/action verification now. Rationale — the activity
feed (fixed 2026-07-01) is now a truthful, server-written, success-only record of all MCP
agent actions (card_added/updated/moved/comment_added/card_archived, attributed to
"🤖 Claude", logged ONLY after the Firestore write succeeds). This delivers the substance of
the protection: a false comment is now DETECTABLE against the feed. True server-side
comment-text verification (parsing free-text intent and matching it to actions) is hard and
low marginal value given the feed backstop.

REVISIT server-side comment/action consistency IF: agent misbehavior or prompt-injection
producing false comments becomes a real concern before/at production. Precondition for that
backstop to hold: the activity feed must stay visible/accessible enough that users can
reconcile comments against it.

## Actor-Label Logic — Single Source of Truth

Actor-label resolution (who performed an activity) is centralized in `lib/utils/getActorLabel.ts`. Logic: `actorType === 'agent'` → `"🤖 ${agentName ?? 'Claude'}"` first; else `actorId === currentUserId` → `"You"`; else email prefix / `"Someone"`.

Was previously duplicated inline in `ActivityFeedPanel.tsx` and `CardActivityTimeline.tsx`. The duplication caused an attribution fix to half-land: the first fix corrected the board-level panel but left the card-modal timeline showing `"You moved…"` / `"You added a comment"` for MCP agent actions. The second copy was only found by grepping for the pattern.

**Lesson:** when a fix appears not to work on production despite correct data and correct code, suspect a second copy of the logic before re-fixing the first copy. Same failure class as the two-codebase MCP enforcement split — a rule enforced in one place but silently duplicated-and-unfixed elsewhere. If actor-label logic ever needs to change (new actor type, label format), edit `lib/utils/getActorLabel.ts` only — both surfaces update automatically.

## Display-Name Propagation — Deferred Product Decision

The app is currently **email-identity based**: comments, avatar initials, activity attribution, and collaborator lists all derive from the email prefix (`authorEmail.split('@')[0]`), NOT from Firebase `displayName`. Only the header user-menu dropdown and the Settings name field consume `displayName`.

Current state after Settings / Account implementation:
- `updateProfile({ displayName })` + `reloadUser()` updates the header menu and Settings name field immediately (no reload).
- Comments, avatar initials, activity feed actor labels, and collaborator lists are unchanged — they still show the email prefix and are unaffected by any name change.

**Open decision** (revisit in the collaboration/launch chapter): should `displayName` become the app-wide identity (show chosen name in comments/avatars/activity), or should the app stay email-identity and the name feature remain cosmetic (header/Settings only)?

Implications:
- Chosen names are friendlier on shared boards but ambiguous (two "Bob"s on the same board). Email is unambiguous and already displayed in tooltips/menus.
- If names propagate to comments/activity, those surfaces must snapshot `authorName` at write time (historical record — same pattern as `authorEmail` today), and avatar initials would derive from the name rather than the email.
- This is not urgent and is not a regression — the current email-identity behaviour is consistent and intentional. Not worth building until the collaborative-identity story is decided.

## Engineering Critical Path (next up)

Stripe test mode → 3-board enforcement → `featureGate.ts` cleanup (remove the hardcoded UID allowlist — must precede Stripe live keys) → cancellation/downgrade → Stripe live keys → MCP Phase B (Pro gating, revocation on cancel, audit logging). Operational prereq: Loops account + API key + waitlist audience before the landing-page waitlist goes live.

### SCALE & COLLABORATION PERFORMANCE (tracked workstream — NOT yet started)
Distinct from per-surface perceived-latency fixes (caching, loading states, lazy-loading),
which are done opportunistically as found. This is the architectural "does it hold up under
real load + concurrent collaborators" pass — expensive to retrofit, needs a deliberate
dedicated effort with load testing, NOT surface-by-surface patching. Do not start pre-launch
without the user base to test against (premature scale-optimization is its own trap), but it
is a real launch / early-launch risk and must be a deliberate decision, not a discovery.

Known candidate targets (already identified, not yet addressed):
- Eager board loading with no pagination: every login loads ALL of a user's boards' full
  nested card data into the store at once (storeSync.ts → getUserBoards). Fine at current
  scale (~28 boards); becomes a problem at hundreds of boards or many concurrent users.
  Candidate fix: pagination / lazy board-card loading / on-demand board hydration.
- Firestore read/write volume & cost at scale: denormalized boards (columns[].cards[] inline)
  mean any card change rewrites the whole board doc; high write contention on shared boards.
- Real-time collaboration under load: live presence, @mentions, shared-board sync, and
  conflict resolution behavior with MANY concurrent editors on the same board (current
  conflict handling — ConflictDialog/ConflictMergePanel — untested at scale).
- Concurrent-edit data integrity: the denormalized whole-board-doc write model + last-write
  semantics need validation under simultaneous edits from multiple users.
- Firebase connection limits / cost envelope at projected user counts.

Approach when started: load-test against realistic data (many boards/cards) and simulated
concurrent collaborators BEFORE optimizing — measure real bottlenecks, don't guess. This is
a dedicated workstream, sequenced around launch readiness, not folded into feature/visual work.

### POST-LAUNCH MILESTONE — Universal Search (Option C)
Deferred deliberately. At launch, search is Option B: two clear tools — (1) board search in
the switcher (find a board to navigate to), and (2) card search via the magnifying glass with
a This-board / All-boards scope toggle (cross-board card discovery). This resolves the
scope-confusion of having multiple overlapping search boxes.

Option C — a single universal command-style search (Cmd/Ctrl-K) that searches EVERYTHING
(boards + cards across the whole app) with type-grouped, ranked results — is the eventual
ideal end state (cf. Linear Cmd-K, Notion quick-find). Deferred because it's a real feature
project, not a modernization pass: requires unified ranked results across result types,
result-type grouping + ranking design, a new command-palette UI pattern, and keyboard nav
through mixed result types. The Option B card search (esp. the cross-board capability) is the
natural foundation C builds on — nothing is wasted by shipping B first.
Revisit post-launch as a dedicated UX milestone.
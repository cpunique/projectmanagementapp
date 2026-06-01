# Kan-do — Technical Architecture & Product Roadmap

**Version 9** · Generated May 31, 2026 at 08:47 AM EDT · Confidential · For Developer & Team Review

> Updated from v8 with all pre-build review decisions resolved (annual pricing, MCP repo structure, Firebase Admin SDK, featureGate sequencing, board #4 launch gate, MCP Phase A labeling).

---

## 1. What's Completed

Features live in production. AI task card generation now populates most card fields automatically (description, checklist, priority, notes, tags, color, due date).

| Feature | Details |
|---|---|
| Boards, columns, cards | Drag & drop, reorder, WIP limits, smart columns |
| Real-time collaboration | Live presence, @mentions, conflict resolution (3-way merge) |
| Search + filters | Full-text search, priority/tag/overdue filters |
| Board templates + JSON export | 6 templates, full board export/import |
| Card attachments | Upload files (images, PDFs, Office docs), thumbnails, download |
| Analytics + health dashboard | Card counts, priority breakdown, due date status, storage usage |
| Activity feed | Live chronological feed, unread tracking |
| Due date notifications | Local bell notifications for overdue/due-today cards |
| AI prompt generation (Pro) | Directive-style prompts from card metadata, 5 instruction styles |
| AI task card generation (Pro) | Generate card backlog from a goal; populates description, checklist, priority, notes, tags, color, dueDate |
| Onboarding modal | 3-step welcome flow for new users |
| Mobile responsive layout | Snap scrolling columns, 85vw cards, svh height fix |
| Offline support + sync | IndexedDB queue, auto-sync on reconnect, conflict detection |
| ToS / Privacy gate | Consent recorded in Firestore, gate fires on every login until accepted |
| Card detail auto-save | Auto-saves card edits — bug resolved in latest commit |

---

## 2. Product Roadmap

Two parallel tracks: an **engineering track** (billing, gating, MCP) and a **marketing track** (landing page, waitlist). They do not block each other and can run simultaneously. Sequence below reflects priority within and across both tracks.

| # | Item | Notes | Priority |
|---|---|---|---|
| 1 | Stripe payment flow (test mode) | Build in Stripe TEST mode first — free, no real money. Checkout redirect, webhooks, flip proStatus in Firestore. | High |
| 2 | 3-board free limit enforcement | Build alongside Stripe. addBoard has no guard. Board #4 must trigger upgrade modal — key conversion moment. **Must be live before waitlist converts at launch. Landing page "Free forever on 3 boards" claim is inaccurate until enforced.** | High |
| 3 | featureGate.ts — remove hardcoded UID list | Every Pro gate must read proStatus from Firestore in real time. Touches every Pro-gated component — more work than it looks. **Must be completed before Stripe live keys are enabled — not just alongside Stripe build.** | High |
| 4 | Cancellation/downgrade handling | 30-day grace, MCP revoked immediately, boards locked not deleted. Define before any user subscribes. | High |
| 5 | Annual pricing decision | **DECIDED: $96/year (20% off), added upfront in Stripe.** | High |
| 6 | MCP server hosting decision | **DECIDED: separate repo on Railway** (see Section 4.7). Cannot use Vercel — serverless times out. | High |
| 7 | Landing page implementation | Marketing track — parallel to engineering. New hero, copy, color-matched dark theme. Front door before driving traffic. | Medium |
| 8 | Waitlist setup | Email capture on landing page + founding member offer (3 months Pro free). **Loops confirmed** — account/API key/audience must be provisioned first. | Medium |
| 9 | Push/email notifications | Use Loops. Key retention mechanism before scaling acquisition. | Medium |
| 10 | User notification preferences | Build alongside #9. No preferences UI = spam complaints and domain flagging. | Medium |
| 11 | Card assignees | Unlocks team use case. Budget extra time — card view, filters, analytics changes. | Medium |
| 12 | AI generation — dependencies + assignee | Core generation already shipped. Remaining: inter-card dependencies and assignee suggestion (after assignees feature). | Medium |
| 13 | Claude Agent MCP integration | Board-level agent access via MCP on Railway (separate repo). Pro feature. Requires items 1-6. See Section 4. | Medium |
| 14 | App UI modernization (Phase 2) | Apply landing page design language to app interior. Board view + card modal first. Prompt brief finalized. | Medium |
| 15 | PWA manifest | Low effort, high value. manifest.json + install prompt. ~80% already done. | Low |
| 16 | Calendar view | Nice to have. After core team features. | Low |
| 17 | Board-level permissions UI | Self-serve role management after invite. | Low |
| 18 | Native mobile app | PWA first; native build after PWA validated. | Low |

---

## 3. Pricing & Key Decisions

Single Pro tier for launch simplicity. Tiered pricing can be introduced later from usage data.

### Pricing

| Feature | Free | Pro |
|---|---|---|
| Boards | 3 boards max | Unlimited |
| Cards | Unlimited | Unlimited |
| Real-time collaboration | Yes | Yes |
| Offline support | Yes | Yes |
| Card assignees | Yes | Yes |
| Calendar view | Yes | Yes |
| AI prompt generation | No | Yes |
| AI task card generation | No | Yes |
| Claude Agent MCP access | No | Yes |
| Push/email notifications | Yes | Yes |
| **Price** | **Free** | **$10/mo or $96/yr** |

### Decisions Log

| Decision | Outcome / Recommendation | Status |
|---|---|---|
| Pro price | $10/month, single tier | Decided |
| Free tier limit | 3 boards, unlimited cards | Decided |
| Free vs Pro features | AI features Pro; assignees, calendar, notifications free | Decided |
| Downgrade behavior | 30-day grace, read-only, MCP revoked immediately, boards locked | Decided |
| 14-day free trial | Skip at launch — keep early revenue signal clean. Revisit post-traffic. | Decided |
| Annual pricing | **$96/year (20% off), added upfront in Stripe** | **Decided** |
| MCP server hosting | **Separate repo on Railway** (Vercel can't host persistent MCP) | **Decided** |
| MCP repo structure | **Separate repository** (see 4.7) | **Decided** |
| Email vendor | **Loops** (waitlist + lifecycle + notifications) | **Decided** |
| Board #4 UX | Hard block with upgrade prompt modal | Decided |
| Payment processor | Stripe (US-only focus; Stripe Tax for US sales tax at 0.5%) | Decided |

*All pricing figures are decisions recorded for build purposes and are not financial advice.*

---

## 4. Claude Agent MCP Architecture

Pro-tier feature: provisions a Claude agent with read-only access to a user's board via the Model Context Protocol. The agent sits outside the GitHub/Vercel deployment layer — users keep full control of commits and deployment. Kan-do is the context and conversation layer only.

### 4.1 Ownership & Hosting

- Kan-do owns and builds the MCP server — it is not a third-party service.
- The MCP server is a set of API endpoints that follow Anthropic's published MCP specification (modelcontextprotocol.io).
- Claude Code and its subagents already speak MCP — both sides conform to the same published contract, so they communicate automatically.
- **CANNOT be hosted on Vercel** — serverless functions time out (10-30s) and can't hold persistent connections. Deploy separately on **Railway** (recommended), Render, or Firebase Cloud Function with keep-alive.
- Anthropic publishes official MCP SDKs (TypeScript, Python) that handle protocol boilerplate — the team builds Kan-do-specific logic (auth, data fetch, Pro gating) on top.
- **Firebase access:** The MCP server uses the **Firebase Admin SDK** (not the client SDK). Requires a service account key with Firestore read permissions (`roles/datastore.user`). Credentials stored as Railway env vars: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`. **Do not commit the service account JSON to the repo.**

### 4.2 User Flow

```
1. User generates API token in Kan-do Settings (one-time, Pro only)
2. User adds Kan-do MCP server URL + token to Claude Code config (one-time)
3. User opens a card and invokes the agent
4. Agent reads card context automatically via MCP
5. Agent generates code in chat
6. User copies output, commits to GitHub, deploys to Vercel

Kan-do --MCP--> Claude Agent --generates--> Code (user commits manually)
```

### 4.3 MCP Endpoints (read-only)

```
GET /mcp/boards               list user's boards
GET /mcp/boards/:id           board metadata + project context
GET /mcp/boards/:id/cards     all cards with full detail
GET /mcp/cards/:id            single card full context
```

### 4.4 Security Constraints

- Read-only scope — agent cannot write, update, or delete any data
- API tokens hashed (bcrypt) in Firestore — raw token never stored
- Pro subscription validated on every MCP request, not just at token generation
- Board access scoped to token owner — no cross-user access
- Session expiry on inactivity (recommended 30 min); token revocation terminates active sessions
- Immutable audit log of all agent read events
- MCP endpoints subject to same rate limits as main API

### 4.5 Firestore Additions

| Collection / Field | Purpose |
|---|---|
| `users/{uid}.mcpTokens[]` | Hashed API tokens with created/expiry timestamps |
| `users/{uid}.proStatus` | Stripe subscription status — single source of truth for Pro gating |
| `mcpSessions/{id}` | uid, boardId, cardId, createdAt, lastActiveAt, expiresAt |
| `mcpAuditLog/{id}` | uid, sessionId, action, timestamp, cardId — immutable |

### 4.6 Phased Build (validate early, gate later)

To validate core functionality before billing is in place, split the MCP build into two phases:

**Phase A** (no billing dependency — can start now):
- Railway hosting setup
- Read-only endpoints returning card/board data
- API token generation + hashing
- Claude Code config + connection test
- **Firebase service account provisioned and env vars loaded into Railway**
- *Goal: prove Claude Code can read a board and act on cards end to end.*

**Phase B** (after Stripe test mode):
- Pro gate on every MCP request
- Access revocation on cancellation
- Audit logging tied to subscription status

### 4.7 MCP Server Repository Structure

**Decision: separate repository.**

- The MCP server lives in its own repository, deployed to its own Railway project.
- Rationale: clean separation, independent deploy cadence, and it avoids Vercel and Railway both watching the same repo.
- **Shared types:** card/board TypeScript shapes are shared between the app and the MCP server. For Phase A's small read-only surface, duplication is acceptable. If the shared type surface grows, extract it into a small shared package.
- **Railway project name:** _(to be recorded by Engineering on setup)_
- **Repo name:** _(to be recorded by Engineering on setup)_

---

## 5. Stripe Implementation

### 5.1 Test Mode First — Zero Cost During Development

Stripe test mode is free. Build and validate the entire payment + Pro gating flow — including MCP access behind a test Pro subscription — before switching to live keys. Cost is zero until launch.

```
Step 1   Build Stripe integration in TEST mode (free)
Step 2   Pro enforcement against Firestore proStatus
Step 2a  featureGate.ts updated to read proStatus from Firestore in
         real time; hardcoded UID list removed. MUST complete before live keys.
Step 3   Test lifecycle: signup, Pro, cancel, downgrade
Step 4   Build MCP Phase B server endpoints (Pro gating, access
         revocation, audit logging) — Phase A endpoints already complete
         at this point
Step 5   Test agent access gated behind test Pro subscription
Step 6   Swap test keys for live keys in Vercel env vars
Step 7   Launch        (cost = zero until here)
```

### 5.2 Approach & Webhooks

- Stripe Checkout — redirect, listen for webhook, flip proStatus in Firestore
- Single product: Kan-do Pro — $10/month; **$96/year (20% off) added upfront**
- Enable Stripe Tax for US sales tax automation (0.5%/transaction)

```
checkout.session.completed     proStatus = active
customer.subscription.updated  sync plan changes
customer.subscription.deleted  begin 30-day grace period
invoice.payment_failed         notify user, begin grace period
```

### 5.3 Downgrade / Cancellation

- 30-day grace period, read-only access to Pro features
- AI prompt generation read-only after grace; AI cards visible, no new generation
- MCP agent access revoked immediately on cancellation
- Boards over free limit visible but locked — cannot add cards until within limit
- Hard cutoff after 30 days; user notified at days 1, 15, 25, 30

---

## 6. Marketing & Launch Track

Runs in parallel with engineering. Goal at this stage is **market validation, not conversion optimization.** The founder built Kan-do as a first app (extended well beyond its tutorial origin) and is testing market appetite.

> **Launch Gate:** Board #4 limit enforcement (roadmap item #2) must be verified before driving traffic that creates real accounts. The "Free forever on 3 boards" claim is not accurate until enforced.

### 6.1 Landing Page

- Replace signup-only screen with full marketing page: hero, social proof bar, problem statement, 3 feature cards, pricing, final CTA, footer
- Lead with AI differentiation — headline: "Your Kanban board has a brain now"
- Color-matched to app dark theme (#161412 bg, #231f1c surfaces, #9333ea purple, #c084fc/#f472b6 gradient text)
- Geist display font for headings; mobile responsive; deploy to Vercel
- Marketing-only — does not touch app UI, data layer, or component structure

### 6.2 Waitlist

> **Prerequisite:** Loops account, API key, and waitlist audience must be provisioned before landing page build starts.

- Email capture on landing page — go live at the same time as the page, not after
- **Loops confirmed** for waitlist + lifecycle emails (also covers notification emails later)
- Show a live signup count for social proof momentum
- Founding member offer: 3 months Pro free for waitlist signups who convert at launch
- Target 200-500 emails before launch to make ProductHunt push meaningful
- Send a warm-up email every 2-3 weeks (welcome, behind-the-scenes, feature preview, launch)
- Do NOT auto-create accounts from the waitlist — collect email only; users create accounts themselves at launch

### 6.3 Launch Channels (3-5 month runway)

- ProductHunt launch as primary vehicle
- Developer communities: Reddit (r/SideProject, r/entrepreneur, r/webdev), IndieHackers, Show HN
- Content SEO: "AI project management for developers" — compounds over 3-6 months
- Secure social handles now (Twitter/X, IndieHackers, ProductHunt) before visibility

### 6.4 Realistic Subscriber Expectations

Bootstrapped, solo-founded, with active marketing. Directional ranges only — not financial advice.

| Milestone | Paid subscribers | Approx MRR |
|---|---|---|
| End of month 3 | 10-30 | $100-$300 |
| End of month 6 | 30-80 | $300-$800 |
| End of month 12 | 80-200 | $800-$2,000 |

---

## 7. App UI Modernization (Phase 2)

Apply the landing page's 2026 design language to the app interior after launch. Board view and card modal are the highest-visibility surfaces and come first. Implementation brief finalized through iterative prompt refinement.

### 7.1 Design Requirements

- Geist/Cal Sans display font for headings
- Gradient accents on key UI elements using landing page color tokens
- Glassmorphic card panels with backdrop-filter; CSS fallback for unsupported browsers
- Ambient purple glow on primary action buttons
- Refined spacing system with more breathing room
- Micro-animations for hover, click, and drag states
- Card drag uses physics-based motion (Framer Motion spring physics) for a premium, Linear-level feel
- Animation philosophy: enhance UX, never decorate. Motion should answer a user question (did my click register, where did the card go, what changed) — restrained over flashy
- Animations respect prefers-reduced-motion; performance via transform/opacity (GPU compositing)

### 7.2 Priority Surfaces

1. Board view layout and card grid
2. Card modal design and interactions
3. Navigation and header
4. Primary buttons and form elements

### 7.3 Animation & Motion Guidance

Animation should communicate, not decorate. The library of choice is Framer Motion (Motion) for spring physics, drag, gestures, and layout transitions.

- **High value, low risk:** physics-based card drag with momentum, smooth column reorder transitions, modal fade + subtle scale, button press feedback, card hover transitions, skeleton loaders
- **Use sparingly:** staggered card entrance on board load, prompt-generation typing effect, scroll-triggered entrance (landing page only)
- Physics belongs primarily in drag-and-drop — cards should follow the cursor with slight lag and settle naturally rather than snapping. This is what makes the tool feel premium.
- **Hard rule 1:** every animation must respect prefers-reduced-motion (disable/reduce when set)
- **Hard rule 2:** animate only transform and opacity (GPU compositing, 60fps). Never animate width/height/top/left.
- Tone: Linear-level polish, not flashy. When in doubt, less motion is better.

---

## 8. Product System Notes

### 8.1 Prompt Generator — Source of Truth Discipline

- Card fields (title, description, checklist, notes, project context) are the source of truth; the generated prompt is the output
- Fix card notes, then regenerate — avoid editing generated prompts directly, except when unwanted content is inferred rather than coming from card fields
- Instruction style materially changes output: Documentation for reference cards, Development for build cards

### 8.2 Backlog — Generator Reliability

- Generator occasionally infers content not traceable to any card field (e.g. Vue/Angular when stack is React-only; before/after screenshots that can't be produced in code)
- Recommend constraining output to content traceable to card fields or project context to reduce hallucinated inferences

---

## Operational Prerequisites (before build starts)

- [ ] Loops account created; API key in Vercel env vars; waitlist audience created and list ID confirmed *(before landing page build)*
- [ ] Firebase service account key generated with `roles/datastore.user`; three env vars loaded into Railway; JSON not committed *(before MCP endpoint deploy)*
- [ ] New MCP repository created; Railway project provisioned *(before MCP Phase A code)*
- [ ] Shared TypeScript types approach chosen (duplicate vs. shared package) *(before MCP Phase A code)*

---

## Document History

- Initial gap analysis and consultant feedback rounds 1-2; final sign-off.
- Expanded with Claude Agent MCP architecture, AI card generation spec, and Stripe notes.
- Added Stripe test mode sequence; dev team feedback round 1 (MCP hosting, featureGate, board limit).
- Added marketing & launch track, subscriber expectations, MCP ownership/hosting detail, app UI modernization (Phase 2) with animation guidance, prompt generator system notes, pricing decisions log.
- **Version 9 (May 31, 2026, 08:47 AM EDT):** Resolved all pre-build review items — annual pricing confirmed ($96/yr), MCP separate-repo decision (new §4.7), Firebase Admin SDK requirements (§4.1, §4.6), featureGate sequenced before Stripe live keys (§5.1 Step 2a, roadmap #3), board #4 launch gate (§6, roadmap #2), MCP Phase A vs Stripe Step 4 labeling (§5.1 Step 4), Loops confirmed, operational prerequisites checklist added.

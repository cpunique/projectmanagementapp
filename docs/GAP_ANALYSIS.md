# Kan-do — Gap Analysis
*Last updated: April 5, 2026 — final version with consultant sign-off*

---

## What's Completed

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
| AI task card generation (Pro) | Generate full card backlog from a single goal description |
| Onboarding modal | 3-step welcome flow for new users |
| Mobile responsive layout | Snap scrolling columns, 85vw cards, svh height fix |
| Offline support + sync | IndexedDB queue, auto-sync on reconnect, conflict detection |
| ToS / Privacy gate | Consent recorded in Firestore, gate fires on every login until accepted |

---

## Remaining Gaps

### 🔴 High Priority

| Gap | Why It Matters | Notes |
|---|---|---|
| **Pro payment flow (Stripe)** | Can't monetize without real billing | Pro features currently gated by hardcoded UID list, not a real Stripe subscription. Blocks all revenue. Stripe Checkout is the fastest path — redirect to Stripe, listen for webhook, flip a flag in Firestore. |
| **Pro feature enforcement audit** | Revenue/security gap post-Stripe | Once Stripe is live, every Pro-gated feature must check subscription status from Firestore, not the hardcoded UID list. Missing this is a likely revenue leak. |
| **Subscription cancellation / downgrade handling** | Data integrity and UX on churn | When a Pro user cancels, what happens to their AI prompts, Pro boards, and Pro-only data? Need a defined degradation strategy before going live — easy to overlook until a user complains. |

---

### 🟡 Medium Priority

*(Reordered per consultant recommendation)*

| Gap | Why It Matters | Notes |
|---|---|---|
| **Push / email notifications** | Silent churn without it | Users who get a "you have 3 overdue cards" email come back. Local-only notifications don't reach users when the tab is closed. Key retention mechanism. Use a service (Resend, SendGrid, or Loops) — don't build email infrastructure. Loops is particularly well-suited for SaaS lifecycle emails (onboarding drips, re-engagement, overdue nudges) with clean Firebase integration. |
| **User notification preferences** | Required alongside email notifications | Once email is live, users need control over what they receive. No preferences UI = unsubscribes and spam complaints that can get your sending domain flagged. Plan this at the same time as notifications, not after. |
| **Card assignees** | Table stakes for team use | No way to assign a card to a specific collaborator. Kan-do is currently a solo tool with collaboration bolted on — assignees unlock the team workflow narrative. Note: requires UI changes to card view, filter system, and analytics dashboard (cards by assignee). Budget more dev time than it appears. |
| **Calendar view** | Expected but not a blocker | No date-based view across cards. Users can only see due dates in the side panel. Keep last in this tier. |

---

### 🟢 Lower Priority

| Gap | Why It Matters | Notes |
|---|---|---|
| **PWA install experience** | Underrated quick win | Mobile responsive + offline support + Vercel hosting = ~80% of the way there already. Adding `manifest.json` and a service worker install prompt is low effort and gives an "app store" story without native build overhead. |
| **Board-level permissions UI** | Share works but no self-serve role management | Owner can invite but there's no UI to view/change/remove collaborator roles after the fact. |
| **Native mobile app** | Web app only | No iOS/Android app store presence. PWA (above) is the practical first step before investing in a native build. |

---

## Recommended Sequence

1. **Stripe payment flow** — next PR, full stop. Nothing else matters without billing.
2. **Subscription cancellation / downgrade handling + Pro feature enforcement audit** — tackle in the same sprint. Both are pre-launch Stripe work and closely related. Define degradation strategy and audit every Pro gate before any real user can subscribe.
3. **Pricing strategy decision** — must happen before Stripe goes live. Pro price point affects Stripe configuration, upgrade copy, and which features sit behind the paywall. See open questions below.
4. **Push/email notifications** — retention mechanism, implement before scaling user acquisition. Use Loops or Resend, not custom infrastructure.
5. **User notification preferences** — build alongside #4, not after.
6. **Card assignees** — unlocks the team use case narrative. Budget extra time for card view, filters, and analytics changes.
7. **PWA manifest** — low effort, high perceived value on mobile.
8. **Calendar view** — nice to have, schedule after core team features are solid.

---

## Open Questions (Pre-Stripe)

These need decisions before Stripe configuration begins:

| Question | Why It Matters |
|---|---|
| **What does Pro cost?** (monthly / annual) | Drives Stripe product setup, upgrade conversion copy, and positioning |
| **What features are Pro vs. free?** | AI features are Pro today — are assignees, calendar, email notifications also Pro? Determines upgrade incentive. |
| **What happens to Pro data on downgrade?** | Read-only access? Grace period? Hard cutoff? Must be defined before billing opens. |
| **Free tier limits?** | e.g. max boards, max cards, max collaborators on free. Defines the upgrade trigger. |

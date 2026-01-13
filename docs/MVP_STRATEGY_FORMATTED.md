# MVP Strategy & Subscription Tier Positioning - Formatted Guide

---

## What is MVP (Minimum Viable Product)?

**MVP** is the smallest version of your product that delivers **core value** to users and validates your **key assumptions** about the market.

### Key Principles

1. **Solves ONE core problem well** - In your case: "Simple Kanban boards for solo users and small teams"
2. **Has just enough features** to be useful, but not overwhelming
3. **Attracts early adopters** who will tolerate some missing features
4. **Generates feedback** to inform what to build next
5. **Validates willingness to pay** (if monetization is part of the model)

### What MVP is NOT

- A fully-featured product competing with Monday.com/Trello
- A feature dump of everything you can build
- A permanent state (you iterate beyond MVP)

### For Your Kanban App

Your MVP is **already live** - you have a functional Kanban board with boards, columns, cards, AI prompts, and board descriptions.

**The question now is:** What features belong in the free tier vs paid tiers?

---

## Your Current Feature Inventory

### ✅ Deployed Features (Production)

1. Multi-board management (create, switch, delete boards)
2. Board descriptions with AI context integration
3. Kanban columns (create, rename, reorder, delete)
4. Cards (create, edit, drag-and-drop, delete)
5. Card metadata (priority, tags, colors, due dates, checklist)
6. Rich text notes (Tiptap editor)
7. AI-generated implementation prompts
8. Dark mode toggle
9. Demo mode (unauthenticated preview)
10. Firebase authentication (Google OAuth + email/password)
11. Auto-save to Firestore (authenticated users)
12. Manual save button with Cmd+S shortcut
13. Due dates panel (side panel with upcoming tasks)
14. Search/filter cards (priority, tags, due dates)
15. Export/import boards (JSON)

### 📋 Planned Quick Wins (1-2 week effort)

1. Board search/filtering (search board names)
2. Keyboard shortcuts (Cmd+K for search, etc.)
3. Board export to PDF/CSV (shareable without collaboration)
4. Card templates (speed up repetitive card creation)
5. Custom board colors/icons (visual organization)

### 🚀 Planned Major Features (3-4+ weeks)

1. Multi-user collaboration (board sharing, permissions, invitations)
2. Card comments with @mentions
3. Notification system (in-app alerts)
4. Real-time sync (see collaborator changes instantly)

---

## Freemium Tier Structure

Based on your market positioning ("solopreneurs and vibe coders, not competing with Monday.com"), here's the strategic tier breakdown:

---

## 🆓 FREE TIER (MVP - Your Current Product)

**Value Proposition:** Full-featured Kanban for solo users and small personal projects

### Included Features

- ✅ Unlimited boards (no artificial limits - differentiate from competitors)
- ✅ Unlimited cards (core functionality must be generous)
- ✅ Board descriptions (enables AI context)
- ✅ AI-generated prompts (CRITICAL: limit to 5/month for free users)
- ✅ Card metadata (priority, tags, colors, due dates, checklists)
- ✅ Rich text notes (Tiptap editor)
- ✅ Dark mode
- ✅ Search/filter cards (basic filters only)
- ✅ Export to JSON (basic data portability)
- ✅ Auto-save (local + Firestore sync)
- ✅ Demo mode (unauthenticated preview)

### Why This Free Tier Works

- Generous enough to be **useful for solo users** (your target market)
- **No collaboration** (deferred to paid tier - this is your monetization lever)
- **AI prompt limit** creates upgrade incentive without crippling free tier
- Unlimited boards/cards **builds trust** and differentiates from competitors (Trello limits free boards)

### Strategic Rationale

> "If a solo developer or 'vibe coder' can't get value from the free tier, they won't convert to paid. Make free tier VERY useful for solo use, but collaboration is the premium unlock."

---

## 💎 PRO TIER ($8-12/month or $80-100/year)

**Value Proposition:** Advanced features for power users and freelancers managing client work

### Everything in Free, PLUS

- ✅ Unlimited AI prompts (remove 5/month limit)
- ✅ Advanced search (full-text search across all boards/cards)
- ✅ Card templates (reusable card structures)
- ✅ Custom board colors/icons (visual branding)
- ✅ Export to PDF/CSV (professional client deliverables)
- ✅ Priority support (email response within 24 hours)
- ✅ Advanced keyboard shortcuts (Cmd+K command palette)
- ✅ Due date reminders (email notifications for upcoming tasks)

### Why These Features?

- **Unlimited AI prompts** - Addresses power users who lean heavily on AI
- **Templates + exports** - Solves "client work" use case (freelancers billing clients)
- **Visual customization** - Appeals to users managing multiple projects
- **Professional exports** - Enables sharing work without inviting collaborators

### Price Point Rationale

- **$10/month** = $120/year (standard for solo-tier SaaS)
- **Annual discount:** $100/year (17% discount, incentivizes commitment)
- Lower than Trello ($5/user but limits features), higher than free note apps

### Target Persona

> "Sarah, a freelance developer managing 3-5 client projects. She needs AI prompts, templates, and PDF exports to share progress with non-technical clients. She doesn't need collaboration (clients don't use the tool)."

---

## 👥 TEAM TIER ($20-25/month for 2-5 users, or $200-220/year)

**Value Proposition:** Collaboration for small teams (2-5 people) without enterprise complexity

### Everything in Pro, PLUS

- ✅ Multi-user board sharing (invite up to 5 collaborators per workspace)
- ✅ Role-based permissions (owner, editor, viewer)
- ✅ Card comments (threaded discussions)
- ✅ @Mentions (notify specific team members)
- ✅ In-app notifications (real-time collaboration alerts)
- ✅ Activity log (audit trail of who changed what)
- ✅ Real-time sync (see collaborator edits instantly)

### Why This Tier?

- **Collaboration is the key differentiator** between solo and team use
- Small teams (2-5 people) won't pay enterprise pricing
- Unlimited boards + collaboration = competitive with Trello/Monday at lower price

### Price Point Rationale

- **$20/month for 2-5 users** = $4-10/user/month (cheaper than Trello's $10/user)
- Per-workspace pricing (not per-user) simplifies billing for small teams
- Annual: $200/year (17% discount)

### Target Persona

> "Alex, a solo founder + 2 contractors building a startup. They need shared boards, comments, and @mentions to coordinate work. They can't afford $30/month enterprise tools."

---

## 🏢 ENTERPRISE TIER (Custom Pricing, $50+/month)

**Value Proposition:** Advanced security, compliance, and integrations for larger teams

### Everything in Team, PLUS

- ✅ Unlimited collaborators (no 5-user cap)
- ✅ SSO/SAML authentication (enterprise login)
- ✅ Advanced admin controls (workspace-level permissions)
- ✅ API access (integrate with other tools)
- ✅ Custom branding (white-label option)
- ✅ Priority onboarding (dedicated setup call)
- ✅ SLA guarantees (99.9% uptime commitment)

### Why This Tier?

- Captures larger teams willing to pay premium for security/compliance
- Deferred until you have 50+ paying Team tier customers (don't build prematurely)

### When to Build

> "Only build Enterprise tier features AFTER you have validated demand from 10+ Team tier customers asking for SSO, API access, or custom branding."

---

## Feature-to-Tier Assignment Matrix

| Feature | Free | Pro | Team | Enterprise | Rationale |
|---------|------|-----|------|------------|-----------|
| Unlimited boards | ✅ | ✅ | ✅ | ✅ | Core value - no artificial limits |
| Unlimited cards | ✅ | ✅ | ✅ | ✅ | Core value - no artificial limits |
| Board descriptions | ✅ | ✅ | ✅ | ✅ | Enhances AI, low-cost feature |
| AI prompts | 5/month | ∞ | ∞ | ∞ | Free = teaser, Pro = unlock |
| Card metadata | ✅ | ✅ | ✅ | ✅ | Core Kanban functionality |
| Dark mode | ✅ | ✅ | ✅ | ✅ | Standard UI feature |
| Basic search | ✅ | ✅ | ✅ | ✅ | Essential usability |
| Export JSON | ✅ | ✅ | ✅ | ✅ | Data portability (trust) |
| Advanced search | ❌ | ✅ | ✅ | ✅ | Power user feature |
| Card templates | ❌ | ✅ | ✅ | ✅ | Productivity boost |
| PDF/CSV export | ❌ | ✅ | ✅ | ✅ | Professional deliverables |
| Custom colors/icons | ❌ | ✅ | ✅ | ✅ | Visual organization |
| Keyboard shortcuts | ❌ | ✅ | ✅ | ✅ | Power user feature |
| Board sharing | ❌ | ❌ | ✅ | ✅ | Collaboration = paid tier |
| Comments | ❌ | ❌ | ✅ | ✅ | Collaboration = paid tier |
| @Mentions | ❌ | ❌ | ✅ | ✅ | Collaboration = paid tier |
| Real-time sync | ❌ | ❌ | ✅ | ✅ | Collaboration = paid tier |
| SSO/SAML | ❌ | ❌ | ❌ | ✅ | Enterprise security |
| API access | ❌ | ❌ | ❌ | ✅ | Enterprise integrations |

---

## Strategic Recommendations

### 1. Launch with Free + Pro Tiers Only

**Why skip Team tier initially?**

- You need to validate that **solo users will pay for Pro** before building collaboration
- Building Team tier (3-4 weeks) is high effort - wait for demand signals
- Pro tier is faster to implement (1-2 weeks for quick wins)

**Timeline:**

- **Now - Week 2:** Monitor board description adoption (Option A validation)
- **Week 3-4:** Implement Pro tier features (search, templates, PDF export, shortcuts)
- **Week 5:** Launch Pro tier pricing ($10/month, $100/year)
- **Week 6-8:** Monitor Pro tier conversion rate
- **Decision Point (Week 8):** If >5% of free users upgrade to Pro → Build Team tier

---

### 2. AI Prompt Limit is Your Key Monetization Lever

**Why limit AI prompts in free tier?**

- AI prompts are **high-value** to users (saves time coding)
- AI prompts are **low-cost** to you (API costs <$0.01 per prompt)
- 5 prompts/month is enough to validate the feature's value
- Unlimited prompts in Pro tier creates clear upgrade incentive

**Comparison with competitors:**

- **GitHub Copilot:** $10/month for unlimited AI suggestions
- **Cursor:** $20/month for unlimited AI code generation
- **Your pricing:** $10/month for unlimited prompts + templates + exports = **competitive**

---

### 3. Defer Team Tier Until You Hit These Milestones

**Don't build collaboration (Team tier) until:**

- ✅ 100+ active free users
- ✅ 10+ paying Pro users
- ✅ 3+ users explicitly request board sharing/collaboration

**Why wait?**

- Building collaboration (3-4 weeks) is expensive in time/effort
- You don't have validated demand yet (Option A is testing board descriptions first)
- Pro tier features (1-2 weeks) are faster wins

---

### 4. Pricing Psychology

**Monthly vs Annual:**

- Offer **17% discount** for annual plans (standard SaaS practice)
- Example: $10/month = $120/year → Discounted to $100/year
- Annual plans improve cash flow and reduce churn

**Free Trial Strategy:**

- **Don't do free trials for Pro tier** - your free tier IS the trial
- Instead: "Upgrade to Pro anytime, cancel anytime" (builds trust)

**Grandfathering:**

- Early adopters who pay during beta get **lifetime discount** (e.g., $8/month instead of $10/month)
- Creates urgency to upgrade early

---

## Implementation Roadmap

### Phase 1: Free Tier (Current State) - DONE ✅

- You already have a fully functional free tier
- Board descriptions deployed and validating

### Phase 2: Pro Tier Features (Weeks 3-4)

1. AI prompt counter (track usage, enforce 5/month limit for free users)
2. Board search/filtering (simple name search)
3. Keyboard shortcuts (Cmd+K command palette)
4. Card templates (reusable card creation)
5. PDF/CSV export (board snapshots)
6. Paywall UI (upgrade prompts when hitting limits)

### Phase 3: Payment Integration (Week 5)

1. Stripe integration (payment processing)
2. Subscription management (create/cancel/upgrade)
3. Webhook handlers (payment success/failure)
4. User role enforcement (check subscription status)
5. Billing page (manage payment method, view invoices)

### Phase 4: Pro Tier Launch (Week 6)

1. Deploy payment-gated Pro features
2. Marketing page updates (pricing table)
3. Email announcement to existing users
4. Monitor conversion metrics

### Phase 5: Team Tier (Deferred to Week 8+)

- Only proceed if Pro tier validates willingness to pay
- Implement collaboration features (Phase 1 + Phase 2 from collaboration plan)

---

## Cost & Unit Economics Analysis

### Current Infrastructure Costs: $0/month

**Firebase Free Tier Status:**

| Resource | Free Tier Limit | Current Usage | Cost |
|----------|-----------------|---------------|------|
| Firestore Reads | 50,000/day | ~5,000/day | $0 |
| Firestore Writes | 20,000/day | ~500/day | $0 |
| Storage | 1 GB | <100 MB | $0 |
| Authentication | Unlimited | Varies | $0 |
| **Total Monthly** | — | — | **$0** |

**You have 10x headroom** before hitting Firebase paid tiers. You're currently fully subsidized by Firebase's free tier.

---

### Claude API Costs (AI Prompt Generation)

**Testing Data (Your Current Usage):**

- **Initial balance:** $5.00
- **Current balance:** $4.70
- **Amount spent:** $0.30
- **Prompts generated:** ~100 prompts (at ~$0.003/prompt)

**Pro Tier Economics:**

| Metric | Value |
|--------|-------|
| Cost per AI prompt | ~$0.003 |
| Free tier limit | 5 prompts/month |
| Free tier monthly cost | $0.015 |
| Pro tier limit | Unlimited |
| Pro tier average user (100 prompts/month) | $0.30 |
| Pro tier heavy user (500 prompts/month) | $1.50 |
| **Pro tier pricing** | $10/month |
| **Profit margin (100 prompts)** | 97% |
| **Profit margin (500 prompts)** | 85% |

**Key Insight:** AI prompts are an **extremely profitable feature**. Even power users generating 500 prompts/month only cost you $1.50 while you charge $10/month.

---

### Scaling Cost Projections

#### Free Tier Scaling

| Users | Firestore Reads/Day | Firestore Writes/Day | Monthly Firebase Cost |
|-------|-------------------|----------------------|----------------------|
| 100 | 50,000 | 5,000 | $0 (under free tier) |
| 1,000 | 50,000 | 5,000 | $0 (at free tier limit) |
| 5,000 | 250,000 | 25,000 | $10-20 |
| 10,000 | 500,000 | 50,000 | $50-100 |

**Recommendation:** Set Firebase budget alert at **$5/month** (80% of acceptable monthly spend). Monitor Firestore usage dashboard weekly once you exceed 1,000 users.

---

#### Pro Tier Scaling ($10/month per user)

| Pro Users | Monthly Revenue | Claude API Cost | Firebase Cost | Gross Margin |
|-----------|-----------------|-----------------|---------------|--------------|
| 10 | $100 | $3 | $0 | **97%** |
| 50 | $500 | $15 | $1 | **97%** |
| 100 | $1,000 | $30 | $2 | **97%** |
| 500 | $5,000 | $150 | $5 | **97%** |
| 1,000 | $10,000 | $300 | $10 | **97%** |

**Pro tier is extremely profitable** because:
- Claude API costs are negligible (~3% of revenue)
- Firebase reads/writes scale sub-linearly (Pro users don't use significantly more resources)
- No payment processing fees in this model (add ~2.9% + $0.30 when integrating Stripe)

---

#### Team Tier Scaling ($20/month per 2-5 users, or ~$20/user/month)

**Team tier collaboration features increase resource usage 5-10x:**

| Team Workspace Users | Monthly Revenue | Firebase Cost Increase | Net Margin |
|----------------------|-----------------|------------------------|------------|
| 2 | $20 | $0.50 | 97% |
| 5 | $50 | $1.50 | 97% |
| 10 | $100 | $5 | 95% |
| 50 | $500 | $25 | 95% |
| 100 | $1,000 | $50 | 95% |

**Team tier margins are still healthy** (~95%) because collaboration increases read/write operations but doesn't significantly impact API costs.

---

### Break-Even Analysis

**Assumption:** You spend 500 hours building the product (worth ~$25k in dev time at $50/hr)

#### Path A: Free + Pro Tier Only

| Milestone | Timeline | Cumulative Revenue | Cumulative Costs | Status |
|-----------|----------|-------------------|------------------|--------|
| Launch Pro tier | Week 6 | $0 | $25k (sunk) | Starting point |
| 10 Pro users | Week 8-10 | $100 | $25k | 0.4% of break-even |
| 100 Pro users | Week 12-14 | $1,000 | $25k | 4% of break-even |
| 500 Pro users | Week 16-20 | $5,000 | $25k | 20% of break-even |
| **1,000 Pro users** | **Week 20-24** | **$10,000/month** | **$25k (one-time)** | **Break-even in month 3-4** |

**At 1,000 Pro users, you're generating $120k/year revenue with 97% margins.**

---

#### Path B: Free + Pro + Team Tier

| Milestone | Timeline | Pro Users | Team Workspaces | Monthly Revenue | Status |
|-----------|----------|-----------|-----------------|-----------------|--------|
| Launch Pro tier | Week 6 | 0 | 0 | $0 | Starting point |
| Month 2 | Week 10 | 50 | 5 | $500 + $100 = **$600** | Early traction |
| Month 3 | Week 14 | 150 | 25 | $1,500 + $500 = **$2,000** | Growing adoption |
| Month 4 | Week 18 | 400 | 75 | $4,000 + $1,500 = **$5,500** | Strong growth |
| Month 5 | Week 22 | 800 | 200 | $8,000 + $4,000 = **$12,000** | **Exceeds break-even** |

**With both tiers launching at Week 8, you hit break-even in Month 5 (~$60k/year run rate).**

---

### Cost Categories Summary

#### Fixed Costs (One-time)
- **Development:** 500 hours @ $50/hr = $25,000 (sunk cost, already spent)
- **Stripe setup:** $0 (no upfront fees)
- **Domain/hosting:** Covered by Vercel free tier

#### Variable Costs (Per user, per month)
- **Claude API:** $0.003 per prompt (Pro users: ~$0.30/month)
- **Firebase:** $0 for <1,000 users, then ~$0.01 per additional user
- **Stripe:** 2.9% + $0.30 per transaction ($0.29 per $10 subscription)
- **Email (transactional):** Free tier supports 100+ emails/day

#### Annual Costs at Scale

| Scenario | Annual Firebase | Annual Claude API | Annual Stripe | Total Annual |
|----------|-----------------|------------------|---------------|--------------|
| 100 Pro users | $0 | $360 | $290 | **$650** |
| 1,000 Pro users | $120 | $3,600 | $2,900 | **$6,620** |
| 5,000 Pro + 500 Team users | $600 | $18,000 | $15,700 | **$34,300** |

**Even at scale, infrastructure costs are <5% of revenue. This is a highly profitable business model.**

---

## Key Takeaways: Unit Economics

1. **Free tier costs nothing** - You have 10x headroom on Firebase free tier
2. **AI prompts are a cash cow** - 97% margins on Claude API usage
3. **Pro tier profitability is immediate** - Break even at ~1,000 Pro users (Month 3-4)
4. **Team tier doesn't cannibalize margins** - Still 95% gross margins despite 5-10x resource increase
5. **Your biggest cost is time (sunk)** - Infrastructure is almost free at any reasonable scale

**Strategic implication:** Don't worry about infrastructure costs. Your focus should be on **user acquisition and conversion rates**, not cost optimization. Unit economics are in your favor.

---



### Free Tier

- Sign-ups per week
- % of users who create >1 board
- % of users who hit 5 AI prompt limit
- % of users who add board descriptions

### Pro Tier

- Free-to-Pro conversion rate (target: 2-5%)
- Monthly recurring revenue (MRR)
- Churn rate (target: <5%/month)
- Average revenue per user (ARPU)

### Decision Triggers

- If <1% convert to Pro after 4 weeks → Revisit pricing or Pro feature set
- If >5% convert to Pro → Proceed with Team tier development
- If users request collaboration before paying for Pro → Reconsider tier structure

---

## Summary: Your MVP-to-Paid Strategy

### MVP = Your Current Free Tier

- Fully functional for solo users
- Generous limits (unlimited boards/cards)
- Enough AI prompts to validate value (5/month)

### Pro Tier = Quick Wins You're About to Build

- Search, templates, exports, shortcuts
- Unlimited AI prompts (key differentiator)
- Targets freelancers and power users

### Team Tier = Deferred Until Validated Demand

- Collaboration features (3-4 weeks effort)
- Only build after Pro tier proves monetization works

---

## Next Steps

1. **Review this strategy document**

2. **Decide which path to take:**
   - **Option A:** Continue validating board descriptions (1-2 weeks) before building Pro tier features
   - **Option B:** Start building Pro tier quick wins immediately (board search, shortcuts, templates)
   - **Option C:** Skip Pro tier and jump to Team tier collaboration (if you have strong evidence of demand)

3. **Once decided, I can begin implementation** starting with the low-effort quick wins for Pro tier

---

## Questions to Consider

1. **Are you ready to monetize now, or wait until Week 2 validation completes?**

2. **What's your target price point for Pro tier?** ($8, $10, or $12/month?)

3. **Do you want to build payment integration before or after implementing Pro features?**

4. **Should we add analytics tracking to measure feature usage before adding paywalls?**

---

## Quick Reference: Tier Comparison

| Aspect | Free | Pro | Team | Enterprise |
|--------|------|-----|------|------------|
| **Price** | Free | $10/mo or $100/yr | $20/mo or $200/yr | Custom |
| **Best For** | Solo users | Freelancers | Small teams | Large orgs |
| **Collaboration** | None | None | Full | Full + API |
| **AI Prompts** | 5/month | Unlimited | Unlimited | Unlimited |
| **Users** | 1 | 1 | 2-5 | Unlimited |
| **Support** | Community | Email | Email | Dedicated |
| **Launch Timeline** | DONE | Week 5-6 | Week 8+ | Week 16+ |

---

## Decision Framework: Which Path Should You Take?

### Path A: Patient Validation Approach (Recommended)

**Timeline:** 8 weeks total

- **Weeks 1-2:** Monitor board description adoption (Option A validation)
- **Weeks 3-4:** Implement Pro tier features
- **Week 5:** Launch Pro tier + Stripe integration
- **Weeks 6-8:** Monitor conversion, decide on Team tier

**Pros:**
- Data-driven decisions
- Lower risk of building wrong features
- Time to iterate based on user feedback

**Cons:**
- Slower revenue generation
- Delays Team tier by 2-3 weeks

---

### Path B: Fast Build Approach

**Timeline:** 4-5 weeks total

- **Week 1:** Implement Pro tier features immediately
- **Week 2:** Add Stripe + payment integration
- **Week 3:** Launch Pro tier to production
- **Weeks 4-5:** Start Team tier implementation if you want

**Pros:**
- Faster monetization
- Revenue generation sooner
- Team tier ready by week 8

**Cons:**
- Less data validation
- Risk of building features users don't want
- May need to pivot if adoption is low

---

### Path C: Collaboration-First Approach

**Timeline:** 3-4 weeks total (just for Team tier)

**Skip Pro tier entirely, jump straight to Team tier collaboration features**

**Pros:**
- Unlocks collaborative workflows faster
- Competitive feature parity with Trello/Monday
- Complete collaboration story

**Cons:**
- High effort (3-4 weeks)
- Don't know if collaboration is wanted yet
- Doesn't address solo user monetization

---

## My Recommendation

**Choose Path A (Patient Validation)** unless you have strong evidence collaboration is the #1 feature users want:

1. You've already validated board descriptions work
2. You have live production data to measure adoption
3. Pro tier features are lower effort (1-2 weeks) than Team tier (3-4 weeks)
4. Data from Pro tier conversion will inform Team tier decisions

**If you're confident in collaboration demand,** you can skip validation and go straight to Pro tier (Path B), which is still faster than full Team tier implementation.

---

*Document created: 2026-01-03*
*Status: Board description feature deployed, Option A validation in progress*

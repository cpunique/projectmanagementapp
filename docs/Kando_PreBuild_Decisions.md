# Kan-do Pre-Build Decisions & Document Update Brief
**For:** Consultant (architecture & spec updates)
**From:** Development review — May 31, 2026
**Re:** `Kando_Architecture_Roadmap_8.docx` and `Kando_Landing_Page_Spec.docx`

---

## Purpose

A thorough review of both documents against the current codebase and proposed build sequence surfaced issues that will cause rework if not resolved before the build starts. This brief captures every issue, explains the impact, and specifies what needs to be updated in each document. The consultant should resolve all items below and produce updated versions of both docs before implementation begins.

---

## Section 1 — Hard Blockers
*These will halt work mid-build if not resolved upfront.*

---

### 1.1 Annual Pricing Decision — Inconsistency Between Documents

**Status in roadmap:** Marked **Pending** in the Decisions Log (Section 3).
**Status in landing page spec:** Already hard-coded as `$96/year — save 20%` throughout Section 4.6 (Pricing) and Section 4.7 (Final CTA).

**Impact:** If the price changes from $96/yr, the landing page pricing block requires rework after it's built.

**Decision needed:**
- Confirm $96/year (20% off) as the annual price — or set an alternative.

**Document updates required:**
- **Roadmap (Section 3 Decisions Log):** Change the annual pricing row from `Pending` to `Decided`. Record the confirmed price.
- **Landing page spec:** No change needed if $96/yr is confirmed. If price changes, update every instance in Sections 4.6 and 4.7.

---

### 1.2 Loops Account — Prerequisite for Landing Page Waitlist

**Issue:** The landing page spec commits fully to Loops for email capture, live signup count, founding member confirmation email, and the warm-up sequence (Sections 5 and 6.2 of the roadmap). There is no Loops account, API key, or list configured yet.

**Impact:** The waitlist form and confirmation flow cannot be implemented without Loops credentials. This blocks the landing page from shipping in its intended form.

**Decision needed:**
- Confirm Loops as the email vendor (vs. alternatives: Resend, ConvertKit, Mailchimp).
- Create the Loops account, obtain the API key, and create the waitlist audience before the landing page build begins.

**Document updates required:**
- **Roadmap (Section 6.2):** Add a pre-requisite note: *"Loops account, API key, and waitlist audience must be provisioned before landing page build starts."*
- **Landing page spec (Section 5):** Add a pre-requisite line at the top of the Waitlist Integration section: *"Requires: Loops account active, API key in Vercel env vars, waitlist list ID confirmed."*

---

### 1.3 MCP Server — Codebase Home Undecided

**Issue:** The architecture doc specifies Railway for hosting but is silent on whether the MCP server lives in the same repository as the Kan-do app or in a separate repository. This decision gates everything in Phase A: repo structure, Railway project setup, CI/CD wiring, and build configuration.

**Options:**
| Option | Pros | Cons |
|---|---|---|
| Same repo (monorepo, Railway deploys a subfolder) | Shared types, single repo to manage | More complex Railway config; Vercel and Railway both watch the same repo |
| Separate repo | Clean separation, independent deploy | Shared types must be duplicated or extracted to a package |

**Decision needed:**
- Choose monorepo or separate repo before any MCP code is written.

**Document updates required:**
- **Roadmap (Section 4 — Claude Agent MCP Architecture):** Add a subsection 4.7: *"MCP Server Repository Structure"* — record the decision (monorepo or separate repo), the Railway project name, and the folder path if monorepo.

---

### 1.4 Firebase Admin SDK Credentials on Railway

**Issue:** The MCP server reads Firestore directly (`/mcp/boards`, `/mcp/cards`, token validation). On Railway, this requires a **Firebase service account** — specifically the Admin SDK credentials (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`). These are different from the client-side Firebase config used in the Vercel deployment (which uses the public API key and is not privileged).

**Impact:** Without provisioning and documenting these credentials upfront, Phase A cannot authenticate to Firestore. The service account needs the correct Firestore IAM role (`roles/datastore.user`).

**Decision needed:**
- Generate a Firebase service account key in the Firebase console (Project Settings → Service Accounts).
- Store the three credential env vars in Railway before any MCP endpoint is deployed.
- Do NOT commit the service account JSON to the repository.

**Document updates required:**
- **Roadmap (Section 4.1 — Ownership & Hosting):** Add a note: *"The MCP server uses the Firebase Admin SDK (not the client SDK). Requires a service account key with Firestore read permissions. Credentials stored as Railway env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY. Do not commit to repo."*
- **Roadmap (Section 4.6 — Phased Build, Phase A):** Add to Phase A checklist: *"Firebase service account provisioned and env vars loaded into Railway."*

---

## Section 2 — Sequencing Risks
*Not blockers today, but will cause rework if not addressed before the relevant phase starts.*

---

### 2.1 featureGate.ts Cleanup Must Complete Before Stripe Goes Live

**Issue:** The roadmap correctly identifies featureGate.ts as Priority 3 (High) and notes it currently uses a hardcoded UID list. The roadmap sequences it *alongside* Stripe, but it must complete *before* Stripe keys go live.

**Why:** When Stripe flips `proStatus = active` in Firestore for a real paying subscriber, featureGate.ts must be reading `proStatus` from Firestore — not a hardcoded list — or the paying user receives no Pro features. This is a silent failure: Stripe processes the payment successfully, but the product doesn't unlock.

**Corrected sequence:**
1. Build Stripe in test mode
2. Clean featureGate.ts to read `proStatus` from Firestore
3. Test the full gate with a test Pro subscription
4. Only then swap to live Stripe keys

**Document updates required:**
- **Roadmap (Section 5 — Stripe Implementation, Step sequence):** Add Step 2a between Steps 2 and 3: *"2a. featureGate.ts updated to read proStatus from Firestore in real time — hardcoded UID list removed. Must complete before live keys."*
- **Roadmap (Section 3 — Roadmap table, item #3):** Update the Notes column for featureGate.ts: add *"Must be completed before Stripe live keys are enabled — not just alongside Stripe build."*

---

### 2.2 Board #4 Limit Enforcement Must Be Live Before Waitlist Converts

**Issue:** The landing page promises "Free forever on 3 boards." `addBoard` currently has no guard — a free user can create unlimited boards. This is acceptable while the landing page is collecting waitlist emails only. It becomes a problem when the waitlist converts to real signups at launch.

**Impact:** Without enforcement, the free/Pro pricing distinction is not real. Free users can bypass the upgrade modal and the conversion funnel doesn't work.

**Required sequencing:**
- Board #4 limit enforcement must be implemented and tested before the waitlist is converted at launch (i.e., before the "Start free" CTA leads to a real account creation flow).

**Document updates required:**
- **Roadmap (Section 3 — Roadmap table, item #2):** Add to Notes: *"Must be live before waitlist converts at launch. Landing page 'Free forever on 3 boards' claim is inaccurate until this is enforced."*
- **Roadmap (Section 6 — Marketing & Launch Track):** Add a Launch Gate section or note: *"Launch gate: board #4 limit enforcement must be verified before driving traffic that creates real accounts."*

---

### 2.3 MCP Phase A vs. Stripe Sequence Labeling Conflict

**Issue:** Section 5 of the roadmap lists the Stripe build sequence with Step 4: *"Build MCP server endpoints."* This implies MCP endpoints come after Stripe, which conflicts with the Phase A-first approach (and the Phase A/B split defined in Section 4.6).

**Clarification:** Step 4 in the Stripe sequence refers to MCP Phase B endpoints (Pro-gated). Phase A endpoints (read-only, no Pro gating) come first and are independent of Stripe.

**Impact:** A developer reading the Stripe sequence in isolation would conclude MCP can't start until Stripe is in place — causing unnecessary delay.

**Document updates required:**
- **Roadmap (Section 5 — Stripe Implementation, Step 4):** Change wording from *"Build MCP server endpoints"* to *"Build MCP Phase B server endpoints (Pro gating, access revocation, audit logging) — Phase A endpoints already complete at this point."*

---

## Section 3 — Conflicts Between the Two Documents

---

### 3.1 Landing Page "Demo" Nav Link — Undefined

**Issue:** The landing page spec (Section 4.1 — Nav bar) lists three center nav links: `Features | Pricing | Demo`. No demo is defined in either document — no Loom video, no embedded demo mode, no sandbox environment.

**Impact:** If built as written, the Demo link is either a dead link or a `#` placeholder, both of which are poor UX on a first-impression marketing page.

**Decision needed (choose one):**
- A. Record a Loom or video walkthrough before launch and link to it.
- B. Remove Demo from the nav at launch; add it when a demo exists.
- C. Build a read-only sandbox/demo board mode (significant effort — not recommended pre-launch).

**Document updates required:**
- **Landing page spec (Section 4.1 — Nav bar):** Record the decision. Either remove "Demo" from the nav link list, or add: *"Demo links to [URL] — must be live before page launches."*

---

### 3.2 "SOC-2 Grade Security" Social Proof Claim

**Issue:** The landing page spec (Section 4.3 — Social proof bar) includes *"SOC-2 grade security"* as a proof point. Kan-do is not SOC-2 certified. Firebase/Firestore (the underlying infrastructure) is SOC-2 certified, which is the implicit basis for the claim.

**Impact:** The claim is technically defensible but could be challenged by a sophisticated buyer or flagged by a legal reviewer as misleading. It also becomes a liability if a security incident occurs.

**Recommended fix:** Replace with infrastructure-accurate language: *"Built on Firebase — SOC-2 certified infrastructure"* or simply *"Enterprise-grade security infrastructure."*

**Document updates required:**
- **Landing page spec (Section 4.3):** Update the social proof bar copy. Replace *"SOC-2 grade security"* with the agreed alternative.

---

## Section 4 — Decisions Summary Table

| # | Decision | Owner | Status | Blocks |
|---|---|---|---|---|
| 1.1 | Confirm annual pricing ($96/yr) | Product | Pending | Landing page build |
| 1.2 | Set up Loops account + API key | Operations | Pending | Landing page waitlist |
| 1.3 | MCP server: monorepo vs. separate repo | Engineering | Pending | MCP Phase A |
| 1.4 | Firebase service account provisioned on Railway | Engineering | Pending | MCP Phase A |
| 2.1 | featureGate.ts sequenced before Stripe live keys | Engineering | Confirmed in docs | Stripe launch |
| 2.2 | Board #4 enforcement confirmed as launch gate | Product | Confirmed in docs | Waitlist conversion |
| 2.3 | MCP Phase A labeled separately from Stripe Step 4 | Docs | Docs update only | Team clarity |
| 3.1 | Demo nav link: remove, record video, or build sandbox | Product | Pending | Landing page build |
| 3.2 | Social proof copy: replace SOC-2 claim | Marketing | Pending | Landing page build |

---

## Consultant Deliverables

Please return updated versions of both documents with all items above reflected:

1. **`Kando_Architecture_Roadmap_9.docx`**
   - Items updated: 1.1, 1.3, 1.4, 2.1, 2.2, 2.3
   - New subsection 4.7 (MCP repository structure)
   - Decisions log fully resolved (no Pending rows except those still genuinely open)

2. **`Kando_Landing_Page_Spec_2.docx`**
   - Items updated: 1.1, 1.2, 3.1, 3.2
   - Pre-requisite section added to Section 5 (Waitlist Integration)
   - Demo nav link resolved
   - Social proof bar copy updated

Once both documents are updated and decisions are recorded, development can begin on MCP Phase A and the landing page in parallel without risk of mid-build rework.

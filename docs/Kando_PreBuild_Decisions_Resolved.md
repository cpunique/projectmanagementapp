# Kan-do — Pre-Build Decisions: Resolved

**Date:** May 31, 2026 at 08:47 AM EDT
**Re:** Response to the development review of `Kando_Architecture_Roadmap` and `Kando_Landing_Page_Spec`
**Status:** All blocking decisions resolved. Cleared to begin MCP Phase A and landing page build in parallel once the operational prerequisites (Loops account, Firebase service account) are provisioned.

---

## Decisions Confirmed

| # | Decision | Resolution |
|---|---|---|
| 1.1 | Annual pricing | **Confirmed: $96/year (20% off $120).** |
| 1.2 | Email vendor | **Confirmed: Loops** for waitlist capture, live count, founding-member confirmation, and lifecycle/notification emails. |
| 1.3 | MCP server repo structure | **Confirmed: separate repository.** Clean separation, independent deploy, avoids Vercel and Railway both watching one repo. |
| 3.1 | Demo nav link | **Confirmed: remove at launch.** Add back once a real demo (Loom or sandbox) exists. |
| 3.2 | SOC-2 social proof claim | **Confirmed replacement: "Built on Firebase — SOC-2 certified infrastructure."** |

---

## Section 1 — Hard Blockers: Resolution

### 1.1 Annual Pricing — RESOLVED
**Decision:** $96/year (20% off) confirmed.

**Document updates:**
- **Roadmap, Decisions Log (Section 3):** Annual pricing row changed from `Pending` to `Decided` — recorded as "$96/year (20% off), added upfront in Stripe."
- **Landing page spec:** No copy change needed — `$96/year — save 20%` in Sections 4.6 and 4.7 stands as written.

### 1.2 Loops Account — RESOLVED (vendor) / ACTION REQUIRED (provisioning)
**Decision:** Loops confirmed as the email vendor.

**Operational prerequisite (must complete before landing page build starts):**
- Create the Loops account.
- Obtain the API key; store in Vercel env vars.
- Create the waitlist audience; confirm the list ID.

**Document updates:**
- **Roadmap (Section 6.2):** Pre-requisite note added — "Loops account, API key, and waitlist audience must be provisioned before landing page build starts."
- **Landing page spec (Section 5):** Pre-requisite line added at the top — "Requires: Loops account active, API key in Vercel env vars, waitlist list ID confirmed."

### 1.3 MCP Server Repo — RESOLVED
**Decision:** Separate repository.

**Implications for the team:**
- New repo for the MCP server; its own Railway project.
- Shared TypeScript types (card/board shapes) must be either duplicated or extracted into a small shared package. Recommend extracting to a shared package if the type surface grows; duplication is acceptable for Phase A's small read-only surface.
- Vercel continues to watch only the app repo; Railway watches only the MCP repo. No cross-watching.

**Document updates:**
- **Roadmap (Section 4):** New subsection **4.7 — MCP Server Repository Structure** added, recording the separate-repo decision, the Railway project name (to be filled in by Engineering), and the shared-types approach.

### 1.4 Firebase Admin SDK on Railway — RESOLVED (documentation)
**No decision required — documented as specified.**

**Operational prerequisite (must complete before any MCP endpoint deploys):**
- Generate a Firebase service account key (Firebase console → Project Settings → Service Accounts).
- Grant the Firestore IAM role `roles/datastore.user`.
- Store `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` as Railway env vars.
- Do **not** commit the service account JSON to the repo.

**Document updates:**
- **Roadmap (Section 4.1):** Note added — the MCP server uses the Firebase Admin SDK (not the client SDK), requires a service account key with Firestore read permissions, credentials stored as the three Railway env vars above, never committed to the repo.
- **Roadmap (Section 4.6, Phase A checklist):** Item added — "Firebase service account provisioned and env vars loaded into Railway."

---

## Section 2 — Sequencing Risks: Resolution

### 2.1 featureGate.ts Before Stripe Live Keys — ACCEPTED
The team is correct: featureGate.ts must read `proStatus` from Firestore **before** live Stripe keys are enabled, or a paying subscriber receives no Pro features (silent failure — payment succeeds, product doesn't unlock).

**Document updates:**
- **Roadmap (Section 5, Stripe sequence):** New **Step 2a** inserted between Steps 2 and 3 — "featureGate.ts updated to read proStatus from Firestore in real time; hardcoded UID list removed. Must complete before live keys."
- **Roadmap (Section 3, roadmap table item #3):** Notes updated — "Must be completed before Stripe live keys are enabled — not just alongside Stripe build."

### 2.2 Board #4 Enforcement as Launch Gate — ACCEPTED
The "Free forever on 3 boards" claim is inaccurate until `addBoard` is guarded. Enforcement must be live and tested before the waitlist converts to real accounts at launch.

**Document updates:**
- **Roadmap (Section 3, roadmap table item #2):** Notes updated — "Must be live before waitlist converts at launch. Landing page 'Free forever on 3 boards' claim is inaccurate until enforced."
- **Roadmap (Section 6):** New **Launch Gate** note added — "Board #4 limit enforcement must be verified before driving traffic that creates real accounts."

### 2.3 MCP Phase A vs. Stripe Step 4 Labeling — ACCEPTED
Step 4 of the Stripe sequence refers to **Phase B** endpoints. Phase A (read-only, no Pro gating) comes first and is independent of Stripe.

**Document updates:**
- **Roadmap (Section 5, Step 4):** Reworded — "Build MCP Phase B server endpoints (Pro gating, access revocation, audit logging) — Phase A endpoints already complete at this point."

---

## Section 3 — Document Conflicts: Resolution

### 3.1 Demo Nav Link — RESOLVED
**Decision:** Remove "Demo" from the nav at launch. Re-add once a real demo exists (Loom walkthrough or sandbox board).

**Document updates:**
- **Landing page spec (Section 4.1):** Nav links reduced to `Features | Pricing`. Note added — "Demo intentionally omitted at launch; re-add when a demo (Loom or sandbox) is available."

### 3.2 SOC-2 Claim — RESOLVED
**Decision:** Replace "SOC-2 grade security" with **"Built on Firebase — SOC-2 certified infrastructure."** This is infrastructure-accurate (Firebase/Firestore is SOC-2 certified; Kan-do itself is not certified) and defensible.

**Document updates:**
- **Landing page spec (Section 4.3):** Social proof bar copy updated — "SOC-2 grade security" replaced with "Built on Firebase — SOC-2 certified infrastructure."

---

## Operational Prerequisites Checklist
*Not document edits — real-world setup that must happen before the relevant build starts.*

- [ ] Loops account created; API key in Vercel env vars; waitlist audience created and list ID confirmed *(before landing page build)*
- [ ] Firebase service account key generated with `roles/datastore.user`; three env vars loaded into Railway; JSON not committed *(before MCP endpoint deploy)*
- [ ] New MCP repository created; Railway project provisioned *(before MCP Phase A code)*
- [ ] Shared TypeScript types approach chosen (duplicate vs. shared package) *(before MCP Phase A code)*

---

## Updated Decisions Summary

| # | Decision | Status | Blocks |
|---|---|---|---|
| 1.1 | Annual pricing $96/yr | **Decided** | — |
| 1.2 | Loops as email vendor | **Decided** (provisioning pending) | Landing page waitlist |
| 1.3 | MCP separate repo | **Decided** | MCP Phase A |
| 1.4 | Firebase service account on Railway | **Documented** (provisioning pending) | MCP Phase A |
| 2.1 | featureGate before Stripe live keys | **Accepted into docs** | Stripe launch |
| 2.2 | Board #4 enforcement = launch gate | **Accepted into docs** | Waitlist conversion |
| 2.3 | MCP Phase A vs Stripe Step 4 labeling | **Accepted into docs** | Team clarity |
| 3.1 | Demo nav link removed at launch | **Decided** | — |
| 3.2 | SOC-2 claim replaced | **Decided** | — |

---

## Next Steps

1. Consultant produces updated `Kando_Architecture_Roadmap_9.docx` and `Kando_Landing_Page_Spec_2.docx` reflecting all updates above.
2. Operations provisions the Loops account.
3. Engineering creates the MCP repo, Railway project, and Firebase service account.
4. Once prerequisites are met, MCP Phase A and the landing page build proceed in parallel.

*All pricing figures are decisions recorded for build purposes and are not financial advice.*

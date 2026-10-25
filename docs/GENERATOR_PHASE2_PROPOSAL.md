# Generate Tasks: Phase 2 proposal

Status: **proposal only. Nothing here is built.** Phase 1 (prompt, checks, scheduler, summary card) is done and works inside the existing card fields. Phase 2 needs your approval because it touches stored data, the export format, or screens people use.

## What Phase 1 already gives you

Every plan now has a "Read me first" card, dependency lines, decision-gate cards, waiting steps, labeled assumptions, and due dates from a deterministic scheduler. All of it is stored in the card fields that already exist. The cost of that choice: dependencies and "this is a gate" live in text and tags, so the app cannot show "blocked by" or react when someone edits a card.

## 1. Real fields on cards (`dependsOn`, `kind`)

**What:** Two optional fields on a card: `dependsOn` (the cards it needs first) and `kind` (work, validation, decision-gate, waiting step).

**Why it is worth it:** The app could show a "blocked by" badge, warn before you archive a prerequisite, and re-date a plan after you edit it. AI agents connected through MCP would also see the dependencies.

**What it touches (checked in the code):**
- **Stored data:** a board is one document with every card inside it. Firestore rules check only the top-level board fields and a total size under 1 MB, so new optional card fields need no rule change and existing boards are untouched. The 1 MB limit matters more now that plans are longer (about 3 KB of text per generated card).
- **Export/import:** import ignores the `version` number and copies unknown card fields, so version 1 and 2 files both import. **But import gives every card a new id**, so `dependsOn` would point at ids that no longer exist. Import has to rewrite them. This is the main hidden cost.
- **Other code:** the card modal (to show and edit them), conflict merge (to merge them), and the separate MCP server repo (to read them).

**Recommendation:** add `dependsOn` and `kind` only. Do not add a field for assumptions: the "Assumption, verify:" text and the Read-me card already do that job. Export version 2.

## 2. Start date, deadline and hours per week as real inputs (fix 3)

**What:** Three optional fields in the modal. Today you can type them into the description and the model picks them up; that works but is easy to miss.

**Recommendation:** add the fields, send them to the server, and let them override whatever the model extracted. Remember the last values per board, the way the goal text is already remembered. Small change; the scheduler already accepts all three.

## 3. Saving the briefing as Project Context (fix 8), and the 500 vs 1000 limit

**Today:**
- Project Context is the board's description, edited under the board title. **The editor stops you at 500 characters** (`BoardHeader.tsx`, `maxLength={500}`).
- **The server accepts up to 1000** and already passes it to the generator as background.
- The goal box in the modal is also capped at 500.

**The problem:** "append to existing context" will hit 500 almost immediately, and a saved 500-character goal fills the whole field.

**Options:**
1. **Raise the editor to 1000** to match the server. Simplest. Show a counter. Check any other place that reads the description first.
2. Keep 500 and let "append" refuse when it would overflow, with a clear message. Safe but annoying.
3. Add a separate "project brief" field up to 2000 characters. Cleanest, but a new stored field.

**Recommendation:** option 1.

**Behavior (any option):** an unchecked box "Save as board Project Context". If the board already has context, ask **Replace / Append / Don't save**. Never overwrite silently.

## 4. Preview before saving (fix 9): mostly already built

The review step you already have lists every card with a checkbox, editable titles, due dates, and an "archive existing cards first" option. Nothing is written until you click "Create". The handoff described this as missing; it is not.

**What is still worth adding (small, no new screen):**
- Show the "Read me first" and "Decisions needed" cards at the top with a visible highlight, so people do not untick them by accident.
- If you untick a card that others depend on, say so ("3 later cards depend on this").
- "Select all / none".

**Recommendation:** these three only.

## 5. Guided intake for short descriptions (fix 12)

**Idea:** an optional, skippable step before generating, with a few plain questions. The answers go to the generator separately, so they do not eat the 500-character limit.

Mock-up (the first screen, before the description box):

```
 Help me describe it  (optional, skip any question)
 ------------------------------------------------------------
 Who will use it?                  [ my dog-walking customers      ]
 What must it never do?            [ store card numbers            ]
 Tools or accounts you already have [ none yet                      ]
 When, and how many hours a week?  [ ready by December, 5 hrs/wk   ]
 Does it involve money, personal
 data, or legal rules?             ( ) No   (x) Money   ( ) Personal data   ( ) Rules
 ------------------------------------------------------------
 [ Skip ]                                              [ Continue ]
```

- Up to five questions; every one optional; Skip is always visible.
- The when/hours answer fills the date fields from section 2, so the two features share one set of inputs.
- Answers are sent as a labeled block (capped at about 1,200 characters in total) and shown in the review step.
- With a checkbox, the same Replace/Append/Don't-save rule as section 3 applies to Project Context.
- Also add three clickable examples (a developer, a first-time founder, a non-software plan) that fill the box and show what a good 500 characters covers. This is the cheapest part and helps novices most.

**Recommendation:** build it after sections 2 and 3. Ship the examples first.

## Suggested order and size

| Step | Size | Needs |
|---|---|---|
| Date/hours inputs (2) | Small | none |
| Preview additions (4) | Small | none |
| Clickable examples (5, part 1) | Small | none |
| Context save + cap (3) | Small to medium | your pick of option 1, 2 or 3 |
| Guided intake (5) | Medium | after 2 and 3 |
| `dependsOn` / `kind` (1) | Large | export version 2, import id rewrite, MCP repo, conflict merge |

## Decisions I need from you

1. Approve section 1 (real fields), and if yes, confirm the "no assumptions field" recommendation.
2. Project Context limit: option 1, 2 or 3?
3. Approve the three small preview additions.
4. Approve the intake design, and confirm the questions (add or remove any).
5. Whether the MCP server repo should learn the new fields in the same release or later.

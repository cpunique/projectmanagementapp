# Kan-do — Landing Page Follow-ups (Consolidated)

**Date:** June 1, 2026, 06:18 AM EDT
**For:** Development
**Re:** Post-polish review + glow consistency — all landing page follow-ups in one place
**Context:** Reviewed the production deploy at projectmanagementapp-gamma.vercel.app after the visual-polish pass. The pass succeeded — the page reads as a genuine 2026 aesthetic now, not "flat." This brief confirms what landed and consolidates every remaining follow-up.

---

## What landed correctly — no action needed

- **Gradient mesh** — dimensional purple/magenta bleed behind the hero, carrying down into the problem section. The single biggest fix, and it's present.
- **Glassmorphism** — board preview and feature cards on frosted glass surfaces.
- **Ambient glow** — purple glow on CTAs and the feature icon tiles (purple / pink / teal).
- **Gradient text** — "has a brain now" reads purple→pink correctly.
- **Cohesion** — mesh carries through sections rather than stopping at the hero.

Don't re-tune any of the above. Match them; don't change them.

---

## Guiding principle for the follow-ups

The glow work below is about **cohesion and visual hierarchy**, not maximum glow. Applying glow uniformly to everything would flatten the hierarchy again — just brighter. Glow should guide the eye to what matters (the live board, the Pro plan) while secondary elements stay calmer. The instructions are deliberate about where glow goes and where it doesn't.

---

## 1. "See how it works" button — make it honest *(do now, trivial)*

**Current:** The hero secondary button reads "See it in action" and scrolls down to the problem/features section. It promises a demo but delivers a scroll.

**Change:** Relabel the button from "See it in action" to **"See how it works."** Keep the smooth-scroll behavior as-is.

**Why:** "See how it works" matches what the button actually does (scrolls to the explanation) without promising a live demo or video that doesn't exist yet. Honest framing on a first-impression page.

**Later (not now):** When there's a recordable flow, add a 30-60s Loom demo of the prompt-generation feature and point the button at it. Inline hero animation is a nice-to-have after that. Out of scope for this pass.

---

## 2. Board preview — add ambient glow + life

**Current:** The board preview is comparatively flat — no glow, feels like a static screenshot.

**Target:** Same dimensional treatment as the rest of the hero.

- **Ambient glow behind the panel:** soft, blurred radial purple glow behind the whole board preview (the richer reference used `.board-glow::before` — radial `rgba(147,51,234,.4)`, blurred ~40px, behind the panel). Main fix.
- **Glass surface:** confirm the board panel uses the glassmorphic treatment (semi-transparent surface, `backdrop-filter` blur, inset top-edge highlight) consistent with the feature cards.
- **Optional — life on the inner cards:** gentle hover-lift (`transform: translateY(-2px)`) on the cards inside the board preview, so it reads as a live board rather than a flat image.

---

## 3. Pricing cards — glow the Pro card, keep Free calm

**Current:** Both pricing cards are static, no glow.

**Target:** Use glow to reinforce the conversion hierarchy — draw the eye to Pro.

- **Pro card:** add the ambient purple glow (consistent with the CTAs and board preview). With its existing purple border, this makes Pro the clear focal point — good conversion design, not just decoration.
- **Free card:** keep it as clean glass — **no glow.** If both glow equally, neither stands out and the nudge toward Pro is lost. The asymmetry is intentional.
- **Both cards:** a gentle hover-lift is fine on both (signals interactivity). The *glow* favors Pro; the *hover* can be on both.

---

## 4. Hero vertical balance *(optional, taste-level)*

The hero is slightly left-weighted — empty space on the right below the board preview. Optional fix: vertically center the board preview against the left column, or let it sit a little larger/lower to fill the right side. Address only if it bugs you on closer look.

---

## 5. Mesh symmetry *(optional, taste-level)*

The gradient mesh is strongest on the left edge. Works fine; you could let it breathe more symmetrically across the hero for a more balanced glow. Pure taste — no functional issue.

---

## Consistency check

Glow color, blur radius, and intensity should match what's already used on the CTAs and feature icon tiles — same `rgba(147,51,234, …)` purple, same soft blur. One coherent glow language across the page, not several slightly different glows.

---

## Hard constraints (carry over)

- Respect `prefers-reduced-motion` — disable hover-lifts when set
- Animate only `transform` / `opacity`; glows are static (no animated blur)
- `backdrop-filter` fallback for unsupported browsers (solid surface)

---

## Priority

| # | Item | Priority | Effort |
|---|---|---|---|
| 1 | Relabel button → "See how it works" | Do now | Trivial |
| 2 | Board preview glow + glass | Do now | Low |
| 3 | Pro card glow (Free stays clean) | Do now | Low |
| 4 | Hero vertical balance | Optional | Low |
| 5 | Mesh symmetry | Optional | Low |
| — | Loom demo behind button | Fast follow | Low-medium |
| — | Inline hero animation | Later | Medium |

---

## What NOT to change

- Don't add glow to the Free card — the asymmetry is deliberate for conversion hierarchy
- Don't re-tune the existing CTA / feature-tile glows — match them, don't change them
- Don't animate the glows — they're static ambient effects
- Don't touch the mesh, glass, or gradient typography that already landed — they're right

---

*Reference: `Kando_Landing_Richer_Reference.html` includes the board glow (`.board-glow::before`) and the Pro-card glow as visual targets. Note it uses Inter as a Geist stand-in — production should use real Geist.*

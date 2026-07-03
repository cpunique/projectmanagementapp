# Kan-do — Landing Page Visual Polish Brief

**Date:** May 31, 2026, 11:23 PM EDT
**For:** Development
**Re:** Landing page visual layer — the structure shipped correctly, the 2026 aesthetic layer did not
**Reference file:** `Kando_Landing_Richer_Reference.html` (open in a browser; inspect the CSS for exact techniques)

---

## Summary

The landing page structure is correct — every section from the spec is present and in the right order. The issue is the **visual effects layer**: the gradient mesh, glassmorphism, ambient glow, and display typography that define the "2026 design language" were not implemented. The current build reads as flat near-black rectangles with hard borders, which is the 2021 look we're explicitly moving away from.

This is a **polish pass on top of the existing structure**, not a rebuild. The bones are right. Almost all of it is CSS.

Open the reference HTML file to see the target. The notes below explain each technique and how to apply it.

---

## What's missing (in priority order, highest visual impact first)

### 1. Gradient mesh background — THE core fix

The single biggest reason the page feels flat. The background is currently flat near-black. It needs soft, blurred color "blobs" bleeding behind the content to create dimensional dark instead of flat dark.

Technique (see `.mesh` / `.blob` in the reference):
- Fixed-position layer behind content with 2-3 large blurred radial blobs
- Deep purple (`#5b21b6`), magenta (`#7c1d6f`), indigo (`#3b1d80`) at low opacity
- `filter: blur(120px)` and `opacity: .35-.5` so they read as ambient glow, not shapes
- Positioned off the edges (top-left, top-right, bottom-center) so they bleed in

```css
.blob{position:absolute;border-radius:50%;filter:blur(120px);opacity:.5}
.blob.b1{width:620px;height:620px;background:#5b21b6;top:-180px;left:-120px}
```

### 2. Ambient glow on CTAs and the board preview

Primary buttons and the hero board preview should emit a soft purple glow — this signals energy and "intelligence."

- Buttons: `box-shadow: 0 0 30px rgba(147,51,234,.5)`, intensifying on hover
- Board preview: a radial-gradient glow behind it (see `.board-glow::before`)

### 3. Glassmorphism on cards and the board preview

Feature cards, pricing cards, the board preview, and the nav are currently flat opaque rectangles. They should be frosted glass:

```css
background: rgba(35,31,28,.55);
border: 1px solid rgba(255,255,255,.08);
backdrop-filter: blur(16px) saturate(1.2);
-webkit-backdrop-filter: blur(16px) saturate(1.2);
box-shadow: 0 10px 40px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05);
```

The `inset` highlight on the top edge is what sells the glass effect — it catches light like a real pane.

**Fallback (required):** `backdrop-filter` isn't universally supported. Provide a solid `background: #231f1c` fallback via `@supports not (backdrop-filter: blur(1px))` so unsupported browsers still get a clean surface.

### 4. Display typography

Headings currently look like a default system weight. They need:
- **Geist** loaded via `next/font` (the reference uses Inter as a stand-in since Geist isn't on Google Fonts CDN — production should use real Geist)
- Large, tight headings: hero H1 ~48-54px, `font-weight: 600`, `letter-spacing: -1.5px`
- The hero second line keeps the purple→pink gradient text treatment (already working)
- Clear weight contrast between headings (600) and body (400)

### 5. Vertical rhythm — fix the dead voids

The current page has content clustered at the top of each section with large empty space below — this reads as accidental emptiness, not intentional breathing room. Fix by:
- Generous but balanced section padding (~88px top/bottom)
- Center content within sections rather than top-aligning it
- Consistent max-width container (~1240px) centered on the page

### 6. Restore surface tone contrast

Sections are collapsing to near-identical black. With the gradient mesh in place behind everything, the glass surfaces (`rgba(35,31,28,.55)`) will naturally separate from the background. Ensure the mesh shows through between sections so there's visual rhythm.

### 7. Micro-interactions (light touch)

- Cards lift slightly on hover (`transform: translateY(-4px)` + intensified shadow/glow)
- Buttons lift and brighten their glow on hover
- Keep these subtle — they're polish, not the main event

---

## Hard constraints (carry over from the Phase 2 / app guidance)

- **Respect `prefers-reduced-motion`** — disable hover transforms and transitions when set
- **Performance** — animate only `transform` and `opacity`; the blurs are static (no animated blur, which is expensive)
- **`backdrop-filter` fallback** — solid surface fallback for unsupported browsers (see #3)
- **Mobile** — the mesh and glass should degrade gracefully; verify on iOS Safari and Android Chrome. `backdrop-filter` is supported on modern mobile Safari but test it.

---

## What NOT to change

- The page structure and section order — they're correct
- The copy — it's final (sourced from the Marketing Notes card)
- The color tokens — same palette, just applied with depth now
- Nav links (Features | Pricing only — no Demo), and the "Built on Firebase — SOC-2 certified infrastructure" social proof line — both already correct in the latest build

---

## Acceptance check

- [ ] Gradient mesh visible behind hero and throughout (dimensional dark, not flat black)
- [ ] Ambient purple glow on primary CTAs and board preview
- [ ] Glassmorphic treatment on cards, board preview, and nav (with `backdrop-filter` + fallback)
- [ ] Geist display font on headings with real weight contrast
- [ ] Section content vertically balanced — no large dead voids
- [ ] Hover micro-interactions on cards and buttons
- [ ] `prefers-reduced-motion` respected
- [ ] Verified on iOS Safari and Android Chrome

---

## Reference

`Kando_Landing_Richer_Reference.html` — open in a browser to see the target, and inspect the CSS for the exact gradient mesh, glassmorphism, glow, and typography techniques. It's a faithful visual target; match the *feel*, adapt the implementation to the real component structure and React/Tailwind setup.

*Note: the reference uses Inter as a Geist stand-in (Geist isn't on the Google Fonts CDN). Production should load real Geist via next/font.*

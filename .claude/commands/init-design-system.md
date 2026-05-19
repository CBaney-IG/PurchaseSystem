---
description: Optional design-direction interview. Captures brand voice, visual direction, and interaction principles in docs/product/design-system.md before architecture decisions are made.
---

# Initialize Design System

**This step is optional.** Skip it if the project doesn't need a defined visual identity yet (e.g. internal tools where utility trumps aesthetics, or early prototypes where the design will be figured out as you go). You can run it later — there's no penalty for deferring.

If the user is unsure whether to run this, ask them:
- "Do you have a clear sense of how this should look and feel, or would you rather decide as you build?"
- If they say "decide as I build" — recommend skipping for now and revisiting once a few features exist.

## Mode

**Enter plan mode at the start of this session and stay in it throughout the interview.** Like product discovery, this step is decisions-only — the design-system doc itself is the artifact. The natural shape:

1. Enter plan mode immediately.
2. Conduct the interview below (read-only operations are fine in plan mode).
3. Draft @docs/product/design-system.md content, then present via `ExitPlanMode` as the proposed plan.
4. Only after the user approves, exit plan mode and write the file.

## Introduction

"🎨 Let's capture the design direction. I'll ask a few questions about how the product should look, feel, and behave. Like the PRD, you can keep answers short — we're capturing intent, not pixel-perfect specs.

If you don't have a strong opinion on something, say 'no preference' and I'll record that — it's a useful answer."

## Questions (ask one at a time, wait for response)

1. **What three adjectives describe how the product should feel?** (e.g. "friendly, fast, quiet" / "professional, dense, precise")
2. **Are there any products whose design you specifically admire?** (give links or names — and what *specifically* you like about each)
3. **Visual mood: light and airy, dark and focused, vibrant, or monochrome?**
4. **Any colour preferences?** (specific hex codes, brand colours, or just a vibe like "deep blue" / "warm earth tones" / "no preference")
5. **Density: minimal whitespace-heavy, balanced, or information-dense?** (think Linear vs Notion vs Bloomberg Terminal)
6. **Mobile-first, desktop-first, or both equally?** (and why — e.g. "desktop because users are at a workstation")
7. **Accessibility: any specific concerns?** (e.g. "keyboard-first users", "screen-reader support", "high-contrast mode", or "WCAG AA baseline only")
8. **Anything explicitly out of scope for the MVP design?** (e.g. "no dark mode yet", "no animations", "no custom illustrations")

## After the interview

"📝 Let me draft your design system doc..."

Generate @docs/product/design-system.md using the template structure already in that file, populated from the interview answers. Where the user said "no preference", record that explicitly rather than inventing a choice — it tells the architect "this is open to the implementation".

Present the draft to the user for review. Make changes based on their feedback.

## Handoff

"✅ Design system captured. This will inform component-library and design-token decisions during `/init-architecture`.

Next step: run `/init-architecture` to design the technical architecture."

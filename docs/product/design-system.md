# Design System

> **Status:** Draft — populated during the optional `/init-design-system` step.
> Captures the **design intent** (what the product should look and feel like). The technical implementation — component library, Tailwind tokens, shared primitives — is decided during `/init-architecture` based on this intent.

## Brand Voice & Tone

[How should the product "speak" to users? Examples: friendly and casual / professional and precise / playful / minimal and quiet. Include 2-3 adjectives.]

## Visual Direction

- **Density:** [Minimal whitespace-heavy / balanced / information-dense]
- **Mood:** [Light and airy / dark and focused / vibrant / monochrome]
- **Era / style references:** [E.g. "Linear-style", "Notion-style", "1990s terminal", etc.]

## Color

- **Primary:** [Hex or description, e.g. "#4F46E5" or "deep blue, conveys trust"]
- **Accent:** [Hex or description]
- **Approach:** [Single brand colour + neutrals / multi-colour palette / strict monochrome]

## Typography

- **Headings:** [Font family or description, e.g. "geometric sans-serif" or "Inter"]
- **Body:** [Font family or description]
- **Mono (code/data):** [Font family or description]

## Reference Products

[Links to apps, sites, or screenshots the user likes — and **what specifically** they like about each. Be precise: "the way Linear handles keyboard shortcuts" beats "Linear is good".]

- [Product/URL] — [what's good about it]
- [Product/URL] — [what's good about it]

## Interaction Principles

- **Feedback:** [Snappy and immediate / considered and intentional / quiet]
- **Motion:** [Lots of subtle animation / minimal motion / none]
- **Density of confirmations:** [Confirm everything / confirm only destructive actions / trust the user]

## Accessibility Intent

- **WCAG target:** [AA (recommended baseline) / AAA / not targeted]
- **Specific concerns:** [E.g. "keyboard-first users", "screen-reader compatibility", "high-contrast mode", "no specific concerns yet"]

## Device Priority

- **Primary:** [Mobile / desktop / both equally]
- **Notes:** [E.g. "desktop-first because users are at a workstation", "mobile-first because field workers"]

## Out of Scope (for now)

[What design considerations are explicitly deferred? E.g. "no dark mode in MVP", "no internationalization", "no custom illustrations".]

---

## How This Doc Is Used

- `/init-architecture` reads this file to inform component-library choice (e.g. shadcn/ui vs MUI vs custom), Tailwind theme config, and design token decisions.
- Feature development references this doc when making UI decisions — if a question isn't answered here, it's worth asking the user before guessing.
- Update this doc when design decisions evolve. It is a living document, not a one-off output.

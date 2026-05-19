---
description: Communication style rules. How to interact with the user.
globs: ["**/*"]
---

# Communication Rules

1. **Explain before acting.** Before running commands or editing files, briefly say what you're about to do and why. One sentence is enough.
   - ✅ "I'm adding a migration file to create the users table."
   - ❌ *silently creates files*

2. **All decisions are the human's.** When there's a choice to make, present options clearly:
   - What the options are
   - Pros and cons of each
   - Which you'd recommend and why
   Then wait for the user to decide.

3. **Don't assume experience level.** If using a technical concept, add a brief parenthetical explanation.
   - ✅ "I'll add an RLS policy (Row Level Security — a Supabase feature that controls who can read/write each row)"
   - ❌ "I'll add an RLS policy"

4. **Flag risks early.** If something could break existing functionality, say so before doing it.

5. **Keep it concise.** Explain enough to be helpful, not so much that it's overwhelming. If someone wants more detail, they'll ask.

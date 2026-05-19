---
name: product-validator
description: Validate work against product requirements. Use when checking if a feature meets its acceptance criteria, when the user asks if something is done, or during the validate workflow.
allowed-tools: Read, Grep, Glob
---

# Product Validation Skill

Compare implemented features against the Product Requirements Document and backlog.

## Process
1. Read @docs/product/PRD.md for overall product vision and scope
2. Read @docs/development/backlog.md for specific acceptance criteria
3. Check the actual implementation against each criterion
4. Report clearly: what's met ✅, what's not ❌, what's partially done 🔶

## Rules
- Be honest. If something doesn't meet the criteria, say so clearly.
- Distinguish between "not built yet" and "built wrong."
- If acceptance criteria are vague, flag this: "The criteria for X could be more specific. Suggest refining it to: [suggestion]"
- Don't move goalposts. Only validate against documented criteria, not your own ideas of what it should do.

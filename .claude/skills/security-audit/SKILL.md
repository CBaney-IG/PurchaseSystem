---
name: security-audit
description: Security review for ISO 27001 alignment. Use when reviewing security, before deployments, when handling auth/authorization, or when the user mentions security, compliance, or data protection.
allowed-tools: Read, Grep, Glob
---

# Security Audit Skill

Review code and architecture for security issues, aligned with ISO 27001 principles.

## Quick Checks (every review)
- No secrets, API keys, or credentials in source code
- Authentication required on all non-public routes
- Authorization checks (RLS policies, middleware) on data access
- Input validation and sanitization on all user inputs
- HTTPS enforced (Vercel handles this but verify redirect config)
- Error messages don't leak internal details

## ISO 27001 Alignment Areas
For this MVP template, focus on these relevant controls:
- **A.8 Asset management** — Data classified, handling procedures documented
- **A.9 Access control** — Role-based access, least privilege
- **A.14 System development** — Secure development practices, change management
- **A.12 Operations security** — Logging, monitoring, vulnerability management

## Documentation Check
Verify @docs/architecture/security.md covers:
- Authentication method and providers
- Authorization model (roles, permissions)
- Data classification (what's sensitive, what's public)
- Encryption (at rest via Supabase, in transit via HTTPS)
- Audit logging approach
- Incident response basics

## Report Format
- 🔴 **Critical:** Must fix before deployment
- 🟡 **Medium:** Should fix soon, acceptable for MVP with documented risk
- 🟢 **Low:** Nice to have, document as future improvement
- ℹ️ **Note:** For awareness, not necessarily actionable now

Reference @docs/architecture/security.md for project-specific security requirements.

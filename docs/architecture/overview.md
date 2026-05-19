# Architecture Overview

> **Status:** Draft — run `/init-architecture` to fill this out after completing the PRD.

## System Diagram

```
┌─────────────────────────────────────────────┐
│                  Client                      │
│              (Next.js App)                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Pages   │  │Components│  │  Hooks     │  │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  │
│       │              │              │         │
│  ┌────┴──────────────┴──────────────┴─────┐  │
│  │         src/lib/ (shared layer)         │  │
│  │  ┌─────────┐  ┌──────┐  ┌───────────┐  │  │
│  │  │  data/  │  │types/│  │  utils/    │  │  │
│  │  └────┬────┘  └──────┘  └───────────┘  │  │
│  └───────┼────────────────────────────────┘  │
└──────────┼───────────────────────────────────┘
           │
    ┌──────┴──────┐
    │  Supabase   │
    │ (PostgreSQL)│
    │  + Auth     │
    └─────────────┘
```

## Key Decisions

> For full technology choices, rationale, and swap guides, see [tech-stack.md](tech-stack.md).
> For individual architectural decisions, see [decisions/](decisions/).

| Decision | Choice | Migration Path |
|----------|--------|----------------|
| Framework | Next.js 14+ App Router | Standard React app |
| Database | Supabase (PostgreSQL) | Swap client in src/lib/data/ |
| Hosting | Vercel | Any Node.js host |
| Auth | Supabase Auth | Any JWT-based auth |

## Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth-required routes (grouped)
│   ├── (public)/          # Public routes
│   ├── api/               # API routes (if needed beyond server actions)
│   └── layout.tsx         # Root layout
├── components/
│   ├── ui/                # Reusable UI primitives
│   └── [feature]/         # Feature-specific components
├── lib/
│   ├── data/              # Data access layer (Supabase calls live here ONLY)
│   ├── types/             # Shared TypeScript types
│   ├── utils/             # Pure utility functions
│   └── supabase/          # Supabase client setup (client + server)
├── hooks/                 # Custom React hooks
└── styles/                # Global CSS, Tailwind config
```

## Data Flow

1. **Pages** call functions from `src/lib/data/`
2. **Data layer** calls Supabase and returns typed results
3. **Components** receive data as props or via hooks
4. **Server actions** handle mutations, calling data layer functions

## Authentication Flow

[Describe after init-architecture: which auth providers, session management, protected routes]

## Component Boundaries

[Describe after init-architecture: which components own which state, data fetching boundaries]

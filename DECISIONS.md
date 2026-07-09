# Decisions (product constitution)

## Name

**Shipkit** — ship products, not micro-frameworks.

## Why this exists

Maximize **vibe coding effectiveness**: humans + agents implement *product ideas* instead of re-wiring auth/deploy every project.

## Multi-platform strategy (from market research)

| Phase | What | Why |
|-------|------|-----|
| **Now** | Portable **infra** (Postgres URL, auth adapters, Docker + Vercel) | What Open SaaS / MakerKit-portable get right |
| **Next** | First app adapter polished (**Next.js**) | Highest agent training data + SSR product path |
| **Later** | Second app adapter (Nuxt or TanStack) as a **variant** | How supastarter/MakerKit scale multi-FW without one mega-repo |

We explicitly **do not** ship three UI frameworks half-broken on day one.

## Default stack (v0)

| Layer | Choice | Research rationale |
|-------|--------|-------------------|
| App | Next.js App Router | Dominant full-stack TS surface for agents |
| Auth | Supabase Auth adapter → Better Auth next | Fast path + portable self-host path |
| Data | Postgres (any URL) + optional Supabase | Twelve-factor backing service |
| ORM contract | Drizzle schema in `@shipkit/db` | DB-agnostic TS industry default |
| Security | Headers + Zod + rate-limit port | ASVS L1 practical baseline |
| Deploy | Vercel recipe + Docker Compose | Two first-class hosts, no single religion |
| Agent DX | AGENTS.md + IDEA.md + llms.txt | agents.md standard + vibe workflow |

## Rejected (for now)

| Idea | Why not v0 |
|------|------------|
| HTTP-only microframework | Wrong problem (already solved by Hono/etc.) |
| Full MakerKit feature parity | Scope death for a free OSS core |
| Multi-framework SKU day one | Needs commercial team (supastarter model) |
| Anchoring brand to one private product | Shipkit is for **everyone’s** ideas |

## Success criteria

1. Newcomer runs `pnpm dev` and sees a real product shell  
2. Agent can implement a feature from `IDEA.md` without inventing a new stack  
3. Switching deploy/DB is a **preset/env** change, not a rewrite  

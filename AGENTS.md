# AGENTS.md — Shipkit

You are helping build a **product** on Shipkit, not invent a new stack.

## Mission

Maximize speed from **idea → working product**.  
Foundation (auth, security, deploy shape) is already chosen. Implement **IDEA.md**.

## Always read first

1. `IDEA.md` — product scope and MVP checklist  
2. This file — stack rules  
3. `docs/VIBE.md` — workflow  
4. `ARCHITECTURE.md` if changing structure  

## Stack (do not replace)

| Piece | Choice |
|-------|--------|
| App | Next.js App Router in `apps/web` |
| Auth | `getAuth()` → AuthPort (`supabase` or `better-auth` via env) |
| Skills | `.agents/skills/*/SKILL.md` (ship-feature, add-entity, …) |
| Validation | Zod via `@shipkit/security` or local schemas |
| DB schema | `@shipkit/db` + SQL in `packages/db/sql` |
| Style | Tailwind tokens in `apps/web/src/app/globals.css` |

## Commands

```bash
pnpm install
pnpm doctor
pnpm test             # security unit tests
pnpm dev              # http://localhost:3000
pnpm build
pnpm db:up            # Docker Postgres (portable-pg)
pnpm create -- my-app # scaffold a new product folder
```

## Hard rules

1. **Vendor SDKs only in** `apps/web/src/lib/adapters/**`  
2. **Product UI** under `apps/web/src/app/` — prefer `/app/*` for logged-in features  
3. **Validate** all writes (Zod)  
4. **User isolation** — never query other users’ rows without a clear policy  
5. **No new framework** (Vue/Svelte/Remix) unless the human asks  
6. **No secrets** in git; use `.env.local`  
7. Keep diffs small; one MVP slice per change set  

## Boundaries

| Always OK | Ask first | Never |
|-----------|-----------|-------|
| Landing/app UI from IDEA.md | New npm dependency | Disable security headers |
| New `/app` routes | New auth provider | Commit `.env*` |
| SQL migrations for domain tables | Multi-tenant redesign | Rewrite monorepo tooling casually |
| Copy/SEO polish | Payments integration | Put service-role keys in client |

## When stuck

- Prefer the smallest change that unblocks the MVP checklist in `IDEA.md`  
- If env missing, say so and point to `pnpm doctor` / presets — don’t fake production auth  
- If requirements conflict with IDEA.md, stop and ask  

## Done means

- [ ] MVP item implemented end-to-end (UI + data if needed)  
- [ ] `pnpm --filter @shipkit/web build` still works  
- [ ] IDEA.md checklist updated  

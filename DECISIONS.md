# Decisions (locked by maintainer)

Date: 2026-07-10

## Product name

**Shipkit** — product foundation kit (not an HTTP micro-framework).

## Multi-platform approach

**Strategy 2 now → Strategy 3 later** (industry terms):

1. **Infra portable** first (DB/auth/deploy)  
2. **Next.js** = first app adapter only  
3. Second UI framework later as a **variant**, not day-one parity  

Not copying supastarter’s full multi-framework SKU model until there is demand + capacity.

## Default stack (first-class)

| Layer | Choice | Why |
|-------|--------|-----|
| App | Next.js App Router | AtoEnglish production proof; agent training data |
| Auth v0 | Supabase Auth | Already battle-tested in AtoEnglish |
| Auth v0.2 | Better Auth + Drizzle | Portable / self-host path |
| DB | Postgres | Universal; Supabase or Docker URL |
| ORM path | Drizzle in `@shipkit/db` | Portable schema |
| Deploy | Vercel **and** Docker | No single-host religion |
| Style | Tailwind + simple tokens | Fast landing, no design rabbit hole |

## Explicit rejections (for now)

- Rewriting AtoEnglish into the kit wholesale  
- Billing / multi-tenant orgs in v0  
- Cloudflare Edge as first-class (experimental later)  
- Keeping the old HTTP-only `vibecode` design as the product  

## Repo

New repo: `Thunderkill016/shipkit`  
Old `vibecode` HTTP experiment: leave or archive with pointer.

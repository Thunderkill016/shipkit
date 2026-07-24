# Research notes → product decisions

Living notes. Each finding maps to a CycleWarden action.

## Market (SaaS starters 2025–2026)

| Finding | CycleWarden action |
|---------|----------------|
| Paid kits win on multi-tenant + billing depth | Stay free core; billing as later port |
| Open SaaS wins on free + agent DX + deploy CLI | Copy **agent skills + one-command deploy story** |
| MakerKit splits Supabase vs self-host kits | Ship **AUTH_ADAPTER** + presets, not two products yet |
| supastarter multi-FW = separate codebases | Defer second UI FW until kernel is hard |
| ShipFast wins TTP, loses depth | Optimize **IDEA→dev** loop, keep security |

## Standards

| Standard | How we use it |
|----------|----------------|
| Twelve-Factor | env config, backing services as adapters |
| Ports & Adapters | AuthPort, RateLimitPort, adapter folders |
| OWASP ASVS L1 | headers, validation, session, authz |
| agents.md | root AGENTS.md + IDEA.md + llms.txt |
| SKILL.md (2026) | `.agents/skills/*/SKILL.md` playbooks |

## Vibe coding gaps (Supabase + industry checklists)

| Gap in AI prototypes | CycleWarden fix |
|----------------------|-------------|
| No RLS / open tables | SQL samples + checklist |
| Secrets in client | doctor + AGENTS never-list |
| No rate limit | InMemoryRateLimiter + Upstash-ready port |
| Stack thrash mid-chat | Locked stack in AGENTS.md |
| Deploy unknown | presets + PRODUCTION_CHECKLIST |

## Auth portable path

Industry default 2026 for self-host TS: **Better Auth + Drizzle + Postgres URL**.  
CycleWarden: `AUTH_ADAPTER=better-auth` when `DATABASE_URL` set; Supabase remains `supabase-full` preset.

## Next research bets

1. OpenAPI / typed client generation from server actions  
2. Playwright e2e smoke in CI  
3. `create-cyclewarden` template publish
4. StoragePort (S3/R2)  
5. Second app adapter evaluation (Nuxt vs TanStack)  

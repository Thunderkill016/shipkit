# Shipkit — Standards (constitution)

## Anchors

| Layer | Standard |
|-------|----------|
| Cloud app | [Twelve-Factor](https://12factor.net/) — especially config + backing services |
| Structure | Ports & Adapters (Hexagonal) |
| Security | OWASP ASVS Level 1 (practical subset) + AtoEnglish SECURITY baseline |
| Agents | [AGENTS.md](https://agents.md/) |
| Comparison set | Open SaaS, MakerKit, supastarter, nextjs/saas-starter, ShipFast |

## Must-have modules (v0)

- [x] Design tokens + landing  
- [x] Auth path (Supabase adapter)  
- [x] Protected app shell  
- [x] Security headers (CSP, HSTS, …)  
- [x] Validation + rate limit primitives  
- [x] Docker Postgres + env example  
- [x] AGENTS.md + production checklist  
- [ ] E2E smoke (v0.2)  
- [ ] Better Auth portable adapter (v0.2)  

## Supported matrix (v0)

| | Supabase bundle | Postgres Docker |
|--|-----------------|-----------------|
| Next + Vercel | L2 goal | L1 |
| Next + Docker | L1 | L2 goal |

Legend: L2 = first-class + docs; L1 = works + docs.

## Definition of done (release)

1. `pnpm dev` shows landing  
2. With env, auth login works  
3. `pnpm doctor` reports missing env  
4. Headers present on responses  
5. README states presets and non-goals honestly  

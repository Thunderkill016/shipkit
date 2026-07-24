# Standards — what “good” means

CycleWarden is measured against **public standards**, not a single private codebase.

## Layer 1 — Cloud app

**[Twelve-Factor](https://12factor.net/)** especially:

- III Config in the environment  
- IV Backing services as attached resources  
- X Dev/prod parity  

## Layer 2 — Architecture

**Ports & Adapters**

- Features depend on `AuthPort` / DB contracts  
- Vendor SDKs only under `lib/adapters/*`  

## Layer 3 — Security

**OWASP ASVS Level 1 (practical subset)**

- Safe auth session handling  
- Access control on protected routes  
- Input validation on writes  
- Security headers (CSP, HSTS, frame deny, nosniff…)  
- Rate limiting on sensitive actions  
- No secrets in client bundles  

See `PRODUCTION_CHECKLIST.md`.

## Layer 4 — Product surface

Industry SaaS-starter expectations (Must for v0):

- Marketing landing + SEO metadata  
- Auth (sign in / sign up / sign out)  
- Protected app shell  
- DB path + user-scoped model  
- Deploy recipes (≥2)  
- Agent-readable project map  

## Layer 5 — Vibe / agents

- [AGENTS.md](https://agents.md/) at repo root  
- `IDEA.md` product brief for the current product  
- `llms.txt` map of docs for agents  
- Clear always / ask / never boundaries  

## Comparison set (benchmark, not copy)

Open SaaS · MakerKit · supastarter · nextjs/saas-starter · ShipFast  

Score on: portability, security, TTP, agent DX, honesty of claims.

## Release gates

| Version | Gate |
|---------|------|
| v0.1 | Dev shell + auth path + headers + doctor + docs |
| v0.2 | Better Auth portable path + e2e smoke + CI matrix |
| v1.0 | Two deploy L2 + two auth paths L2 + measured TTFP writeup |

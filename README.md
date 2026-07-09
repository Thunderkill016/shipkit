# ✦ Shipkit

**The open product kit for vibe coding.**

Go from **idea → landing + auth + app + database + security + deploy** without rebuilding the foundation every time. Built for humans and AI agents who want to ship *their* product, not fight config.

[![License: MIT](https://img.shields.io/badge/License-MIT-7dd3c0.svg)](./LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)

```bash
git clone git@github.com:Thunderkill016/shipkit.git
cd shipkit && pnpm install
cp .env.example apps/web/.env.local   # optional for real auth
pnpm doctor && pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) · edit **`IDEA.md`** · vibe the product.

---

## Why Shipkit?

| Pain | Shipkit |
|------|---------|
| Agents reinvent auth every chat | Fixed stack + `AuthPort` |
| Demo apps die at deploy | Docker + Vercel recipes |
| Insecure vibe prototypes | Headers, validation, rate-limit primitives |
| Locked to one closed AI builder | **Your repo**, MIT, portable presets |
| “Which framework?” thrash | Research-backed defaults (see `STANDARDS.md`) |

Grounded in public standards: **Twelve-Factor**, **Ports & Adapters**, **OWASP ASVS L1**, **[AGENTS.md](https://agents.md/)**.

---

## Vibe workflow (2 minutes)

1. **Edit** [`IDEA.md`](./IDEA.md) — who, problem, MVP checklist  
2. **Run** `pnpm dev`  
3. **Prompt your agent:**  
   *“Read IDEA.md + AGENTS.md. Implement the next MVP item under /app.”*  
4. **Ship** with a preset (`supabase-full` or `portable-pg`)

Full guide: [`docs/VIBE.md`](./docs/VIBE.md)

---

## What’s included

- **Landing** — product marketing shell  
- **Auth** — sign in / sign up / sign out (Supabase adapter; portable auth next)  
- **App shell** — protected `/app` for your features  
- **Security** — CSP, HSTS, Zod, rate-limit port  
- **Data** — Postgres schema + optional Supabase RLS SQL  
- **Presets** — managed Supabase *or* your own Postgres  
- **Agent DX** — `AGENTS.md`, `IDEA.md`, `llms.txt`  

### Layout

```text
IDEA.md                 ← your product (start here)
AGENTS.md               ← rules for AI agents
apps/web                ← Next.js UI (first app adapter)
packages/config         ← env + presets
packages/security       ← headers, rate limit, validation
packages/db             ← schema + SQL
packages/auth           ← AuthPort contract
presets/                ← supabase-full · portable-pg
docs/VIBE.md            ← how to vibe effectively
```

---

## Presets (multi-platform infra)

| Preset | Best when |
|--------|-----------|
| [`supabase-full`](./presets/supabase-full.md) | Want managed auth + DB fast |
| [`portable-pg`](./presets/portable-pg.md) | Want any Postgres (Docker/Neon/Railway…) |

Deploy recipes: **Vercel** and **Docker**. More hosts/adapters without rewriting product UI.

Next.js is the **first** app adapter — architecture allows more later (see `DECISIONS.md`).

---

## Docs map

| Doc | Purpose |
|-----|---------|
| [VISION.md](./VISION.md) | Product vision |
| [STANDARDS.md](./STANDARDS.md) | Quality bar |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Packages & ports |
| [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) | Before go-live |
| [llms.txt](./llms.txt) | Agent doc index |

---

## Roadmap

- [x] v0.1 — Kernel + Next adapter + auth path + security + vibe docs  
- [ ] v0.2 — Better Auth portable path + e2e smoke  
- [ ] v0.3 — Storage + mail ports  
- [ ] v1.0 — Second app adapter when demand is clear  

---

## License

MIT © [Thunderkill016](https://github.com/Thunderkill016)

**Stop configuring. Start shipping ideas.**

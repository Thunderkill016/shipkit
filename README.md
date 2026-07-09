# ✦ Shipkit

**Open product foundation kit** — ship landing, auth, app shell, database, security, and deploy without rebuilding the same base every time.

> Multi-platform **by architecture** (ports + presets).  
> **Next.js is the first app adapter**, not a permanent religion.  
> Infra: Supabase **or** portable Postgres · Deploy: **Vercel and Docker**.

[![License: MIT](https://img.shields.io/badge/License-MIT-7dd3c0.svg)](./LICENSE)

---

## Why

| You want | Shipkit |
|----------|---------|
| Full product path A→Z | Landing → login → `/app` → SQL → headers → recipes |
| Not locked forever to one cloud | Ports + `supabase-full` / `portable-pg` presets |
| Lessons from a real app | Patterns from [AtoEnglish](https://github.com/Thunderkill016/AtoEnglish) |
| AI / vibe coding | `AGENTS.md`, clear package boundaries |

**Not** an Express clone. **Not** Lovable. **Not** full Nuxt+Next parity on day one (see `DECISIONS.md`).

---

## Quick start

```bash
git clone git@github.com:Thunderkill016/shipkit.git
cd shipkit
pnpm install
cp .env.example apps/web/.env.local
# fill Supabase keys for real auth — or run without for demo UI
pnpm doctor
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Presets

| Preset | Guide |
|--------|--------|
| `supabase-full` | [`presets/supabase-full.md`](./presets/supabase-full.md) |
| `portable-pg` | [`presets/portable-pg.md`](./presets/portable-pg.md) · `pnpm db:up` |

---

## Monorepo layout

```text
apps/web                 Next.js adapter (UI + middleware)
packages/config          Env schema, preset types
packages/security        CSP/HSTS helpers, rate limit, Zod
packages/db              Drizzle schema + SQL
packages/auth            AuthPort contract
presets/                 Human setup docs
```

---

## Architecture (short)

```text
Feature UI  →  getAuth() / ports  →  adapters (supabase, …)
                     ↑
              @shipkit/* kernel
```

Details: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · Standards: [`STANDARDS.md`](./STANDARDS.md) · Vision: [`VISION.md`](./VISION.md)

---

## Roadmap

- [x] v0.1 Kernel packages + Next app + Supabase auth adapter + Docker PG + docs  
- [ ] v0.2 Better Auth portable adapter + e2e smoke + CI matrix  
- [ ] v0.3 Storage/mail ports  
- [ ] v1.0 Second app adapter (Nuxt or TanStack — demand-driven)  

---

## Comparison (honest)

| | Shipkit | ShipFast | Open SaaS | MakerKit |
|--|---------|----------|-----------|----------|
| Price | Free MIT | Paid | Free | Paid |
| Multi-FW day one | No (phased) | No | Wasp only | Variants |
| Portable DB/auth | Yes (direction) | Limited | Yes deploy | Strong |
| Source | Production extract | Template | Wasp template | Commercial kits |

---

## License

MIT © ThunderK / [Thunderkill016](https://github.com/Thunderkill016)

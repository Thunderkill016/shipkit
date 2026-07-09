# Architecture

## Goal

Let people **vibe features** while the foundation stays boring and correct.

```text
┌─────────────────────────────────────────────┐
│  IDEA.md  →  agent / human implements       │
│  features in apps/web (product UI)          │
└───────────────────┬─────────────────────────┘
                    │ uses
┌───────────────────▼─────────────────────────┐
│  Kernel packages (@shipkit/*)               │
│  config · security · db · auth contracts    │
└───────────────────┬─────────────────────────┘
                    │ implemented by
┌───────────────────▼─────────────────────────┐
│  Adapters                                   │
│  supabase auth · (better-auth next)         │
│  postgres URL · deploy recipes              │
└─────────────────────────────────────────────┘
```

## Packages

| Package | Role for vibe coders |
|---------|----------------------|
| `@shipkit/config` | Env schema, preset IDs — “what’s configured?” |
| `@shipkit/security` | Don’t reinvent CSP / rate limit / password schema |
| `@shipkit/db` | Canonical `profiles` schema — extend for your domain |
| `@shipkit/auth` | `AuthPort` — swap providers without rewriting pages |
| `@shipkit/storage` | `StoragePort` — S3-compatible uploads (adapters later) |
| `@shipkit/mail` | `MailPort` — transactional email (+ console stub) |

## App adapter

`apps/web` — Next.js:

- `/` landing  
- `/login` auth  
- `/app` protected shell (your product lives here)  
- `src/lib/adapters/*` only place for vendor SDKs  

## Presets

| Preset | When |
|--------|------|
| `supabase-full` | Fastest managed auth+DB |
| `portable-pg` | Own Postgres (Docker/Neon/Railway…) |

## Extending for your idea

1. Write `IDEA.md` (who, problem, MVP screens, data).  
2. Add tables next to `profiles` + isolation rules.  
3. Add routes under `/app/...`.  
4. Keep imports: UI → ports → adapters.  

Agents: follow `AGENTS.md`. Humans: same.

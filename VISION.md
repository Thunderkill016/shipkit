# Shipkit — Vision

## Problem

Building a real product (landing → auth → app → DB → security → deploy) means redoing the same foundation every time. SaaS boilerplates either **lock you to one vendor** or are **paid multi-framework empires**.

## Solution

**Shipkit** is an open-source **product foundation kit**:

- A→Z path: design tokens, landing, auth, app shell, database, security, CI, deploy recipes  
- **Portable infrastructure** (Postgres URL, auth adapters, Docker + Vercel)  
- **Next.js as the first app adapter** (not the definition of the kit forever)  
- Extracted from patterns proven in production ([AtoEnglish](https://github.com/Thunderkill016/AtoEnglish))

## Non-goals (v0–v1)

- Replacing MakerKit / supastarter feature-for-feature (billing multi-tenant day one)  
- Full Next + Nuxt + Svelte parity in v0  
- AI chat-to-site (Lovable-class)  
- Domain features (e.g. e-learning curriculum)

## Strategy (locked)

| Phase | What |
|-------|------|
| **v0** | Kernel packages + Next adapter + presets `supabase-full` & `portable-pg` + Docker + Vercel recipes |
| **v1** | Harden CI matrix, e2e smoke, doctor CLI, production checklist |
| **v2** | Second app adapter (Nuxt **or** TanStack Start — pick by demand) |

Pattern from industry: **MakerKit-style variants + T3 Turbo packages + Open SaaS deploy story**.

## Success metrics

- **TTP** (time-to-production) ≤ 60 min on a first-class preset  
- User isolation tests green  
- Zero vendor SDK imports inside feature code (only adapters)

## ICP

Solo builders, indie hackers, AI-assisted (vibe) coders who want **owned code** and a path that already shipped in production.

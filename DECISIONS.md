# Decisions (product constitution)

## Name

**CycleWarden** — ship products, not micro-frameworks.

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
| ORM contract | Drizzle schema in `@cyclewarden/db` | DB-agnostic TS industry default |
| Security | Headers + Zod + rate-limit port | ASVS L1 practical baseline |
| Deploy | Vercel recipe + Docker Compose | Two first-class hosts, no single religion |
| Agent DX | AGENTS.md + IDEA.md + llms.txt | agents.md standard + vibe workflow |

## Rejected (for now)

| Idea | Why not v0 |
|------|------------|
| HTTP-only microframework | Wrong problem (already solved by Hono/etc.) |
| Full MakerKit feature parity | Scope death for a free OSS core |
| Multi-framework SKU day one | Needs commercial team (supastarter model) |
| Anchoring brand to one private product | CycleWarden is for **everyone’s** ideas |

## Success criteria

1. Newcomer runs `pnpm dev` and sees a real product shell  
2. Agent can implement a feature from `IDEA.md` without inventing a new stack  
3. Switching deploy/DB is a **preset/env** change, not a rewrite  
4. Every agent action is governed by the Evolution Engine — auditable, policy-checked, evidence-backed  

## Evolution Engine decisions

CycleWarden is not just a starter kit — it wraps probabilistic AI in a **deterministic control harness**:

| Decision | Rationale |
|----------|-----------|
| Append-only JSONL event journal | Immutable audit trail; crash-recovery via replay; SLSA-compatible provenance |
| SHA-256 content-addressed evidence | Tamper-evident research claims; zero-trust verification of agent outputs |
| A0–A4 graduated autonomy levels | Mirrors L0–L5 autonomous driving; prevents "all or nothing" agent trust |
| R0–R4 risk classification | High-risk actions (deploy, spend, secrets) require explicit human approval |
| Scoped, expiring approvals | No permanent "sudo" for agents; every approval has a bounded time window |
| Agents cannot self-approve transitions | Structural enforcement, not prompt-based trust |

## Compliance positioning

CycleWarden's Evolution Kernel natively satisfies core requirements of the **EU AI Act** (effective Aug 2, 2026):

| EU AI Act Requirement | CycleWarden Implementation |
|-----------------------|---------------------------|
| Automatic Logging (Art. 12) | Append-only event journal + SHA-256 checksum chains |
| Human Oversight (Art. 14) | A0–A4 autonomy gates + explicit approval records |
| Transparency (Art. 13) | Evidence registry with citation auditing |
| Risk Management (Art. 9) | R0–R4 risk classification per action |
| Technical Documentation (Art. 11) | IDEA.md + AGENTS.md + llms.txt + PROJECT_MODEL.md |

This is a **structural competitive advantage** — no other SaaS boilerplate has built-in AI governance.


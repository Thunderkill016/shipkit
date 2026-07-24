# CycleWarden — Vision

## One-liner

**The open AI-native product kit** — go from idea → governed, evidence-backed web product without rebuilding auth, data, security, agent governance, and deploy every time.

## Problem

AI-assisted development in 2026 faces **two compounding problems**:

### 1. Foundation fatigue (the "boring 80%")
Vibe coding is fast at UI and ideas, slow at the boring foundation:

- Auth, sessions, protected routes  
- Database + user isolation  
- Security headers, validation, rate limits  
- Env, deploy, "does this actually run in prod?"

Most tools either lock you into one cloud chat UI, or dump a huge paid boilerplate you don't understand.

### 2. Agent governance gap (the "trust 0%")
AI agents can generate code fast, but nobody controls *what they decide to build or deploy*:

- No audit trail for agent decisions  
- No evidence chain for research claims  
- No graduated autonomy (agents go from "suggest" to "deploy" with no middle ground)  
- No compliance story for EU AI Act (effective Aug 2, 2026)

## Solution

CycleWarden is **two things in one product**:

### A. Research-backed Product Foundation (`apps/web`)

| Principle | Source |
|-----------|--------|
| Config & backing services as attachable resources | [Twelve-Factor App](https://12factor.net/) |
| Swap DB/auth/deploy without rewriting features | Ports & Adapters (Hexagonal) |
| Secure-by-default web baseline | OWASP ASVS L1 (practical) |
| AI agents stay on rails | [AGENTS.md](https://agents.md/) + idea brief |
| Multi-platform without day-one chaos | Industry pattern: portable infra first, extra UI frameworks later |

### B. Deterministic Evolution Engine (`packages/evolution-core`)

| Principle | Implementation |
|-----------|----------------|
| AI agents are **untrusted workers**, not owners | Policy engine (A0–A4 autonomy × R0–R4 risk) |
| Every decision needs **evidence** | SHA-256 content-addressed evidence registry |
| Every state change is **auditable** | Append-only JSONL event journal with checksum chain |
| Human approval gates are **non-negotiable** | Scoped, expiring, revocable EvolutionApproval records |
| Research claims need **citations** | Claim extraction, contradiction detection, citation auditing |

**These two halves share one state model, one evidence trail, and one governance policy.**

## Who it's for

- Indie builders and teams shipping **real web products**  
- People (and agents) who vibe in Cursor / Claude / Codex / Grok  
- Anyone who wants **owned code**, not a closed prompt-to-app silo  
- Teams needing **auditable AI governance** for compliance or internal policy  

## North star metrics

1. **Time-to-first-useful-product (TTFP):**  
   empty repo → landing + auth + app shell + DB path + security headers + deploy recipe  
   **target: under one focused session.**

2. **Agent governance coverage:**  
   Every agent action → policy check + evidence hash + audit log  
   **target: zero unaudited mutations.**

## Non-goals

- Being every UI framework on day one (Next first; more adapters later)  
- Closed AI website builder (Lovable-class)  
- Enterprise multi-tenant billing as the v0 headline  
- "Yet another HTTP router"
- Replacing existing AI coding tools (Cursor, Codex, Claude) — CycleWarden **wraps** them, doesn't compete with them

## Promise

Describe your idea in `IDEA.md`, keep agents on `AGENTS.md`, let the Evolution Engine govern the lifecycle, ship on a preset — **foundation is done, governance is built-in, product work is yours.**

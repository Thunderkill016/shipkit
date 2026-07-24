# CycleWarden — Vision

## One-liner

**The open product kit for vibe coding** — go from idea → live web product without rebuilding auth, data, security, and deploy every time.

## Problem

Vibe coding is fast at UI and ideas, slow at the boring foundation:

- Auth, sessions, protected routes  
- Database + user isolation  
- Security headers, validation, rate limits  
- Env, deploy, “does this actually run in prod?”

Most tools either lock you into one cloud chat UI, or dump a huge paid boilerplate you don’t understand.

## Solution

CycleWarden is a **research-backed product foundation**:

| Principle | Source |
|-----------|--------|
| Config & backing services as attachable resources | [Twelve-Factor App](https://12factor.net/) |
| Swap DB/auth/deploy without rewriting features | Ports & Adapters (Hexagonal) |
| Secure-by-default web baseline | OWASP ASVS L1 (practical) |
| AI agents stay on rails | [AGENTS.md](https://agents.md/) + idea brief |
| Multi-platform without day-one chaos | Industry pattern: portable infra first, extra UI frameworks later |

## Who it’s for

- Indie builders and teams shipping **real web products**  
- People (and agents) who vibe in Cursor / Claude / Codex / Grok  
- Anyone who wants **owned code**, not a closed prompt-to-app silo  

## North star metric

**Time-to-first-useful-product (TTFP):**  
empty repo → landing + auth + app shell + DB path + security headers + deploy recipe  
**target: under one focused session.**

## Non-goals

- Being every UI framework on day one (Next first; more adapters later)  
- Closed AI website builder (Lovable-class)  
- Enterprise multi-tenant billing as the v0 headline  
- “Yet another HTTP router”

## Promise

Describe your idea in `IDEA.md`, keep agents on `AGENTS.md`, ship on a preset — **foundation is done; product work is yours.**

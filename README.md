# ✦ Shipkit

**Unified AI-Native Product Evolution System & Deterministic Control Engine**

Shipkit combines a product workspace, Next.js application foundation, deterministic evolution kernel, evidence-backed research intelligence, sandboxed agent execution, automated verification, and continuous measured learning into one governed product lifecycle.

> **Core Philosophy:** Models and agents are *interchangeable workers*. They do not own Shipkit's state, permissions, evidence, deployment authority, or final verdicts. Shipkit wraps probabilistic AI in a deterministic control harness.

[![Node.js](https://img.shields.io/badge/node-%E2%89%A520-brightgreen.svg)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-9.15.0-blue.svg)](https://pnpm.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Security: Protected](https://img.shields.io/badge/Security-Secret%20Scanning%20%26%20Push%20Protection-success.svg)](#security-boundary)
[![Autonomy: A2 Operational](https://img.shields.io/badge/Autonomy-A2%20Pilot%20Operational-blueviolet.svg)](#current-status)

---

## 🔄 Unified Product Loop

Every product improvement cycle (`EvolutionCycle`) progresses through one durable, evidence-gated lifecycle:

```text
  idea & product definition
→ product workspace & foundation
→ repository inspection & modeling
→ evidence-backed research & discovery
→ opportunity decision & experiment planning
→ sandboxed agent-assisted implementation
→ independent verification & security audit
→ authorized release & deployment
→ outcome measurement & continuous learning
```

---

## 🧩 Architecture & Product Modules

| Module | Description & Role |
| :--- | :--- |
| **Product Workspace** | Web UI (`apps/web`) for product briefs, roadmaps, experiment selection, human approvals, and evidence inspection. |
| **Product Foundation** | Generated Next.js 14 application with Supabase / Better-Auth, Drizzle/PostgreSQL, Tailwind CSS, Sentry, and Vercel/Docker recipes. |
| **Evolution Kernel** | Deterministic lifecycle engine (`packages/evolution-core`), append-only journal (`events.jsonl`), write-locks, and atomic recovery snapshots. |
| **Research Intelligence** | Public repository search, claim extraction, citation integrity verification, deduplication, and contradiction analysis. |
| **Execution & Sandbox** | Capability-negotiated agent execution backends, isolated workspaces, and hostile Docker sandbox containment. |
| **Verification & Evidence** | SHA-256 content-addressed evidence blobs, test runners, static analysis, and independent reviewer verdicts. |
| **Delivery & Operations** | Draft PR generation, deployment adapters, operational health checks, and rollback safety. |
| **Learning & Improvement** | Durable memory records with expiry/scope, skill registry, paired cycle evaluations, and evidence-gated promotion. |
| **Interoperability** | Model Context Protocol (MCP) server, GitHub workflows, OpenTelemetry tracing, and portable trust attestations. |

---

## 🚦 Current Status & Autonomy Levels

**Current Autonomy Stage: A2 Pilot Operational** *(PR #33 merged)*

### Safe Autonomy Scale
- **A0:** Inspect & display repository evidence.
- **A1:** Bounded research, planning, static checks, and record creation.
- **A2 (Active):** Autonomous research & decision-value pilot within approved data scopes.
- **A3 (Next):** Bounded code modification and draft PR creation inside a verified sandbox.
- **A4:** Production deployment, secret access, and infrastructure spending (requires explicit human approval).

### Implemented & Verified Capabilities
- ✅ **Deterministic Evolution Engine:** Append-only transaction journal, atomic snapshots, write-lock serialization, and recovery.
- ✅ **Evidence Registry:** SHA-256 content-addressed storage for evidence blobs, occurrences, and citations.
- ✅ **Research Intelligence:** Public GitHub search provider, atomic claim extraction, and contradiction auditing.
- ✅ **Application Foundation:** Next.js workspace, Supabase / Better-Auth, PostgreSQL schema migrations, and Playwright E2E testing.
- ✅ **Security Hardening:** Secret scanning, push protection, automated security updates, and hostile Docker sandbox proof (`test-sandbox-docker.mjs`).

---

## ⚡ Quickstart

### Prerequisites
- Node.js `≥ 20`
- `pnpm` (`≥ 9`)

### 1. Install & Initialize Engine

```bash
# Clone repository
git clone https://github.com/Thunderkill016/shipkit.git
cd shipkit

# Install dependencies
pnpm install

# Build core evolution engine
pnpm --filter @shipkit/evolution-core build

# Initialize durable local Shipkit store (.shipkit/)
pnpm evolve -- init
```

### 2. Run an Evolution Cycle (CLI)

```bash
# Create a new product cycle
pnpm evolve -- start \
  --id shipkit:cycle-001 \
  --objective "Identify and deliver the highest-value bounded improvement" \
  --autonomy A2 \
  --risk R1

# Inspect repository baseline evidence
pnpm evolve -- inspect shipkit:cycle-001 --project-root .

# Assess readiness and run authorized checks
pnpm evolve -- assess shipkit:cycle-001 --project-root . --check test

# Show cycle state & evidence graph
pnpm evolve -- show shipkit:cycle-001
```

### 3. Run Web Application Workspace

```bash
pnpm ready
pnpm dev
```
Navigate to `http://localhost:3000` to access the web foundation workspace.

---

## 🛡️ Security Boundary & Policy

Shipkit enforces strict security boundaries:

- **Evidence-Gated Approvals:** No state transition occurs without explicit evidence matching requested action, cycle, and risk scope.
- **Secret Redaction & Protection:** Active GitHub Secret Scanning and Push Protection prevent credential leaks.
- **Sandbox Policy:** Code execution is strictly bounded. Untrusted repositories require a dedicated Docker container backend advertising filesystem, network, and process containment.

---

## 📚 Documentation Index

| Document | Purpose |
| :--- | :--- |
| [`IDEA.md`](./IDEA.md) | Single product source of truth and vision |
| [`ARCHITECTURE.md`](./docs/evolution/ARCHITECTURE.md) | Unified product architecture & module contracts |
| [`ROADMAP.md`](./ROADMAP.md) | Milestone roadmap and workstreams |
| [`COMPARATIVE_ANALYSIS.md`](./docs/evolution/COMPARATIVE_ANALYSIS.md) | External system comparison (Temporal, LangGraph, OpenHands, MCP, SLSA) |
| [`PROJECT_MODEL.md`](./docs/ai/PROJECT_MODEL.md) | Machine-readable project model & capabilities |
| [`DATA_GOVERNANCE.md`](./docs/evolution/DATA_GOVERNANCE.md) | Data classification, privacy, and retention rules |

---

## 🤝 License & Contribution

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for details.

Contributions must align with the **One Product Loop** principle: claims must link to verifiable code, tests, evidence, or product-outcome data.
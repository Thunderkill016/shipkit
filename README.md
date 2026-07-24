# ✦ CycleWarden

**Unified AI-Native Product Evolution System & Deterministic Control Engine**

CycleWarden combines a product workspace, Next.js application foundation, deterministic evolution kernel, evidence-backed research intelligence, governed agent delivery, automated verification, and continuous measured learning into one product lifecycle.

> CycleWarden was formerly named Shipkit. Existing state and configuration
> compatibility are documented in
> [docs/RENAMING_FROM_SHIPKIT.md](docs/RENAMING_FROM_SHIPKIT.md).

> **Core Philosophy:** Models and agents are *interchangeable workers*. They do not own CycleWarden's state, permissions, evidence, release authority, or final verdicts. CycleWarden wraps probabilistic AI in a deterministic control harness.

[![Node.js](https://img.shields.io/badge/node-%E2%89%A520-brightgreen.svg)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-9.15.0-blue.svg)](https://pnpm.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Security: Protected](https://img.shields.io/badge/Security-Secret%20Scanning%20%26%20Push%20Protection-success.svg)](#security-boundary)
[![Autonomy](https://img.shields.io/badge/autonomy-A2%20%2B%20trusted--local%20A3-blueviolet.svg)](#current-status)

---

## 🔄 Unified Product Loop

Every product improvement cycle (`EvolutionCycle`) progresses through one durable, evidence-gated lifecycle:

```text
  idea & product definition
→ product workspace & foundation
→ repository inspection & modeling
→ evidence-backed research & discovery
→ opportunity decision & experiment planning
→ governed agent-assisted implementation
→ independent verification & security audit
→ authorized release & deployment
→ outcome measurement & continuous learning
```

---

## 🧩 Architecture & Product Modules

| Module | Description & Role |
| :--- | :--- |
| **Product Workspace** | Web UI (`apps/web`) for bounded A2 research, decision inspection, human approvals, and evidence review. |
| **Product Foundation** | Generated Next.js application with Supabase / Better Auth, Drizzle/PostgreSQL, Tailwind CSS, Sentry, and Vercel/Docker recipes. |
| **Evolution Kernel** | Deterministic lifecycle engine (`packages/evolution-core`), append-only journal (`events.jsonl`), write locks, and recovery snapshots. |
| **Research Intelligence** | Public repository search, claim extraction, citation integrity verification, deduplication, and contradiction analysis. |
| **Execution & Sandbox** | Manifest-bound trusted-local delivery, isolated worktrees, and a separate hostile Docker check baseline. |
| **Verification & Evidence** | SHA-256 content-addressed evidence, patch digests, independent verifier commands, and accepted/rejected/inconclusive verdicts. |
| **Delivery & Operations** | Local verified branches today; explicit draft PR, deployment, rollback, and production operations remain later gates. |
| **Learning & Improvement** | Durable memory records with expiry/scope, skill registry, paired cycle evaluations, and evidence-gated promotion. |
| **Interoperability** | GitHub workflows and portable records today; broader MCP, tracing and trust attestations remain planned. |

---

## 🚦 Current Status & Autonomy Levels

**Current autonomy:** A2 is operational for repository research. A3 is an experimental trusted-local CLI beta for explicitly trusted repositories and commands.

### Safe Autonomy Scale

- **A0:** Inspect and display repository evidence.
- **A1:** Bounded research, planning, static checks, and record creation.
- **A2 (Operational):** Research and decision preparation within approved data scopes.
- **A3 (Trusted-local beta):** Execute one exact `ExecutionHandoff` in an isolated branch/worktree, then require a different verifier before creating a local commit.
- **A4:** Production deployment, secret access, infrastructure spending, and other high-risk operations requiring explicit human approval.

### Implemented and Verified Capabilities

- ✅ **Deterministic Evolution Engine:** Append-only transaction journal, atomic snapshots, write-lock serialization, and recovery.
- ✅ **Evidence Registry:** SHA-256 content-addressed storage for evidence blobs, occurrences, citations, delivery records, and patch snapshots.
- ✅ **Research Intelligence:** Public GitHub search provider, repository research, named-candidate comparison, citation capture, and contradiction auditing.
- ✅ **Bounded A2 Workspace:** Objective → inspect → assess → research → reviewed `ExecutionHandoff` against one server-configured trusted repository.
- ✅ **Governed Local Delivery:** Generic command and optional Codex CLI profile, exact handoff digest binding, clean-base requirement, isolated worktree, changed-file scope checks, separate verifier, and local commit after accepted checks.
- ✅ **Application Foundation:** Next.js workspace, Supabase / Better Auth, PostgreSQL migrations, and Playwright E2E tests.
- ✅ **Security Baselines:** Secret scanning, push protection, bounded execution interfaces, and hostile Docker check proof.

---

## 💡 Product Usability and Readiness

### 🟢 Ready to Use Now

- **Web application foundation (`apps/web`):** A modern product starter with auth, database, security, mail, storage, payment ports, tests, and deployment recipes.
- **A2 workspace and CLI:** Create a cycle, inspect and assess a repository, run bounded research, inspect evidence, and persist a reviewed handoff.
- **Trusted-local delivery CLI:** Run one exact approved implementation command in an isolated worktree and require independent verification before a local commit.

### 🟠 Important Beta Boundaries

- Trusted-local delivery is **not a security sandbox**. The command runs with the current operating-system user's available filesystem, credential, tool, and network privileges.
- The web workspace still ends at `ExecutionHandoff`; execute and verify are CLI-only.
- CycleWarden does not yet push the verified branch or open a draft PR automatically.
- A process crash after the cycle enters `executing` may require manual recovery.
- Untrusted writable agent execution needs a remote or microVM backend with explicit egress, disk, credential, and lifecycle controls.
- Release, deployment, rollback, outcome measurement, and learning are not yet complete.
- The preserved six-session external protocol is deferred at `0/6`; external product value is not claimed.

### Recommended Usage Today

- **Product foundation:** use `apps/web` or `pnpm create -- my-product`.
- **Repository decisions:** use the web workspace or `pnpm evolve` for evidence-backed audits and reviewed handoffs.
- **Trusted local implementation:** use `pnpm deliver` only for a repository and implementation command you trust, then review the resulting branch before any push or PR.

---

## ⚡ Quickstart

### Prerequisites

- Node.js `≥ 20`
- `pnpm` `≥ 9`
- Git for governed delivery

### 1. Install and Initialize

```bash
# Clone repository
git clone https://github.com/Thunderkill016/cyclewarden.git
cd cyclewarden

pnpm install
pnpm --filter @cyclewarden/evolution-core build
pnpm evolve -- init
```

### 2. Run an A2 Evolution Cycle

```bash
pnpm evolve -- start \
  --id cyclewarden:cycle-001 \
  --objective "Identify the highest-value bounded improvement" \
  --autonomy A2 \
  --risk R1

pnpm evolve -- inspect cyclewarden:cycle-001 --project-root .
pnpm evolve -- assess cyclewarden:cycle-001 --project-root .
pnpm evolve -- show cyclewarden:cycle-001
```

The repository-research flow can then produce a reviewed `ExecutionHandoff`. A3 delivery requires a cycle intentionally created or authorized at A3 and a manifest whose `expectedParameterDigest` exactly matches that handoff.

### 3. Run Trusted-Local Delivery

See [`docs/evolution/GOVERNED_DELIVERY.md`](docs/evolution/GOVERNED_DELIVERY.md) for the manifest format and full boundaries.

```bash
pnpm deliver -- execute <cycle-id> \
  --root .cyclewarden \
  --project-root /absolute/path/to/trusted/repository \
  --manifest delivery.json \
  --actor owner-implementation-agent \
  --trusted-repository

pnpm deliver -- verify <cycle-id> \
  --root .cyclewarden \
  --project-root /absolute/path/to/trusted/repository \
  --actor independent-verifier
```

An accepted verdict creates a commit on the isolated local branch. It does not push, open a PR, merge, or deploy.

### 4. Run the Web Workspace

```bash
pnpm ready
pnpm dev
```

Open `http://localhost:3000/app/evolution`.

---

## 🛡️ Security Boundary

CycleWarden enforces deterministic authorization and evidence boundaries, but each execution backend has a different trust model:

- **Evidence-gated transitions:** lifecycle state changes require the correct stage, artifacts, autonomy, risk, and approval scope.
- **Secret protection:** GitHub Secret Scanning and Push Protection reduce accidental committed credential exposure.
- **Docker hostile-check baseline:** immutable image, denied network, read-only container root, reduced environment, resource bounds, and cleanup checks.
- **Trusted-local delivery:** shell-free orchestration, isolated worktree, changed-file scope checks, patch digest, and separate verifier. This does not isolate the command from the current user account or prevent arbitrary side effects outside the worktree.
- **No implicit release authority:** CycleWarden does not automatically merge or deploy in the current beta.

---

## 📚 Documentation Index

| Document | Purpose |
| :--- | :--- |
| [`IDEA.md`](./IDEA.md) | Single product source of truth and vision |
| [`ROADMAP.md`](./ROADMAP.md) | Milestone roadmap and workstreams |
| [`ARCHITECTURE.md`](./docs/evolution/ARCHITECTURE.md) | Unified product architecture and module contracts |
| [`GOVERNED_DELIVERY.md`](./docs/evolution/GOVERNED_DELIVERY.md) | Trusted-local A3 delivery manifest, CLI, verifier, and boundaries |
| [`PROJECT_MODEL.md`](./docs/ai/PROJECT_MODEL.md) | Verified project model, capabilities, gaps, and priority order |
| [`CAPABILITIES.json`](./docs/CAPABILITIES.json) | Machine-readable capability truth and limitations |
| [`DATA_GOVERNANCE.md`](./docs/evolution/DATA_GOVERNANCE.md) | Data classification, privacy, and retention rules |

---

## 🤝 License and Contribution

Distributed under the **MIT License**. See [`LICENSE`](LICENSE).

Contributions must align with the One Product Loop: claims must link to verifiable code, tests, evidence, or product-outcome data. Models and agents may propose and implement work, but they do not own final authorization, verification, merge, deployment, or product-value claims.

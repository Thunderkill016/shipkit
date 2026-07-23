# ✦ Shipkit

**One AI-native system for researching, building, verifying, shipping and continuously improving real products.**

Shipkit combines a product workspace, application foundation, deterministic evolution engine, modern research system, coding-agent execution, sandboxing, evidence, verification, deployment and measured learning into one governed lifecycle.

Models and agents are interchangeable workers. They do not own Shipkit's state, permissions, evidence, deployment authority or final verdict.

MIT · Node ≥ 20 · pnpm · local-first foundation

## Unified product loop

```text
idea and product definition
→ product workspace and foundation
→ inspect and model
→ research and discover
→ decide and plan
→ implement through governed agents
→ verify independently
→ release and deploy
→ measure product outcomes
→ learn and improve
```

All modules share one durable cycle, policy model and evidence chain.

## Product modules

| Module | Role |
| --- | --- |
| Product Workspace | Product brief, roadmap, experiments, approvals and human review |
| Product Foundation | Generated Next.js application, auth, data, security, integrations and deployment baseline |
| Evolution Kernel | Durable state, transitions, risk, approvals, recovery and rollback |
| Research Intelligence | Repository, web, paper, competitor and user research; claims and contradictions |
| Execution & Sandbox | Command and coding-agent adapters with capability-negotiated containment |
| Verification & Evidence | Tests, CI, reviews, provenance, attestations and verdicts |
| Delivery & Operations | Draft PRs, release, deployment, rollback and environment management |
| Learning & Improvement | Memory, skills, benchmarks, paired evaluation, promotion and retirement |
| Interoperability | GitHub, MCP, A2A, telemetry and portable trust |

These are implementation boundaries inside one product—not separate Shipkit products.

## Current status

**Experimental integrated foundation — draft PR #10, unmerged and undeployed.**

Implemented now:

- deterministic evidence-gated evolution cycles;
- A0–A4 autonomy and R0–R4 risk policy;
- exact cycle/action/scope approvals;
- append-only journal, atomic snapshots, recovery and serialized writers;
- content-addressed evidence blobs and contextual evidence occurrences;
- bounded repository inspection and trust-boundary discovery;
- temporary-workspace checks with timeout and output limits;
- separate research, execution and verification readiness;
- existing Next.js product foundation with auth, PostgreSQL, security, integrations and deployment recipes;
- project generator and AI engineering workflow;
- CI dogfood on Shipkit and an unrelated repository.

Not integrated yet:

- complete persistence crash/migration proof;
- real containment for untrusted execution;
- the research-and-decision workflow through the product interface;
- coding-agent adapters and isolated branch delivery;
- independent product-outcome evaluation;
- authorized release/deployment through the cycle;
- measured learning and meta-improvement;
- unified end-user workspace across the whole lifecycle.

## Next integrated milestone

The next milestone completes the research and decision portion of the same product loop:

```text
inspect → assess → decision brief → bounded research
→ atomic claims → contradiction review → 3 opportunities
→ transparent ranking → smallest reversible experiment
→ persisted handoff to execution
```

It ends before code mutation only because the sandbox boundary is not yet complete. Execution, deployment, measurement and learning remain required product modules.

## Try the current foundation

```bash
git clone https://github.com/Thunderkill016/shipkit.git
cd shipkit
pnpm install

pnpm evolve -- init
pnpm evolve -- start \
  --id shipkit:cycle-001 \
  --objective "Identify and deliver the highest-value bounded improvement" \
  --autonomy A2 \
  --risk R1

pnpm evolve -- inspect shipkit:cycle-001 --project-root .
pnpm evolve -- assess shipkit:cycle-001 --project-root . --check test
pnpm evolve -- show shipkit:cycle-001
```

Current kernel commands:

| Command | Purpose |
| --- | --- |
| `pnpm evolve -- init` | Initialize local Shipkit state |
| `pnpm evolve -- start` | Create a durable product evolution cycle |
| `pnpm evolve -- inspect` | Register repository baseline evidence |
| `pnpm evolve -- assess` | Run authorized checks and create a readiness model |
| `pnpm evolve -- status` | List stored cycles |
| `pnpm evolve -- show` / `resume` | Load and recover a cycle |
| `pnpm evolve -- advance` | Apply one legal evidence-backed transition |

## Product workspace and foundation

`apps/web` and the shared packages are part of Shipkit's integrated product surface. They currently provide:

- localized landing, login and protected workspace;
- Supabase or Better Auth adapters;
- portable PostgreSQL and user-scoped data;
- security, mail, storage and payment ports;
- Vercel and Docker delivery recipes;
- Vitest and Playwright verification;
- a generator for new product workspaces.

This foundation will evolve into the human-facing surface for product definition, research review, approvals, execution progress, verification, release and learning—not remain only a test project.

Run the current web foundation:

```bash
pnpm ready
pnpm dev
```

## Security boundary

The current package-script runner uses a temporary workspace but is **not a security sandbox**:

- network isolation is not enforced;
- filesystem writes outside the workspace are not contained;
- process containment is incomplete;
- host `node_modules` may be linked.

Untrusted execution requires a dedicated sandbox backend. Shipkit must fail closed when an operation requests capabilities that the selected backend cannot provide.

## Repository structure

```text
Shipkit
├── apps/web                  integrated product workspace and application foundation
├── packages/evolution-core  deterministic lifecycle, policy, evidence and CLI
├── packages/*               auth, data, security, mail, storage and payment modules
├── docs/evolution           architecture, research and integrated roadmap
├── scripts                  generator, setup, dogfood and verification
└── .shipkit at runtime      durable cycles and evidence
```

## Core principles

1. One product and one lifecycle across every module.
2. Deterministic control around nondeterministic agents.
3. Research determines what should be built.
4. Exact authorization and evidence precede autonomy.
5. Temporary workspaces are not security sandboxes.
6. Verification is independent from implementation.
7. Passing technical checks does not prove product value.
8. Learning is promoted only after measured later-cycle benefit.
9. Sequencing implementation must never erase the unified destination.

## Documentation

| Document | Purpose |
| --- | --- |
| [`IDEA.md`](./IDEA.md) | Unified product source of truth |
| [`ROADMAP.md`](./ROADMAP.md) | Integrated milestones and workstreams |
| [`docs/evolution/ARCHITECTURE.md`](./docs/evolution/ARCHITECTURE.md) | One-product module and control architecture |
| [`docs/evolution/ROADMAP.md`](./docs/evolution/ROADMAP.md) | Detailed implementation roadmap |
| [`docs/evolution/RESEARCH_CAPABILITY.md`](./docs/evolution/RESEARCH_CAPABILITY.md) | Modern research operating model |
| [`docs/evolution/COMPARATIVE_ANALYSIS.md`](./docs/evolution/COMPARATIVE_ANALYSIS.md) | External-system comparison and decisions |
| [`docs/evolution/DATA_GOVERNANCE.md`](./docs/evolution/DATA_GOVERNANCE.md) | Data classification, privacy and retention gates |
| [`docs/CAPABILITIES.json`](./docs/CAPABILITIES.json) | Machine-readable capability evidence |

## Contribution rule

A module is not complete because it works alone. Material work must show how it connects to the shared Shipkit cycle, policy, evidence and user workflow. Claims must link to code, tests, evidence or product-outcome data.
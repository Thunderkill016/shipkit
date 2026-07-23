# ✦ Shipkit Evolution Engine

**Deterministic, evidence-backed project evolution across human and AI agents.**

Shipkit attaches to a repository, preserves a durable evolution cycle, inspects the project, runs bounded checks, and is being developed to turn reproducible research into governed product decisions and reversible experiments.

Models and coding agents are interchangeable execution inputs. They do not own Shipkit's state, permissions, evidence, verification or final verdict.

MIT · Node ≥ 20 · pnpm · local-first

## Current status

**Experimental foundation — draft PR #10, unmerged and undeployed.**

Implemented today:

- deterministic cycle state machine;
- A0–A4 autonomy and R0–R4 risk policy;
- exact cycle/scope approvals for protected actions;
- append-only journal, atomic snapshots, recovery and serialized writers;
- content-addressed evidence blobs with distinct evidence occurrences;
- bounded repository inspection and structural trust-boundary discovery;
- temporary-workspace checks with timeout, output bounds and reduced environment;
- evidence-backed repository scorecard;
- CLI dogfood on Shipkit and a pinned unrelated repository.

Not implemented yet:

- complete sandbox containment for untrusted repository scripts;
- the A2 Research Audit vertical slice;
- agent execution adapters;
- MCP, attestations and optional telemetry;
- product-outcome measurement and controlled learning.

## First usable product target

The first MVP is an **A2 Research Audit** for a solo developer or open-source maintainer:

```text
inspect → assess → decision brief → bounded research
→ atomic claims → contradiction review → 3 opportunities
→ ranking → smallest reversible experiment
```

The MVP is read-only with respect to product code. It does not merge, deploy, read secrets, spend money or mutate production.

Product source of truth: [`IDEA.md`](./IDEA.md)  
Detailed roadmap: [`docs/evolution/ROADMAP.md`](./docs/evolution/ROADMAP.md)  
Research capability: [`docs/evolution/RESEARCH_CAPABILITY.md`](./docs/evolution/RESEARCH_CAPABILITY.md)  
Comparative analysis: [`docs/evolution/COMPARATIVE_ANALYSIS.md`](./docs/evolution/COMPARATIVE_ANALYSIS.md)

## Try the current Evolution Engine foundation

```bash
git clone https://github.com/Thunderkill016/shipkit.git
cd shipkit
pnpm install

pnpm evolve -- init
pnpm evolve -- start \
  --id shipkit:cycle-001 \
  --objective "Identify the highest-value bounded improvement" \
  --autonomy A2 \
  --risk R1

pnpm evolve -- inspect shipkit:cycle-001 --project-root .
pnpm evolve -- assess shipkit:cycle-001 --project-root . --check test
pnpm evolve -- show shipkit:cycle-001
```

Current commands:

| Command | Purpose |
| --- | --- |
| `pnpm evolve -- init` | Initialize `.shipkit` local state |
| `pnpm evolve -- start` | Create a durable cycle |
| `pnpm evolve -- inspect` | Register repository baseline evidence |
| `pnpm evolve -- assess` | Run authorized checks and create a scorecard |
| `pnpm evolve -- status` | List stored cycles |
| `pnpm evolve -- show` / `resume` | Load and recover a cycle |
| `pnpm evolve -- advance` | Apply one legal evidence-backed transition |

### Security boundary

The current check runner is bounded but is **not a security sandbox**:

- network isolation is not enforced;
- filesystem writes outside the temporary workspace are not contained;
- existing `node_modules` may be linked from the host project.

Run untrusted repositories only inside a dedicated external sandbox. Shipkit must fail closed when a future operation requests isolation that the selected backend cannot provide.

## Repository structure

```text
Shipkit
├── packages/evolution-core   primary product kernel and CLI
├── docs/evolution            product, architecture, research and roadmap
├── apps/web                  Starter Kit dogfood/reference application
├── packages/*                reusable auth, DB, security and delivery packages
├── templates/STARTER_IDEA.md product template for generated starter projects
└── scripts                   dogfood, generator and verification scripts
```

## Starter Kit dogfood project

The existing Next.js application remains maintained as a realistic project for Evolution Engine inspection and verification. It provides:

- localized landing and login;
- Supabase or Better Auth adapters;
- portable PostgreSQL setup;
- protected app shell, profile and notes;
- security, mail, storage and optional Stripe adapters;
- Vercel and Docker recipes;
- Vitest and Playwright coverage.

Run it locally:

```bash
# UI/demo path
pnpm ready
pnpm dev

# Portable PostgreSQL path
pnpm ready -- --preset=portable-pg
pnpm db:up
pnpm db:migrate
pnpm dev
```

Open `http://localhost:3000`.

The Starter Kit is no longer the primary Shipkit roadmap. Generated starter products should copy [`templates/STARTER_IDEA.md`](./templates/STARTER_IDEA.md) and replace it with their own product definition.

## Core principles

1. Deterministic control around nondeterministic agents.
2. Evidence and exact authorization before autonomy.
3. One valuable vertical slice before broad infrastructure.
4. Temporary workspaces are not security sandboxes.
5. Passing technical checks does not prove user value.
6. Contradictory evidence and failed candidates remain inspectable.
7. Simpler baselines must be beaten before adding agent complexity.
8. No positive-recursion claim without controlled later-cycle evidence.

## Documentation

| Document | Purpose |
| --- | --- |
| [`IDEA.md`](./IDEA.md) | Primary product source of truth |
| [`ROADMAP.md`](./ROADMAP.md) | Repository-level gates and priorities |
| [`docs/evolution/PRODUCT_THESIS.md`](./docs/evolution/PRODUCT_THESIS.md) | Product thesis and boundaries |
| [`docs/evolution/ARCHITECTURE.md`](./docs/evolution/ARCHITECTURE.md) | Kernel and plane architecture |
| [`docs/evolution/ROADMAP.md`](./docs/evolution/ROADMAP.md) | Detailed build roadmap |
| [`docs/evolution/RESEARCH_CAPABILITY.md`](./docs/evolution/RESEARCH_CAPABILITY.md) | Modern research operating model |
| [`docs/evolution/COMPARATIVE_ANALYSIS.md`](./docs/evolution/COMPARATIVE_ANALYSIS.md) | External-system comparison and decisions |
| [`docs/CAPABILITIES.json`](./docs/CAPABILITIES.json) | Machine-readable implementation evidence |
| [`docs/QUICKSTART.md`](./docs/QUICKSTART.md) | Starter Kit local setup |
| [`docs/DEPLOY.md`](./docs/DEPLOY.md) | Starter Kit deployment recipes |

## Contribution rule

A change is not complete because an agent says it is complete. Material claims must link to code, tests, evidence or user outcome data. The PR remains draft until independent persistence, security/policy and product/API reviews are complete.

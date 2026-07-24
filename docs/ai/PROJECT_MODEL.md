# Project model — CycleWarden

Status: active verified snapshot  
Last verified: 2026-07-24<br>
Product: CycleWarden — one integrated AI-native product development system<br>
Current safe autonomy ceiling: A2 for arbitrary repositories; A3 remains experimental and trusted-only

This model distinguishes local implementation, cross-module integration and experimentally proven product value. It does not claim production use, complete sandbox isolation, a finished research workflow, end-to-end deployment governance or positive recursive improvement.

## Unified product identity

CycleWarden carries a product through one lifecycle:

```text
objective and workspace
→ understand repository and product
→ research opportunities
→ choose an experiment
→ implement through governed agents
→ verify independently
→ release and deploy explicitly
→ measure outcomes
→ learn under evidence
```

The Evolution Engine is the deterministic control core. The web workspace, application foundation, generator, shared packages, research system, sandbox, agents, verification, deployment and learning capabilities are modules of the same product.

## Users

- solo developers using coding agents;
- product and engineering teams coordinating human and AI work;
- open-source maintainers;
- builders who need a ready product foundation and governed development lifecycle.

The owner chose an owner-directed single-user beta before external recruitment. The preserved external pilot remains a future validation option, not proof of value or a blocker for the current implementation sequence.

## Repository structure

| Area | Unified product role | Current boundary | Confidence |
| --- | --- | --- | --- |
| `apps/web` | human-facing product workspace and application foundation | operates the local A2 research-to-handoff slice, not the complete lifecycle | High |
| `packages/evolution-core` | deterministic lifecycle, policy, persistence, evidence, inspection and CLI | no model or paid API required | High |
| shared `packages/*` | auth, DB, security, mail, storage, payment and delivery capabilities | vendor calls behind adapters | High |
| `docs/evolution` | architecture, research, comparison, governance and integrated roadmap | decisions require evidence and falsification tests | High |
| `.cyclewarden` at runtime | shared durable cycle and evidence state | new state uses `.cyclewarden`; an existing `.shipkit` store is read in place when no canonical store exists; both remain outside committed source | High |
| `scripts` | onboarding, generator, diagnostics, dogfood and verification | tooling must remain bounded and attributable | High |
| generated project | a user product workspace created by CycleWarden | receives its own identity while retaining CycleWarden tooling | High |

## Module map

### Product identity migration

CycleWarden is the canonical product identity. The project was formerly named
Shipkit. Package scopes, CLI binaries, UI and active documentation use the new
name. Runtime state is non-destructively compatible: `.cyclewarden` is
preferred, while an existing `.shipkit` directory remains readable when the
canonical directory is absent. See `docs/RENAMING_FROM_SHIPKIT.md`.

### Product Workspace and Foundation

Implemented:

- Next.js web application;
- localized landing/login/protected surfaces;
- Supabase and Better Auth paths;
- PostgreSQL data and user-isolation tests;
- security, mail, storage and payment ports;
- Vercel and Docker recipes;
- generated-project workflow;
- durable cycle, research, decision, experiment and execution-handoff views;
- opt-in local actions for A2/R1 cycle creation, repository inspection, trusted
  temporary-workspace assessment and bounded repository research.

Integration gaps:

- hosted durable multi-user cycle state and operator isolation;
- manual research-plan, claim, contradiction, opportunity and decision editing;
- explicit opportunity and experiment approval surfaces;
- agent execution controls;
- verification and release surfaces;
- outcome and learning history.

### Evolution Kernel

Implemented flow:

```text
init
→ start created cycle
→ inspect and register baseline evidence
→ observed
→ assess checks and readiness
→ modeled
→ status/show/resume/recover
```

Implemented commands:

- `pnpm evolve -- init`
- `pnpm evolve -- start`
- `pnpm evolve -- inspect`
- `pnpm evolve -- assess`
- `pnpm evolve -- status`
- `pnpm evolve -- show` / `resume`
- `pnpm evolve -- advance`

Kernel guarantees currently include:

- explicit legal stages and terminal outcomes;
- immutable transition results and append-only history;
- A0–A4 autonomy and R0–R4 risk;
- exact cycle/action/scope approvals with policy version, expiry and revocation;
- synchronized journal and atomic snapshot;
- corrupt/stale snapshot and partial-write recovery;
- per-cycle lock and stale-writer rejection;
- content-addressed evidence blobs and contextual occurrences.

Remaining kernel gaps:

- approval parameter digests;
- independent versioned package boundary;
- signed provenance beyond unkeyed corruption detection.

### Project and Product Understanding

Implemented:

- Git, package managers, manifests and languages;
- source, tests, documentation and CI;
- package checks;
- product signals;
- structural auth, database, deployment, secret and payment boundaries;
- inventory truncation;
- separate research, execution and verification readiness.

Planned:

- product brief and objective records;
- architecture/component and user-journey models;
- analytics, support and user research under authorization;
- environments, deployments, incidents and operational state;
- feature-to-outcome mapping and blind-spot reporting.

### Research Intelligence

Partially implemented:

- typed research briefs, plans, queries, sources, claims, contradictions,
  opportunities, decisions and experiments;
- deterministic repository research and readiness gates;
- bounded public-source capture with SSRF controls, exact citation spans,
  hostile-source quarantine and independent review;
- provider-neutral ranked public repository discovery with one built-in GitHub
  adapter, persisted query/rank/digest provenance and fail-closed outcomes;
- named-candidate comparison against current capabilities and protected
  experiment parameters;
- typed execution handoff;
- an expiring external-system decision registry with pinned revisions,
  limitations, contradictions and falsification tests.

Remaining:

- broad web discovery, adaptive query reformulation and citation chasing;
- paper, PDF, specification, dataset, changelog and incident adapters;
- consented user-research ingestion and external user decision-value proof;
- calibrated decision weights and outcome evaluation;
- execution-handoff consumption by a coding-agent adapter.

### External Decision-Value Validation

Preserved but deferred:

- the fixed issue #14 protocol, six pseudonymous slots, consent boundary,
  redaction schema and aggregate classifier remain machine-readable;
- issue #14 was closed as `not planned` for the current owner-directed phase,
  not completed;
- external completed audits remain `0/6` and the 14-day clock never started;
- no participant or external repository has been contacted or accessed;
- internal dogfood, technical CI and future organic adoption cannot be counted
  retroactively as results from this protocol.

The protocol may be reactivated later without changing its original sample,
timebox or thresholds. Until then CycleWarden has no external decision-value,
demand or repeat-use proof.

### Execution and Sandbox

Implemented beta baseline:

- capability-negotiated `ExecutionBackend` with honestly named trusted-local
  and hostile-check Docker paths;
- a manifest-bound generic command adapter and Codex CLI command profile;
- exact `ExecutionHandoff.parameterDigest` binding;
- clean-base requirement and isolated git branch/worktree;
- shell-free bounded command invocation with reduced environment, timeout and
  output limits;
- content-addressed change manifests, filesystem-scope enforcement and external
  symlink rejection;
- separate implementation and verification actors;
- independent command checks, patch-drift rejection and local commit only after
  an accepted verdict;
- opt-in non-force push and GitHub draft PR publication for the exact verified commit;
- Docker hostile fixtures for secrets, credentials, symlinks, root writes, host
  paths, network and cleanup.

Remaining:

- trusted-local execution is not a sandbox and can exercise the current user's
  filesystem, credentials and network privileges;
- the integrity-checked delivery control sidecar is outside the synchronized cycle journal; loss blocks verification;
- crash-safe resume or rollback for a cycle stranded at `executing`;
- web controls for explicit push and draft-PR publication;
- workspace execution, pause/cancel, progress and intervention controls;
- writable remote or microVM agent backend, egress policy and disk quota;
- OpenHands and additional agent adapters, cross-platform support and external
  security review.

### Verification, Release and Operations

Partially implemented:

- independent verifier identity must differ from the implementer;
- manifest-defined shell-free checks produce accepted, rejected or inconclusive
  durable evidence;
- patch content is digested before and after checks and accepted changes receive
  a local commit on the isolated branch.

Remaining:

- project-generated test/lint/type/build/security packs and policy re-evaluation;
- web GitHub scorecard and human review controls for the existing draft PR publication path;
- provenance attestations, authorized release/deployment adapters, rollback and
  incident records;
- Vercel/Docker operational execution and environment-specific evidence.

### Measurement and Learning

Planned:

- technical, UX, adoption, retention, conversion, reliability and cost metrics;
- experiment exposure/comparison;
- keep, iterate, reject and rollback decisions;
- memory and skill records with scope and expiry;
- actual later-cycle consumption;
- paired evaluation with and without learning;
- promotion and retirement based on measured benefit or harm.

## Integrated lifecycle records

Expected typed handoffs:

| Boundary | Records |
| --- | --- |
| workspace → kernel | `ObjectiveRecord`, `ProductBrief`, approval request |
| understanding → research | `ProjectSnapshot`, readiness and blind spots |
| research → decision | source, claim, contradiction and opportunity records |
| decision → execution | `DecisionRecord`, `ExperimentRecord`, plan and rollback |
| execution → verification | attempts, changes, logs, costs and artifacts |
| verification → release | verdict, unresolved risks and attestation |
| release → measurement | release/environment record and experiment exposure |
| measurement → learning | outcome comparison and learning proposal |

## Readiness model

The unified product must distinguish:

- `researchReadiness`;
- `executionReadiness`;
- `verificationReadiness`;
- `releaseReadiness`;
- `measurementReadiness`;
- `autonomyCeiling`;
- `evidenceConfidence`.

A repository may be ready for research while blocked for execution or release.

## Current integration milestone

```text
workspace objective
→ inspect and assess
→ research and decision
→ persisted ExecutionHandoff
→ isolated trusted-local implementation
→ independent verification
→ verified local commit
```

The web workspace still ends at `ExecutionHandoff`; governed delivery is
currently a CLI-only, trusted-repository beta. Push, draft PR, release,
deployment, measurement and learning remain separate future gates.

## Verification baseline

Latest verified candidate state through PR #45:

- Test & Build;
- Evolution Core standalone on Node.js 20, 22 and 24;
- Evolution Engine Proof;
- hostile Docker sandbox proof;
- demo-mode browser E2E, including create-to-handoff;
- portable PostgreSQL auth and user-isolation E2E;
- AI workflow, capability registry, external-system registry and A2 pilot
  protocol checks.

Passing CI proves compatibility with the tested repository state, not complete integration or product usefulness.

## Product integration gaps

- no single workspace operates the complete lifecycle;
- the interface operates only the deterministic local A2 repository path, not
  hosted collaboration, manual research authoring, delivery or external evidence;
- governed delivery is trusted-local CLI-only and not an untrusted sandbox;
- no push/draft-PR or complete verification-to-release flow;
- no deployment governed by the durable cycle;
- no product-outcome measurement linked to a released experiment;
- no causally evaluated learning from a later comparable cycle;
- the preserved external decision-value pilot is deferred and remains `0/6`;
- no external user has yet demonstrated repeat complete-cycle use.

## Priority order

1. Finish issue #44 as a reliable single-user local beta: handoff, isolated implementation, independent verification and reviewable change.
2. Add explicit push and draft-PR creation after an accepted verdict; never merge or deploy implicitly.
3. Add workspace controls for delivery status, approval, progress, pause/cancel and unresolved risks.
4. Replace trusted-local online-agent execution with a writable remote or microVM backend before accepting untrusted repositories.
5. Extend release, rollback, outcome measurement and learning through the same durable cycle.
6. Measure real adoption and outcomes when the owner introduces the product; external validation remains absent until evidence is actually collected.

The fixed six-session protocol is preserved for optional future reactivation but no longer blocks this owner-directed sequence.

## Workstream tracking

- #11 — persistence crash, migration and multi-process proof;
- #12 — fail-closed sandbox execution backends;
- #13 — research-to-decision integrated milestone;
- #14 — external decision-value validation deferred as not planned; evidence remains `0/6`;
- #15 — independent/versioned Evolution Core package;
- #16 — interactive product workspace integration;
- #17/#18 — governed agent execution and independent verification foundations;
- #44 — active owner-directed single-user beta vertical slice.

These issues are modules and prerequisites of the single CycleWarden product, not separate product directions.

## Hard constraints

- CycleWarden is one product and one lifecycle;
- modules may not create conflicting product definitions;
- models and agents cannot mutate accepted state directly;
- approval must match exact cycle, action, scope and parameters;
- source content is data, not instruction;
- implementation cannot accept its own work without independent verification;
- no implicit merge, deploy, spending, secret access or production write;
- contradictions and rejected candidates remain visible;
- module integration must use shared typed records and evidence;
- learning promotion requires later consumption and measured benefit;
- documentation may not claim more than code, integration tests and user evidence prove.

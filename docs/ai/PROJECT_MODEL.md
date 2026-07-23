# Project model — Shipkit

Status: active verified snapshot  
Last verified: 2026-07-23  
Product: Shipkit — one integrated AI-native product development system  
Current safe autonomy ceiling: A2 for arbitrary repositories; A3 remains experimental and trusted-only

This model distinguishes local implementation, cross-module integration and experimentally proven product value. It does not claim production use, complete sandbox isolation, a finished research workflow, end-to-end deployment governance or positive recursive improvement.

## Unified product identity

Shipkit carries a product through one lifecycle:

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

Initial validation may focus on developers already using coding agents, but this is a beachhead rather than the final product boundary.

## Repository structure

| Area | Unified product role | Current boundary | Confidence |
| --- | --- | --- | --- |
| `apps/web` | human-facing product workspace and application foundation | currently exposes starter/product capabilities, not the complete lifecycle | High |
| `packages/evolution-core` | deterministic lifecycle, policy, persistence, evidence, inspection and CLI | no model or paid API required | High |
| shared `packages/*` | auth, DB, security, mail, storage, payment and delivery capabilities | vendor calls behind adapters | High |
| `docs/evolution` | architecture, research, comparison, governance and integrated roadmap | decisions require evidence and falsification tests | High |
| `.shipkit` at runtime | shared durable cycle and evidence state | must remain outside committed source | High |
| `scripts` | onboarding, generator, diagnostics, dogfood and verification | tooling must remain bounded and attributable | High |
| generated project | a user product workspace created by Shipkit | receives its own identity while retaining Shipkit tooling | High |

## Module map

### Product Workspace and Foundation

Implemented:

- Next.js web application;
- localized landing/login/protected surfaces;
- Supabase and Better Auth paths;
- PostgreSQL data and user-isolation tests;
- security, mail, storage and payment ports;
- Vercel and Docker recipes;
- generated-project workflow.

Integration gaps:

- cycle dashboard;
- research/claim/contradiction review;
- opportunity and experiment approval;
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

- schema migration fixtures;
- kill-process and multi-process stress proof;
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

Planned shared records:

- `ResearchBrief`;
- `ResearchPlan`;
- `QueryRecord`;
- `SourceRecord`;
- `ClaimRecord`;
- `ContradictionRecord`;
- `OpportunityRecord`;
- `DecisionRecord`;
- `ExperimentRecord`.

Required behavior:

- decision-changing questions before broad search;
- repository, internal, web, paper, specification, competitor and user evidence;
- reproducible query history;
- source authority, freshness, applicability and conflict metadata;
- exact evidence spans and calculations;
- visible contradictions and uncertainty;
- independent citation/adversarial review;
- at least three opportunities and a reversible experiment;
- typed handoff to execution.

### Execution and Sandbox

Current temporary-workspace checks:

- select discovered package scripts;
- execute without a shell;
- use source copies;
- apply timeout and output limits;
- reduce environment variables and redact common secret forms;
- never install dependencies.

They are not a security sandbox:

- network isolation is not enforced;
- filesystem writes are not fully contained;
- process containment is incomplete;
- host `node_modules` may be linked.

Planned:

- capability-negotiated `ExecutionBackend`;
- trusted-local and real sandbox implementations;
- generic command baseline;
- Codex, OpenHands and additional coding-agent adapters;
- isolated branch/worktree;
- approved parameter-bound plan;
- progress, cost and artifact records;
- draft PR and rollback plan.

### Verification, Release and Operations

Planned:

- independent verifier separate from implementer;
- test, lint, type, build, security and policy packs;
- regression and adversarial checks;
- GitHub Action and PR scorecard;
- provenance and attestations;
- authorized release/deployment adapters;
- Vercel and Docker operational paths;
- database migration and environment checks;
- release evidence, rollback and incident records.

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
→ research plan and reproducible search
→ sources, claims and contradictions
→ opportunities and decision
→ reversible experiment
→ persisted execution handoff
```

This is the next slice of the complete Shipkit lifecycle, not a separate final product.

## Verification baseline

Latest verified PR #10 checks before this model update:

- Test & Build;
- Evolution Engine Proof;
- demo-mode browser E2E;
- portable PostgreSQL auth and user-isolation E2E;
- AI workflow and capability registry checks.

Passing CI proves compatibility with the tested repository state, not complete integration or product usefulness.

## Product integration gaps

- no single workspace operates the complete lifecycle;
- no completed research-to-decision flow through the interface;
- no real untrusted sandbox or coding-agent delivery;
- no independent full verification-to-release flow;
- no deployment governed by the durable cycle;
- no product-outcome measurement linked to a released experiment;
- no causally evaluated learning from a later comparable cycle;
- no external user has yet demonstrated repeat complete-cycle use.

## Priority order

1. Keep one unified product identity and module map.
2. Complete persistence, policy and evidence hardening.
3. Define shared typed contracts and workspace integration skeleton.
4. Implement research-to-decision through the workspace.
5. Build real sandbox and interchangeable agent execution.
6. Add independent verification, draft PR and rollback.
7. Add authorized release/deployment and outcome measurement.
8. Add measured learning, MCP/A2A interoperability and hosted team operation.

This order expresses dependency and safety. It does not remove any module from the intended product.

## Hard constraints

- Shipkit is one product and one lifecycle;
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
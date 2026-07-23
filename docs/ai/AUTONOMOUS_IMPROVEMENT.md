# Autonomous project improvement

This protocol turns “understand this project and improve it” into a controlled,
evidence-driven loop.

The agent may inspect broadly, synthesize a repository model, diagnose problems,
research unknowns, propose priorities, and implement a bounded improvement. It
must not confuse autonomy with unlimited permission.

## Core loop

```text
Establish goal and permission
        ↓
Build or refresh the repository model
        ↓
Validate the current state
        ↓
Diagnose problems and opportunities
        ↓
Rank evidence-backed candidates
        ↓
Select one bounded candidate
        ↓
Research decision-critical unknowns
        ↓
Write acceptance criteria and plan
        ↓
Implement one slice
        ↓
Verify behavior and review independently
        ↓
Measure outcome and update repository memory
```

The loop can continue only when the previous step produced trustworthy evidence.

## What “understand the whole project” means

It does **not** mean reading every file into one context window. Large codebases
contain generated files, repetitive code, stale experiments, vendored code, and
outputs that reduce reasoning quality.

Whole-project understanding means building a compact, traceable model of:

- product mission, target users, and critical outcomes;
- primary user journeys and runtime entry points;
- packages, services, modules, ownership, and dependency direction;
- data stores, schemas, migrations, queues, caches, and external integrations;
- authentication, authorization, secrets, and trust boundaries;
- build, test, lint, CI, release, deployment, and rollback paths;
- observability, incidents, analytics, support, and operational signals;
- known technical debt, architectural decisions, active plans, and constraints;
- important unknowns, confidence, and freshness of each conclusion.

Use `docs/ai/templates/PROJECT_MODEL.md`. Every conclusion must point to code,
configuration, command output, issue, metric, or another inspectable source.

## Autonomy levels

Choose and report one level before acting.

| Level | Agent may do | Human gate |
|---|---|---|
| A0 Observe | Read, run non-destructive checks, produce a model | None |
| A1 Diagnose | Create health report and ranked backlog | Human chooses candidate |
| A2 Research and plan | Browse, compare options, write research and implementation plan | Human approves plan when risk is material |
| A3 Bounded delivery | Implement a small low/medium-risk issue, test, review, open draft PR | Human reviews PR |
| A4 Sensitive delivery | Auth, billing, production, destructive data, major migration, broad architecture, legal/privacy-sensitive work | Explicit approval before implementation and before release |

Unless the human grants a different level, default to A2 for open-ended
“improve the project” requests. Do not silently promote yourself to A3 or A4.

## Phase 1 — establish the objective

Before scanning the repository, record:

- the product or engineering outcome to improve;
- the autonomy level;
- permitted repositories, environments, tools, and external sources;
- time, cost, token, API, or infrastructure budget;
- protected areas and actions requiring approval;
- the completion condition for this cycle.

An agent without an objective optimizes whatever is easiest to measure. A clean
codebase is not automatically a better product.

## Phase 2 — build the repository model

### 2.1 Read durable context

Start with:

- `IDEA.md`;
- `AGENTS.md` and `AI_WORKFLOW.md`;
- `ARCHITECTURE.md`;
- active plans, ADRs, research, and improvement records;
- README, package manifests, lockfiles, environment examples, and CI workflows;
- recent issues, pull requests, commits, and releases when available.

Treat documentation as a claim until code and runtime evidence support it.

### 2.2 Inventory structure

Identify:

- languages and frameworks;
- applications, packages, services, libraries, and generated directories;
- entry points and public interfaces;
- build and deployment units;
- external dependencies and their purpose;
- high-change and high-risk areas.

Exclude build output, vendor folders, snapshots, generated clients, and large
fixtures from broad reading unless they become relevant.

### 2.3 Trace critical journeys

Choose the product’s most important journeys and trace them end to end:

```text
User action → UI → server boundary → domain logic → data/integration → response
```

For each journey record:

- files and functions involved;
- authorization and validation points;
- state transitions and failure modes;
- tests and observability;
- uncertainty or missing evidence.

### 2.4 Validate the baseline

Run safe existing commands before changing anything:

- install or environment diagnostics when permitted;
- typecheck, lint, unit tests, integration tests, and build;
- relevant smoke or browser checks;
- repository health and dependency checks already supplied by the project.

Record pre-existing failures separately. Never attribute them to a future change.

### 2.5 Manage context deliberately

For a large repository:

- split investigation by subsystem or user journey;
- use separate subagents or sessions for independent exploration;
- require each investigator to return evidence, unknowns, and confidence;
- synthesize summaries into the project model;
- read source files on demand during implementation rather than loading them all
  up front.

Do not claim complete understanding. Report coverage and blind spots.

## Phase 3 — diagnose the project

Create a dated health report from
`docs/ai/templates/PROJECT_HEALTH_REPORT.md`.

Inspect these dimensions:

| Dimension | Example signals |
|---|---|
| Product value | abandoned flows, unresolved user pain, weak activation, unclear core action |
| Correctness | failing tests, bug reports, inconsistent state, error swallowing |
| Security and privacy | authorization gaps, secret exposure, unsafe defaults, excessive data |
| Architecture | dependency cycles, boundary leaks, duplicated domain logic, unclear ownership |
| Maintainability | oversized files, complexity, dead code, stale abstractions, documentation drift |
| Testability | critical journeys without tests, flaky tests, unrealistic mocks, missing failure cases |
| Performance and cost | slow paths, repeated calls, large bundles, expensive queries, unbounded usage |
| Reliability | weak retries, no idempotency, missing timeouts, poor rollback or observability |
| Accessibility and UX | blocked keyboard/screen-reader use, confusing errors, unnecessary steps |
| Developer experience | slow feedback, brittle setup, inconsistent commands, missing local diagnostics |
| Platform health | stale dependencies, deprecations, unsupported runtimes, vendor lock-in risk |
| Opportunity | new capability, underserved segment, valuable data asset, workflow compression |

Possible evidence includes code, tests, commands, metrics, logs, issues, support,
user research, dependency advisories, official documentation, and direct product
observation. A style preference without impact is not a project problem.

## Phase 4 — create and rank improvement candidates

Separate candidates into:

- **repair** — fix incorrect or unsafe behavior;
- **reduce risk** — tests, observability, rollback, security, reliability;
- **simplify** — remove accidental complexity or duplication;
- **upgrade** — adopt a supported or materially better capability;
- **product opportunity** — improve a user or business outcome;
- **research** — resolve a decision-critical unknown before building.

Each candidate must contain:

- observed problem or opportunity;
- evidence and confidence;
- affected user, journey, or subsystem;
- expected outcome;
- severity or upside;
- urgency;
- estimated effort and reversibility;
- dependencies and risk;
- cheapest next action.

Rank candidates with a transparent rubric, not intuition alone. Suggested fields:

```text
priority = impact × confidence × urgency × strategic fit
           adjusted by effort, risk, and reversibility
```

Do not present the score as mathematical truth. Keep the underlying evidence.

Select one candidate per delivery cycle. Broad programs must be decomposed into
issues with independently verifiable outcomes.

## Phase 5 — research only what changes the decision

Use `docs/ai/DISCOVERY_RESEARCH.md` when the candidate depends on current or
external knowledge.

Research may cover:

- official framework, API, model, database, or platform documentation;
- security advisories, standards, regulations, and migration guides;
- competitor behavior, substitutes, pricing, and product flows;
- user needs, reviews, support patterns, and current workarounds;
- benchmarks, papers, datasets, and technical feasibility;
- failed approaches and reasons not to build.

Before browsing, write the questions and what evidence would change the plan.
Prefer primary sources, record publication and access dates, compare alternatives,
and search for contradiction. Do not browse endlessly after the decision is
stable enough.

## Phase 6 — plan delivery

Convert the selected candidate into an issue and, when required, a saved plan.
The plan must include:

- current behavior and evidence;
- desired outcome and acceptance criteria;
- explicit non-goals;
- source files and boundaries likely to change;
- research conclusions and version-sensitive assumptions;
- implementation slices and dependency order;
- test, browser, performance, security, and migration checks;
- rollout, rollback, and observability;
- permission gates and unresolved risks.

A plan is not permission. Sensitive actions remain gated by `docs/ai/SAFETY.md`.

## Phase 7 — implement and verify

For A3 work:

1. Work on a branch or isolated worktree.
2. Re-read the source files for the current slice.
3. Make the smallest coherent change.
4. Run focused checks immediately.
5. Compare behavior with acceptance criteria.
6. Run `pnpm verify`.
7. Use a fresh session or reviewer to inspect the diff.
8. Fix accepted findings and rerun checks.
9. Open a draft PR with evidence, risks, and rollback notes.

Do not combine unrelated backlog items simply because the agent discovered them
in the same audit.

## Phase 8 — measure and learn

After delivery:

- confirm the production or user outcome when access and permission exist;
- compare result with baseline and expected outcome;
- update `PROJECT_MODEL.md` when architecture or behavior changed;
- update the improvement and research indexes;
- link issue, plan, research, PR, and measurement;
- record failures, misleading evidence, and repeated friction;
- convert recurring lessons into documentation, tests, lint, scripts, or CI.

An improvement is not complete merely because code merged. The intended outcome
must be observable, or the team must state why it cannot yet be measured.

## Stop and escalation conditions

Stop, report evidence, and request a decision when:

- the objective or target user is ambiguous;
- repository documents and runtime behavior materially conflict;
- required access, credentials, data, or environment is unavailable;
- the agent cannot verify the proposed change;
- research sources are stale, contradictory, or insufficient for a high-risk
  decision;
- the change touches A4 areas without explicit approval;
- two implementation attempts fail for the same reason;
- the task expands beyond the approved issue or budget;
- a destructive or irreversible action becomes necessary.

## Forbidden shortcuts

- Do not invent analytics, interviews, incidents, source access, or test results.
- Do not call an issue “high priority” without stating impact and evidence.
- Do not upgrade a dependency solely because a newer version exists.
- Do not rewrite architecture solely because another pattern is fashionable.
- Do not use competitor feature parity as proof of user value.
- Do not hide uncertainty behind a precise-looking score.
- Do not self-merge, deploy to production, alter production data, or rotate
  secrets unless the human explicitly authorizes that exact action.

## Completion report

Report:

1. objective and autonomy level;
2. repository coverage and important blind spots;
3. baseline status;
4. ranked candidates and evidence;
5. selected candidate and why;
6. research performed and sources;
7. plan and implementation scope;
8. verification evidence;
9. remaining risks and required human decisions;
10. repository memory updated for the next agent.

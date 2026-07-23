# Project model — Shipkit Evolution Engine

Status: active verified snapshot  
Last verified: 2026-07-23  
Primary product: Shipkit Evolution Engine  
Current safe autonomy ceiling: A2 for arbitrary repositories; A3 remains experimental and trusted-only

This model distinguishes implemented repository evidence from planned product capability. It does not claim production use, product-market fit, complete sandbox isolation, high-quality autonomous research, or positive recursive improvement.

## Product identity

- **Primary product:** a deterministic, evidence-backed control plane around human and AI agents.
- **First beachhead user:** a solo developer or open-source maintainer already using coding agents.
- **First product question:** what should this project do next, why, and what is the smallest safe experiment that can test it?
- **First usable MVP:** an A2 read-only Research Audit.
- **Reference product:** the Next.js Starter Kit remains maintained as a realistic dogfood target, not the primary roadmap owner.
- **Source of truth:** `IDEA.md`.

## Repository structure

| Area | Role | Boundary | Confidence |
| --- | --- | --- | --- |
| `packages/evolution-core` | primary product kernel and CLI | no model or paid API required | High |
| `docs/evolution` | product thesis, architecture, comparisons, research capability and detailed roadmap | decisions require evidence and falsification tests | High |
| `.shipkit` at runtime | local cycle state and evidence store | must remain outside committed source | High |
| `apps/web` | Starter Kit dogfood/reference application | not the primary product definition | High |
| shared `packages/*` | auth, DB, security, mail, storage, payment and support packages | vendor calls behind adapters | High |
| `scripts` | dogfood, generator and repository checks | control tooling should remain bounded | High |
| `templates/STARTER_IDEA.md` | product template copied into generated starter projects | generated projects replace it | High |

## Implemented Evolution Engine flow

```text
init
→ start created cycle
→ inspect repository and register baseline evidence occurrence
→ observed
→ assess authorized checks and scorecard
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

## Kernel model

### State

- explicit legal stages and terminal outcomes;
- immutable transition results;
- append-only event history;
- artifact requirements before evidence-dependent stages;
- explicit passing result before `verified`.

### Policy

- autonomy levels A0–A4;
- risk classes R0–R4;
- protected actions require approvals;
- approvals are bound to exact cycle and scope;
- approvals contain policy version, expiry and revocation state;
- A2 cannot modify code;
- untrusted repository execution must not exceed the capabilities of its sandbox backend.

### Persistence

- synchronized append-only JSONL journal;
- atomic snapshot replacement;
- cycle checksum and sequence validation;
- corrupt or stale snapshot recovery from journal;
- interrupted trailing journal write recovery;
- per-cycle writer lock and stale-writer rejection.

Current gaps:

- migration fixtures across released formats;
- kill-process tests at every persistence boundary;
- multi-process stress testing;
- stronger cryptographic provenance beyond unkeyed corruption detection.

### Evidence

Evidence now separates:

```text
Blob
- immutable digest and bytes
- media type and size

EvidenceOccurrence
- unique occurrence ID
- kind and source context
- captured timestamp
- reference to blob digest
```

The same bytes may support multiple claims without silently reusing the first occurrence metadata. Registered evidence can be re-read and digest-verified.

Current gaps:

- typed source and claim provenance;
- transformations and actor attribution for all occurrences;
- content-level secret detection;
- retention, deletion and private-data governance;
- signed portable attestations.

## Repository assessment boundary

The inspector discovers:

- Git state;
- package managers and manifests;
- languages, source and test locations;
- standard package checks;
- CI workflows and documentation;
- product signals;
- structural auth, database, deployment, secret and payment boundaries;
- inventory truncation.

The check runner:

- selects only discovered package scripts;
- executes without a shell;
- uses temporary source copies;
- applies timeout and output limits;
- reduces environment variables and redacts common secret forms;
- never installs dependencies.

It is not a complete sandbox:

- network isolation is not enforced;
- filesystem writes are not contained to the temporary workspace;
- process containment is incomplete;
- existing host `node_modules` may be linked.

Therefore “temporary-workspace check” is the correct term. “Isolated check” must not be used as a security claim.

## Product readiness model

A single universal readiness score is insufficient. Planned output must distinguish:

- `researchReadiness`;
- `executionReadiness`;
- `verificationReadiness`;
- `autonomyCeiling`;
- `evidenceConfidence`.

A repository may be ready for read-only research while blocked for code execution.

## Next product slice — A2 Research Audit

```text
decision brief
→ question decomposition and coverage map
→ reproducible bounded search
→ source records
→ atomic claims
→ contradiction review
→ three opportunities
→ transparent ranking
→ smallest reversible experiment
→ explicit stop reason
```

First required records:

- `ResearchBrief`;
- `ResearchPlan`;
- `QueryRecord`;
- `SourceRecord`;
- `ClaimRecord`;
- `ContradictionRecord`;
- `OpportunityRecord`.

Start with one worker and one independent reviewer. Parallel workers must beat the simpler baseline before adoption.

## Verification baseline

Latest verified PR #10 checks before this model update:

- Test & Build;
- Evolution Engine Proof;
- demo-mode browser E2E;
- portable PostgreSQL auth and user-isolation E2E;
- AI workflow check.

Every head change must re-run these checks. A passing CI run proves compatibility with the tested repository state, not product usefulness.

## Product validation gaps

- no completed A2 Research Audit through the product interface;
- no external user has yet demonstrated repeat use;
- no measured evidence that Shipkit improves a real decision;
- no recommendation-survival or avoided-waste data;
- target-user segments remain broader than the first beachhead;
- no willingness-to-pay or deployment-operating model evidence.

## Priority order

1. Keep product identity and source-of-truth files coherent.
2. Finish persistence migration and kill-boundary proof.
3. Define a fail-closed sandbox capability interface.
4. Build the narrow A2 Research Audit vertical slice.
5. Test it with real developers and unrelated products.
6. Add bounded execution only after read-only decision value is proven.
7. Defer MCP, A2A, hosted surfaces and learning claims until their prerequisites exist.

## Hard constraints

- models cannot directly mutate kernel state;
- an approval must match its exact cycle, action and scope;
- unsupported claims fail closed;
- untrusted source content is data, not instruction;
- no implicit merge, deploy, spending, secret access or production write;
- evidence contradictions remain visible;
- learning promotion requires later consumption and measured benefit;
- active documentation may not claim more than code, CI and user evidence prove.

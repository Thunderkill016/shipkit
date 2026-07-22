# Shipkit PRES implementation profile

**Profile version:** 0.1.0  
**Core:** PRES-1 0.1.0  
**Current self-assessed level:** E2 — Learning  
**Assessment date:** 2026-07-22

## 1. Scope

This profile maps PRES Core to AI-assisted software and product development in a
Git repository.

It covers repository investigation, product discovery, implementation planning,
bounded code change, CI, review, and durable learning.

It excludes production deployment, legal certification, model training, and
unrestricted autonomous operation.

## 2. Artifact mapping

| PRES artifact | Shipkit location |
|---|---|
| Intent and agent rules | `AGENTS.md`, GitHub Issue Forms |
| Workflow | `AI_WORKFLOW.md` |
| Project model | `docs/ai/PROJECT_MODEL.md` |
| Current capability state | `docs/CAPABILITIES.json` |
| Autonomous improvement protocol | `docs/ai/AUTONOMOUS_IMPROVEMENT.md` |
| Discovery research protocol | `docs/ai/DISCOVERY_RESEARCH.md` |
| Research memory | `docs/ai/research/` |
| Improvement memory | `docs/ai/improvements/` |
| Plans | `docs/ai/plans/` |
| Risk and permission policy | `docs/ai/SAFETY.md` |
| Verification policy | `docs/ai/VERIFICATION.md` |
| Change provenance | Git commits and pull requests |
| Mechanical checks | `scripts/check-ai-workflow.mjs`, capability checker, CI |
| Portable cycle index | PRES manifest introduced by this profile |

## 3. Software profile autonomy

- A0: read repository and run safe read-only checks;
- A1: audit, diagnose, and create ranked backlog;
- A2: current external research and implementation plan;
- A3: bounded low/medium-risk branch, tests, and draft PR;
- A4: auth, billing, production, destructive data, broad migrations, security,
  legal/privacy-sensitive work, or release.

A4 requires explicit human approval before implementation and before release.

## 4. Software profile evidence

Typical evidence strength:

1. documentation claim;
2. code or configuration presence;
3. static analysis;
4. unit or contract test result;
5. integration or browser behavior;
6. production or representative-environment observation;
7. user/product metric with baseline;
8. repeated controlled comparison.

A file path in `CAPABILITIES.json` proves traceability, not runtime success.

## 5. Current conformance assessment

### E0 — satisfied

Shipkit records objectives, issues, plans, commits, pull requests, checks, and
outcomes.

### E1 — substantially satisfied for bounded repository work

- acceptance criteria and risk gates exist;
- tests and CI are recorded;
- draft PRs preserve review and rollback;
- independent review is used for material changes;
- failures are retained rather than relabeled.

Known limitation: some CI paths remain failing or incomplete and are explicitly
recorded.

### E2 — satisfied for the current reference workflow

- project and capability memory are versioned;
- agent entry points link to current memory;
- dogfood cycles updated tests, documentation checks, and generator behavior;
- rejected, parked, and failing findings remain in indexes and issues;
- mechanical checks detect missing or unsupported memory artifacts.

### E3 — not yet satisfied

Shipkit has plausible meta-improvements, including better repository memory,
negative tests, capability validation, and research workflow. It has not yet run
a controlled benchmark demonstrating that one of those changes measurably improves
later-cycle performance under comparable tasks and budget.

Required next experiment:

1. define a fixed set of representative repository tasks;
2. run baseline cycles without one selected meta-control;
3. run cycles with the meta-control;
4. compare verified success, defects found, time/cost, rework, and risk;
5. use an independent assessor and disclose model/task variance.

### E4 — not satisfied

No independent implementation currently consumes Shipkit PRES manifests and
continues a cycle interoperably.

## 6. Claim

```text
PRES 0.1.0 / E2 Learning / Shipkit Software Project Profile 0.1.0
Scope: agent/ai-engineering-workflow and documented dogfood cycles
Evidence: repository artifacts and draft pull requests
Assessor: self-assessed with independent diff-review steps
Date: 2026-07-22
Exceptions: production, billing, live integrations, and E3 meta-benchmark excluded
```

## 7. Profile-specific threats

- stale repository instructions;
- generated or vendored files overwhelming context;
- agent self-review without independence;
- changing tests to hide failures;
- prompt injection through issues, code, docs, or external research;
- secrets exposed through tool output;
- template projects inheriting false passing state;
- broad refactors authorized by open-ended requests;
- CI flakes misclassified without repeated evidence;
- code throughput mistaken for product value.

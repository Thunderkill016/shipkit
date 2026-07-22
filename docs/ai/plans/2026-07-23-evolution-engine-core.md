# Implementation plan — Shipkit Evolution Engine core MVP

Status: active  
Issue: #9  
Autonomy: A3  
Date: 2026-07-23

## Outcome

Shipkit Evolution Engine becomes a usable local product, not only repository guidance. A user can attach it to any Git repository, persist an evolution cycle, enforce stage/autonomy/risk gates, inspect project evidence, and resume after interruption.

## MVP scope

1. `packages/evolution-core` — deterministic state machine, policy engine, schemas, persistence interfaces.
2. `packages/evolution-cli` or root CLI — `init`, `inspect`, `start`, `advance`, `status`, `verify`.
3. `.shipkit/evolution/` — local versioned project memory and active-cycle pointer.
4. repository inspector — stable facts only: Git state, manifests, scripts, CI files, tests, docs, architecture/instruction files.
5. configured verification commands with structured results.
6. PRES-compatible cycle export.
7. unit/integration tests on Shipkit and a temporary foreign repository.

## Mandatory state transitions

```text
initialized
→ observed
→ modeled
→ diagnosed
→ researched
→ decided
→ planned
→ implemented
→ verified
→ measured
→ learned
→ meta-improved
→ completed
```

Rejected, rolled-back, and inconclusive terminal outcomes remain valid.

## Policy rules

- A0/A1/A2 must not enter `implemented`.
- A3 may edit a bounded workspace but cannot merge/deploy/alter production.
- A4 requires explicit recorded approval for protected actions.
- stages cannot be skipped unless a declared profile marks them not applicable;
- failed verification prevents a verified/completed success claim;
- evidence, rollback metadata, and provenance are mandatory before completion.

## Verification

- transition-table unit tests;
- autonomy/risk negative tests;
- crash/resume persistence test;
- foreign-repository inspection test;
- malformed state/evidence rejection;
- configured command execution with timeout and captured result;
- generated PRES manifest validation;
- existing Shipkit checks remain green.

## Out of scope

- hosted SaaS;
- dashboard UI;
- MCP server;
- automatic agent execution;
- merge/deploy;
- Product Slice and Studio expansion.

These become adapters only after the core state machine is proven.

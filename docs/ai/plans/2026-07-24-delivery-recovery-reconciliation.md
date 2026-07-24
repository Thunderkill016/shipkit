# Delivery recovery and reconciliation

**Date:** 2026-07-24  
**Parent:** issue #44  
**Predecessor:** merged PR #48  
**Status:** implementation candidate

## Decision

Add an operator-driven recovery command for trusted-local delivery state that may be split across the durable Evolution journal, local delivery control sidecar, isolated branch and worktree.

Recovery must inspect first and mutate only after explicit `--apply`.

## Recoverable transitions

```text
executing + durable implemented execution + exact intact patch digest
→ implemented

executing + durable failed/inconclusive execution
→ rejected/inconclusive

implemented + durable accepted verification + exact clean commit
→ verified

implemented + durable rejected/inconclusive verification
→ rejected/inconclusive
```

An implemented cycle with no verification record and an intact patch remains `implemented`; the independent verifier command can be rerun normally. “Intact” requires the same changed-file list and the same path, file-mode and content digest captured by the execution record.

## Fail-closed rule

A clean commit without a durable verification verdict is not evidence that checks passed. Recovery must mark the cycle `inconclusive` when apply is requested rather than infer `verified`.

Changing content inside the same filename is also not evidence-equivalent. If the recomputed execution patch digest differs, recovery must report divergence and refuse to complete `executing → implemented` or resume verification.

Missing, corrupt or mismatched control state also becomes `inconclusive` for interrupted `executing` or `implemented` stages. A cycle already at `verified` is blocked from recovery-assisted publication when local control cannot be trusted; recovery does not silently reconstruct or demote that state.

## Evidence

Every inspection creates:

- a content-addressed `delivery-recovery` evidence record;
- an integrity-covered `recovery.json` sidecar containing the latest decision;
- both recorded and observed patch digests when control and worktree inspection are available;
- lifecycle history evidence when a transition is applied.

## Concurrency boundary

The final transition still uses `EvolutionStore.save`, so a concurrent lifecycle update produces a stale-state failure instead of being overwritten.

This slice does not yet create write-ahead operation checkpoints or track child process ownership. It therefore reconciles durable records but cannot resurrect command output or verifier results that were never persisted.

## Verification

Regression coverage must prove:

- inspection is read-only without `--apply`;
- a durable implemented execution can complete `executing → implemented`;
- same-filename content drift fails the exact patch-digest check and becomes inconclusive;
- a durable accepted verification can complete `implemented → verified` only when the exact clean commit remains;
- an unrecorded commit never becomes verified;
- missing control during `executing` becomes inconclusive when explicitly applied;
- an intact unverified patch remains implemented and can return to the normal verifier path.

Full repository CI, standalone Node.js package proofs, Evolution proofs, hostile Docker proof and both browser E2Es must remain green.

## Deferred

- write-ahead checkpoints before command start;
- child process leases and stale-operation detection;
- automatic orphan worktree cleanup;
- untrusted writable remote or microVM execution;
- web delivery controls and progress streaming;
- merge, deployment, rollback and outcome learning;
- external product validation.

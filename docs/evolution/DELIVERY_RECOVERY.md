# Governed delivery recovery and reconciliation

CycleWarden delivery recovery is a fail-closed operator workflow for interrupted trusted-local delivery runs.

It does not claim process resurrection, command replay, credential isolation, autonomous rollback, merge authority, deployment authority, or external product validation.

## Why recovery is separate

The durable Evolution journal and the local delivery control sidecar are written independently. A process can terminate after one durable write and before the matching write completes. The result may be a cycle whose lifecycle stage lags behind an execution or verification record.

Recovery compares four sources of truth:

1. the append-only Evolution cycle journal;
2. the integrity-covered delivery control sidecar;
3. the isolated git branch and worktree;
4. the recorded execution, verification and publication evidence references.

It never chooses the most optimistic interpretation. When the available records cannot prove a safe transition, the result is blocked or `inconclusive`.

## Inspect first

Recovery is read-only unless `--apply` is explicitly supplied.

```bash
pnpm deliver -- recover <cycle-id> \
  --root .cyclewarden \
  --project-root /absolute/path/to/trusted/repository \
  --actor owner-recovery-operator
```

The inspection returns:

- current and proposed lifecycle stages;
- control-sidecar validity;
- worktree and branch status;
- the recovery decision;
- findings and unresolved state;
- the next operator action.

The latest inspection is stored in an integrity-covered `recovery.json` sidecar and as content-addressed `delivery-recovery` evidence.

## Apply a proven transition

After reviewing the inspection, apply only the proposed deterministic transition:

```bash
pnpm deliver -- recover <cycle-id> \
  --root .cyclewarden \
  --project-root /absolute/path/to/trusted/repository \
  --actor owner-recovery-operator \
  --apply
```

Recovery can complete these bounded cases:

- `executing → implemented` when a durable implemented execution record exists and the isolated uncommitted patch still matches its changed-file manifest;
- `executing → rejected` or `executing → inconclusive` when the durable execution record already has that outcome;
- `implemented → verified` when an accepted verification record, evidence reference, exact commit SHA, branch ref and clean worktree all agree;
- `implemented → rejected` or `implemented → inconclusive` when the durable verification verdict already has that outcome.

The normal `EvolutionStore.save` stale-state check still protects the final write. If another process changes the cycle between inspection and apply, recovery fails rather than overwriting newer state.

## Safe resume cases

When the cycle is `implemented`, no verification verdict exists, and the original uncommitted patch remains intact, recovery leaves the cycle at `implemented` and instructs the operator to rerun:

```bash
pnpm deliver -- verify <cycle-id> \
  --root .cyclewarden \
  --project-root /absolute/path/to/trusted/repository \
  --actor independent-verifier
```

Verification commands are rerun through the normal verifier path. Recovery does not impersonate a verifier or create an accepted verdict itself.

When a publication record is rejected or inconclusive, the cycle remains `verified`. The operator may rerun the explicit `publish --draft-pr` command with the intended remote, base, title and body options. Publication is already designed to reuse a matching open draft PR and confirm the remote commit SHA.

## Fail-closed cases

Recovery marks an interrupted `executing` or `implemented` cycle `inconclusive` when applying recovery was requested and any of these conditions prevents proof:

- the delivery control sidecar is missing, unreadable, mismatched or fails its integrity digest;
- the isolated worktree is missing or unavailable;
- the branch ref, worktree HEAD or changed-file manifest diverges;
- an accepted verification record lacks its evidence reference or exact clean commit;
- a clean commit exists on the isolated branch but no durable verification verdict proves that checks passed.

An unrecorded commit is never upgraded to `verified`. The branch is preserved for inspection, but it must not be published as accepted CycleWarden output.

For a cycle already at `verified`, invalid or missing local delivery control blocks recovery-assisted publication rather than silently demoting or reconstructing the verified journal state.

## Remaining limitations

This slice reconciles durable records after an interrupted process. It does not yet add a write-ahead operation journal before every execution, verification and publication step. Therefore, it cannot recover stdout, stderr, exit codes or verifier results that were never durably recorded.

It also does not:

- detect or terminate a still-running implementation process;
- automatically remove orphan worktrees or branches;
- reset or rewrite an unrecorded commit;
- retry implementation commands;
- recover deleted control sidecars from remote storage;
- merge, deploy, roll back production or measure outcomes;
- make trusted-local execution safe for untrusted repositories.

A later slice should add operation checkpoints and process ownership before commands start, followed by remote or microVM execution with explicit credential and egress controls.

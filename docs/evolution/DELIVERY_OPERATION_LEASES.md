# Delivery operation checkpoints and process leases

CycleWarden protects CLI-driven delivery mutations with a durable write-ahead checkpoint and a local process lease.

This slice covers `cyclewarden-deliver execute`, `verify`, and `publish`. It does not claim distributed locking, remote process control, or protection for callers that invoke the library APIs directly.

## Protected flow

Before a protected command starts, CycleWarden:

1. inspects any prior `operation.json` checkpoint;
2. atomically creates an `operation.lock` directory;
3. writes an integrity-covered `running` checkpoint;
4. records the owner hostname and PID;
5. starts a heartbeat;
6. records the trusted-local command child PID when the execution backend spawns it.

The checkpoint is written before delivery mutation begins. Normal completion records `completed`; handled failure records `failed`. A hard process crash leaves the `running` checkpoint and lock in place so later work fails closed.

## Inspect a lease

```bash
pnpm deliver -- operation <cycle-id> \
  --root .cyclewarden \
  --project-root /absolute/path/to/repository \
  --actor owner-recovery-operator
```

Inspection reports:

- checkpoint integrity state;
- whether the lock directory remains;
- owner and child process liveness;
- `healthy`, `active`, `stale`, or `blocked` disposition;
- the next safe operator action.

Inspection is read-only by default.

## Clear a proven stale lease

A stale lease may be cleared only when:

- the checkpoint is integrity-valid;
- the checkpoint belongs to the current host;
- neither the owner PID nor recorded child PID is alive;
- the operator explicitly supplies `--apply`.

```bash
pnpm deliver -- operation <cycle-id> \
  --root .cyclewarden \
  --project-root /absolute/path/to/repository \
  --actor owner-recovery-operator \
  --apply
```

Applying stale-lease recovery:

- records content-addressed `delivery-operation-recovery` evidence;
- marks an interrupted running operation `abandoned`;
- removes the stale lock;
- does not infer implementation or verification success.

After clearing a stale lease, run `cyclewarden-deliver recover` to reconcile the Evolution journal, delivery control sidecar, branch, worktree, and durable execution or verification records.

## Fail-closed cases

CycleWarden refuses to clear or replace the lease when:

- the owner or child process is still alive;
- the checkpoint belongs to another host;
- the integrity digest fails;
- a lock exists without a trustworthy checkpoint;
- terminal checkpoint persistence fails.

The operation recovery path never kills a process, reruns a command, accepts an unrecorded commit, merges, deploys, or writes production.

## Current boundary

- Process liveness is local-host only.
- `execute` and `verify` record trusted-local execution-backend child PIDs.
- `publish` is protected by the owner-process lease, but its short-lived `git`/`gh` subprocess PIDs are not yet recorded.
- Direct library calls bypass the CLI lease boundary.
- A hard crash can still lose stdout, stderr, or a result that was never durably recorded.
- This is not a distributed lock and does not make trusted-local execution safe for untrusted repositories.

A later slice can move operation context into the public library API, add remote lease ownership, record publication subprocesses, and integrate stale-operation inspection directly into the web workspace.

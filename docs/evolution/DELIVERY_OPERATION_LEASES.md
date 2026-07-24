# Delivery operation checkpoints and process leases

CycleWarden protects CLI-driven delivery mutations with a durable write-ahead checkpoint and a local process lease.

This slice covers `cyclewarden-deliver execute`, `verify`, and `publish`. It does not claim distributed locking, remote process control, or protection for callers that invoke the library APIs directly.

## Protected flow

Before a protected command starts, CycleWarden:

1. inspects any prior `operation.json` checkpoint or acquisition lock record;
2. writes and fsyncs an integrity-covered `running` candidate checkpoint;
3. atomically hard-links that checkpoint to `operation.lock`, preventing a second CLI operation from acquiring the same cycle;
4. renames the prepared checkpoint to `operation.json`;
5. records the owner hostname and PID and starts a heartbeat;
6. records the trusted-local command child PID when the execution backend spawns it.

The candidate is durable before lock acquisition. If the process dies after the hard link but before the primary checkpoint rename, `operation.lock` itself remains an integrity-valid acquisition record that can be inspected. Normal completion records `completed`; handled failure records `failed`. A hard process crash leaves a `running` checkpoint and lock so later work fails closed.

## Inspect a lease

```bash
pnpm deliver -- operation <cycle-id> \
  --root .cyclewarden \
  --project-root /absolute/path/to/repository \
  --actor owner-recovery-operator
```

Inspection reports:

- checkpoint integrity state;
- whether the lock file remains;
- owner process and trusted-local child process-group liveness;
- `healthy`, `active`, `stale`, or `blocked` disposition;
- the next safe operator action.

Inspection is read-only by default.

## Clear a proven stale lease

A stale lease may be cleared only when:

- the primary checkpoint or acquisition lock record is integrity-valid;
- the checkpoint belongs to the current host;
- neither the owner PID nor recorded child process group is alive;
- a second inspection still finds the same stale operation after recovery evidence is written;
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
- restores or updates `operation.json` when only the acquisition lock survived;
- removes the stale lock and candidate file;
- does not infer implementation or verification success.

After clearing a stale lease, run `cyclewarden-deliver recover` to reconcile the Evolution journal, delivery control sidecar, branch, worktree, and durable execution or verification records.

## Fail-closed cases

CycleWarden refuses to clear or replace the lease when:

- the owner process or recorded child process group is still alive;
- the checkpoint belongs to another host;
- the integrity digest or record shape fails validation;
- the lock cannot provide a trustworthy acquisition record when the primary checkpoint is missing;
- ownership changes between inspection and apply;
- terminal checkpoint persistence fails.

The operation recovery path never kills a process, reruns a command, accepts an unrecorded commit, merges, deploys, or writes production.

## Current boundary

- Process liveness is local-host only.
- On POSIX, child liveness checks the detached process group and then the individual PID; Windows checks the PID.
- `execute` and `verify` record trusted-local execution-backend child PIDs.
- `publish` is protected by the owner-process lease, but its short-lived `git`/`gh` subprocess PIDs are not yet recorded.
- Direct library calls bypass the CLI lease boundary.
- A hard crash can still lose stdout, stderr, or a result that was never durably recorded.
- Candidate files created before successful lock acquisition may remain after a process crash, but they do not grant ownership and may be cleaned separately.
- This is not a distributed lock and does not make trusted-local execution safe for untrusted repositories.

A later slice can move operation context into the public library API, add remote lease ownership, record publication subprocesses, clean orphan candidates, and integrate stale-operation inspection directly into the web workspace.

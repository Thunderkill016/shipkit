# Delivery write-ahead checkpoints and process leases

**Date:** 2026-07-24  
**Parent:** issue #44  
**Predecessor:** merged PR #49  
**Status:** implementation candidate

## Decision

Add a CLI-bound write-ahead operation checkpoint and local process lease before `execute`, `verify`, or `publish` begins.

The previous recovery slice can reconcile durable records after a crash, but it cannot distinguish an actually running command from an abandoned `running` state. This slice adds the minimum local ownership evidence needed to make that distinction without claiming distributed coordination.

## Durable operation state

Each protected command writes an integrity-covered record containing:

- operation ID, cycle ID, operation kind and actor;
- canonical project-root string used by the CLI;
- owner hostname and PID;
- trusted-local execution child PID when available;
- start, heartbeat and completion timestamps;
- `running`, `completed`, `failed`, or `abandoned` status;
- failure digest and optional stale-recovery evidence reference.

Acquisition uses a durable prepared checkpoint plus an atomic hard link:

```text
fsync candidate checkpoint
→ hard-link candidate to operation.lock
→ rename candidate to operation.json
→ begin protected delivery work
```

The hard link prevents a second CLI operation from acquiring the same cycle. If the process dies after lock acquisition but before the primary checkpoint rename, the lock file itself remains an integrity-valid ownership record rather than an opaque orphan lock.

## Recovery rule

Inspection is read-only. Explicit `--apply` may clear a lease only when the primary checkpoint or acquisition lock record passes integrity validation, belongs to the current host, and both the recorded owner and trusted-local child process group are dead.

A live owner, live child/process group, foreign-host lease, invalid record, or ownership change during apply remains blocked.

Clearing a stale lease does not advance the Evolution lifecycle. The operator must then use the existing delivery recovery command to reconcile execution, verification, publication, branch, worktree, and journal state.

## Verification

Regression coverage must prove:

- the running checkpoint exists before callback work begins;
- normal completion removes the lock and records a terminal checkpoint;
- overlapping operations are rejected;
- the trusted-local backend records its spawned child PID;
- dead owner/child state is inspect-only until explicit apply;
- clearing stale state records content-addressed evidence;
- the acquisition lock can recover state when the primary checkpoint rename never occurred;
- a live recorded child prevents stale clearance;
- full repository CI, standalone Node.js 20/22/24 proofs, Evolution proofs, hostile Docker proof and both browser E2Es remain green.

## Boundaries

- first slice protects the CLI path, not arbitrary direct library calls;
- process liveness is local-host only;
- publication subprocess PIDs are not yet captured;
- orphan candidate cleanup is deferred;
- no process termination, command replay, merge, deployment, production write or external validation;
- no claim that trusted-local execution is a security sandbox.

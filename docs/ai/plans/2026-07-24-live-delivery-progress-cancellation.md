# Live delivery progress and graceful cancellation

## Goal

Expose active delivery heartbeat and an inferred live phase in the authenticated web workspace, and let an authorized operator request fail-closed graceful cancellation without introducing a generic process-kill surface.

## Included

- a dedicated cancellation controller layered over the existing write-ahead operation lease;
- integrity-covered `cancel.json` intent stored separately from the heartbeat-written operation checkpoint;
- exact operation-ID, matching repository, current-host, fresh-heartbeat and owner/child liveness checks;
- Linux `/proc` validation that the recorded child still belongs to the owner and remains the detached process-group leader;
- two-snapshot process-start identity comparison before signalling, so a changed PID identity is never targeted;
- read-only cancellation planning by default and explicit `--apply` before SIGTERM;
- SIGTERM to the recorded detached child process group only, with no SIGKILL escalation;
- cancellation evidence persisted before signalling and best-effort checkpoint annotation for operators;
- web auto-refresh every five seconds while a delivery lease is active;
- UI cancellation enabled only when the controller confirms a validated cancellable child;
- authenticated, rate-limited and explicitly confirmed web cancellation through the official delivery CLI;
- regression coverage for read-only planning, exact-ID mismatch, repository mismatch and process-relationship mismatch.

## Safety boundary

This slice does not expose manifest authoring, implementation, verification, publication, merge, deployment or production writes. It does not cancel foreign-host operations, operations without an integrity-valid checkpoint, operations without a recorded child process, stale heartbeats or child PIDs whose owner/process-group relationship cannot be proven. Cancellation never escalates beyond SIGTERM.

## Known limitations

Process relationship and start-identity validation currently depend on Linux `/proc`, so graceful cancellation fails closed on other platforms. The existing operation checkpoint does not persist a start token at process creation; the controller therefore protects the inspect-to-signal race with two identity snapshots plus a fresh heartbeat rather than claiming historical PID identity. A cancelled command still flows through the existing fail-closed delivery result and recovery rules; cancellation never implies successful implementation or verification. Publication remains non-cancellable until its subprocess PID is recorded by the delivery backend.

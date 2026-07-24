# Durable delivery progress events

Date: 2026-07-24
Parent: issue #44

## Objective

Replace inferred-only delivery phase reporting with a durable append-only timeline that records operation and child-command progress without giving progress evidence authority over lifecycle transitions.

## Included

- one atomically written JSON file per progress event;
- monotonic sequence numbers plus previous-event and per-event integrity digests;
- operation-started, child-step-started/exited, final step-result and operation terminal events;
- public API protection for CLI and direct library callers through the existing delivery façade;
- final execution and verification results mapped back to the observed step order;
- control-independent `cyclewarden-deliver progress` inspection plus progress in `show` output;
- bounded web normalization and a live timeline in the delivery workspace;
- regressions for event ordering, cross-operation chaining, tamper detection and web fail-soft parsing.

## Safety boundary

Progress events are observability evidence only. They never advance a cycle, accept verification, publish a branch, merge, deploy, write production or replace execution/verification/publication evidence. If the progress journal becomes invalid, further appends fail closed and the workspace reports the integrity failure.

## Remaining after this slice

- explicit semantic phase events inside draft publication subprocesses;
- remote-host event transport and untrusted writable execution;
- event retention/compaction policy for very long-lived installations;
- release, deployment, rollback and measured outcome learning;
- external validation remains absent.

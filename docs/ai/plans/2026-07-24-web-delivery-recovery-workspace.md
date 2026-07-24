# Web delivery recovery workspace

## Decision

Expose durable delivery state and the existing fail-closed recovery commands inside the authenticated Evolution Workspace without exposing implementation, verification, publication, merge or deployment execution controls.

## Included

- a Node.js server-only bridge to `cyclewarden-deliver`;
- bounded normalization of execution, verification, publication and operation-lease records;
- a delivery console route that selects the same durable cycle as the Evolution Workspace;
- read-only lease and reconciliation inspection;
- explicit apply controls for proven stale leases and deterministic durable-record reconciliation;
- operator access checks, rate limiting, confirmation and Next.js path revalidation;
- unit coverage for malformed or partial CLI output;
- demo browser coverage for console discovery and rendering.

## Safety boundary

- The web process never edits the journal, delivery control sidecar or operation checkpoint directly.
- Every inspection and recovery action runs through the official delivery CLI.
- Apply actions remain fail-closed inside Evolution Core and recheck state before mutation.
- The console cannot choose a manifest, run implementation or verification commands, push a branch, open a draft PR, merge, deploy or write production.
- Trusted-local delivery remains unsuitable for untrusted repositories.
- Process ownership remains local-host only.
- External product validation is still absent.

## Deferred

- manifest authoring and explicit web execution approval;
- live progress streaming and cancellation;
- publication subprocess PID tracking;
- distributed or remote operation ownership;
- writable remote or microVM execution;
- release, deployment, rollback and measured outcome learning.

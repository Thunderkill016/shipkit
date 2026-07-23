# Shipkit Evolution Engine architecture

Status: kernel architecture v0  
Issue: #9

## Planes

```text
Human / organization objectives
              ↓
┌─────────────────────────────────────────────┐
│ Control plane                               │
│ deterministic state machine · policy        │
│ checkpoints · claims · provenance · rollback│
└──────────────────┬──────────────────────────┘
                   │ authorized activities
┌──────────────────▼──────────────────────────┐
│ Execution plane                             │
│ Codex · Claude Code · Grok · OpenHands       │
│ shell · browser · MCP tools · sandboxes      │
└──────────────────┬──────────────────────────┘
                   │ artifacts and telemetry
┌──────────────────▼──────────────────────────┐
│ Evidence plane                              │
│ tests · CI · metrics · reviews · benchmarks  │
│ traces · attestations · user/business signals│
└──────────────────┬──────────────────────────┘
                   │ accepted evidence
┌──────────────────▼──────────────────────────┐
│ Learning plane                              │
│ durable memory · skills · policies · meta    │
│ paired evaluation · promotion/retirement     │
└─────────────────────────────────────────────┘
```

## Deterministic kernel

The kernel MUST remain useful without an LLM. It owns:

- explicit stages and legal transitions;
- append-only event history;
- immutable transition outputs;
- autonomy and risk decisions;
- scoped approvals;
- evidence requirements for claims;
- terminal rejection, rollback, and inconclusive states;
- persistence format and schema migration;
- resume/replay semantics.

The first implementation lives in `packages/evolution-core`.

## Durable local store

Each installed project owns a local-first store:

```text
.shipkit/
  config.json
  cycles/
    <portable-cycle-directory>/
      state.json
      events.jsonl
```

The journal is appended and synchronized before the snapshot is atomically replaced.
Each complete journal record includes the entire resulting cycle plus a SHA-256 checksum.
This intentionally trades disk space for simple, inspectable recovery during the first
format version.

Loading a cycle replays the journal first. A missing, corrupt, or stale snapshot is rebuilt
from the latest valid journal record. A partially written final journal line is treated as
an interrupted append and ignored; a malformed completed record or checksum mismatch fails
closed. Writers must provide the state they previously loaded, and stale concurrent writers
are rejected.

## CLI boundary

`pnpm evolve -- <command>` builds and executes the local CLI. The current commands are:

- `init` — create the local store and project config;
- `start` — create a cycle with objective, autonomy, and risk;
- `status` — list stored cycles;
- `show` / `resume` — load and recover a cycle;
- `advance` — make one legal, attributable, evidence-backed transition.

The CLI does not call a model, mutate code, merge, deploy, read secrets, or write production
by itself. Future scanners, research workers, check runners, and agent adapters must call the
same kernel/store APIs rather than bypassing them.

## Cycle stages

```text
created → observed → modeled → diagnosed → researched → decided
→ planned → executing → implemented → verified → measured → learned
→ meta-improved → completed
```

Permitted terminal alternatives include `rejected`, `rolled-back`, and
`inconclusive`. A cycle may complete after `learned` without claiming a
meta-improvement. It may not claim verification without explicit passing evidence.

## Policy model

- A0: inspection only.
- A1: research, plans, checks, and memory recording.
- A2: autonomous audit/decision preparation without code modification.
- A3: bounded code modification and draft PR; no merge/deploy.
- A4: protected actions may be requested, but merge, deploy, production writes,
  secret access, and spending always require explicit scoped approval.
- R3/R4 code changes require explicit approval even at A3/A4.

## Next kernel modules

1. Event-schema migration fixtures and kill-process persistence tests.
2. Repository scanner and project snapshot contract.
3. Evidence registry with content hashes.
4. Check runner with timeouts and sanitized output.
5. Internal/external research source contracts and opportunity portfolio.
6. Agent adapter interface and subprocess boundary.
7. MCP facade over the same kernel commands.
8. OpenTelemetry-compatible events.
9. Signed in-toto-compatible cycle attestations.
10. Paired meta-improvement comparator and benchmark harness.

## Hard invariants

- models cannot mutate kernel state directly;
- every state change is attributable and replayable;
- policy decisions are deterministic for the same inputs;
- unsupported claims fail closed;
- source content and secrets are not captured by default telemetry;
- failure and rejected candidates remain discoverable memory;
- no merge/deploy/production mutation occurs implicitly;
- learning promotion requires later consumption and measured evidence.

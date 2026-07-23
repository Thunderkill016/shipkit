# Shipkit Evolution Engine architecture

Status: kernel architecture v0  
Issue: #9

## Product boundary

Shipkit contains two different surfaces:

- **Evolution Engine** — primary product, deterministic control plane and CLI;
- **Starter Kit** — Next.js dogfood/reference project used to exercise real repository, auth, database, security and delivery boundaries.

The Starter Kit does not own the primary product definition. Root `IDEA.md` and `docs/evolution/` do.

## Planes

```text
Human / organization objectives
              ↓
┌─────────────────────────────────────────────┐
│ Control plane                               │
│ deterministic state · policy · approvals    │
│ checkpoints · decisions · rollback          │
└──────────────────┬──────────────────────────┘
                   │ authorized activities
┌──────────────────▼──────────────────────────┐
│ Execution plane                             │
│ trusted local · sandbox · agents · browser  │
│ CLI · future MCP clients                    │
└──────────────────┬──────────────────────────┘
                   │ artifacts and telemetry
┌──────────────────▼──────────────────────────┐
│ Evidence plane                              │
│ blobs · occurrences · claims · checks · CI  │
│ reviews · metrics · outcomes · attestations │
└──────────────────┬──────────────────────────┘
                   │ accepted evidence
┌──────────────────▼──────────────────────────┐
│ Learning plane                              │
│ consumed memory · skills · paired evaluation│
│ promotion · expiry · retirement             │
└─────────────────────────────────────────────┘
```

## Deterministic kernel

The kernel must remain useful without an LLM. It owns:

- explicit stages and legal transitions;
- append-only event history;
- immutable transition outputs;
- autonomy and risk decisions;
- exact cycle/action/resource-scope approvals;
- evidence requirements for claims;
- terminal rejection, rollback and inconclusive states;
- persistence format and schema migration;
- resume and replay semantics.

Models, research workers and coding agents are activities or clients. They cannot mutate kernel state directly or declare their own work accepted.

The implementation lives in `packages/evolution-core`.

## Durable local store

Each project owns a local-first store:

```text
.shipkit/
  config.json
  cycles/
    <portable-cycle-directory>/
      state.json
      events.jsonl
      .write.lock          transient only
  evidence/
    sha256/
      <digest>.json|bin
      <digest>.blob.json
    occurrences/
      <occurrence-id>.json
```

### Journal and snapshot

- the journal record is appended and file-synchronized before the snapshot is replaced;
- the snapshot is written to a temporary file, synchronized, renamed and followed by a best-effort directory sync;
- each complete journal record contains the resulting cycle, sequence and SHA-256 checksum;
- loading replays the journal first;
- missing, corrupt or stale snapshots are rebuilt from the latest valid record;
- an incomplete trailing line is treated as interrupted append;
- a malformed complete record, sequence mismatch or checksum mismatch fails closed.

### Writer serialization

- each cycle has an exclusive write lock;
- the lock contains a random ownership token, process ID and acquisition time;
- only the matching owner token may remove the lock;
- the current state is reloaded and compared inside the lock before append;
- competing stale writers are rejected.

Remaining proof includes multi-process stress, kill tests at every persistence boundary, stale-lock recovery tests and schema migration fixtures.

The checksum currently detects accidental corruption or unsupported modification. Signed provenance and hostile-writer resistance require later attestations and key-backed verification.

## Approval model

An approval contains:

- unique approval ID;
- exact cycle ID;
- action;
- exact resource scope;
- approving actor and timestamp;
- policy version;
- supporting evidence references;
- expiry and revocation state.

Protected authorization succeeds only when action, cycle and required scope match exactly and the approval is current, unrevoked and created for the active policy version.

For the current transition into code execution, the required scope is:

```text
cycle:<cycle-id>:modify-code
```

A non-empty string is not sufficient authorization.

## Evidence model

Content identity and evidence context are separate.

```text
EvidenceBlob
- sha256 digest
- immutable bytes
- media type
- byte length

EvidenceOccurrence
- unique occurrence ID
- blob digest
- evidence kind
- source path or source identity
- capture timestamp
- later: actor, cycle, transformation, classification and expiry
```

Identical bytes are stored once but may have multiple occurrences. This prevents the first registration's kind or source metadata from silently becoming the metadata for every later use.

Registered references can be read and re-hashed. Evidence-path registration rejects outside-root files, secret-bearing paths, symlinks and oversized files.

Remaining work includes content-level secret detection, typed source/claim records, deletion and retention semantics, dependent-claim invalidation, private-data policy and portable signed attestations.

## CLI boundary

`pnpm evolve -- <command>` builds and runs the local CLI:

- `init` — create local project configuration and storage;
- `start` — create a cycle with objective, autonomy and risk;
- `inspect` — scan a project and register a baseline evidence occurrence;
- `assess` — authorize and run discovered checks, build a scorecard and advance `observed → modeled`;
- `status` — list cycles;
- `show` / `resume` — load and recover a cycle;
- `advance` — make one legal, attributable, evidence-backed transition.

The CLI does not call a model, mutate code, merge, deploy, read secrets, spend money or write production by itself.

## Repository assessment boundary

Repository inspection records:

- bounded coverage and truncation;
- Git branch, commit and dirty state;
- package managers, manifests and checks;
- language, source and test locations;
- CI and documentation;
- product signals;
- structural auth, database, deployment, secret and payment boundaries.

Discovered package scripts run:

- without a shell;
- in a temporary source copy;
- with timeout and bounded output;
- with a reduced environment and common secret redaction;
- without dependency installation.

Current limitations:

- network isolation is not enforced;
- filesystem writes outside the temporary workspace are not contained;
- process containment is incomplete;
- existing host `node_modules` may be linked.

Therefore the current implementation uses the term **temporary-workspace checks**, not isolated or sandboxed checks. Untrusted scripts require a dedicated external sandbox.

Future execution uses a capability-negotiated backend:

```text
ExecutionBackend capabilities
- filesystemContainment
- processContainment
- dependencyIsolation
- secretIsolation
- networkPolicy
- resourceLimits
```

An operation requesting a missing capability fails closed.

## Scorecard boundary

The scorecard does not emit one universal quality score. It separates:

- `researchReadiness`;
- `executionReadiness`;
- `verificationReadiness`;
- `autonomyCeiling`;
- `evidenceConfidence`.

A repository may be ready for A2 read-only research while execution remains `trusted-local-only` or blocked.

## Cycle stages

```text
created → observed → modeled → diagnosed → researched → decided
→ planned → executing → implemented → verified → measured → learned
→ meta-improved → completed
```

Terminal alternatives are `rejected`, `rolled-back` and `inconclusive`. A cycle may complete after `learned` without claiming meta-improvement. Verification requires explicit passing evidence.

The long-term cycle is intentionally broader than the first product. The first MVP ends after an A2 decision and reversible experiment recommendation; it does not enter code execution.

## Current safe autonomy

- A0: inspection only;
- A1: bounded public research, planning, checks and record creation;
- A2: autonomous read-only audit and decision preparation within approved data scopes;
- A3: experimental bounded code modification and draft PR only after sandbox prerequisites;
- A4: protected actions may be requested, but merge, deploy, production writes, secrets and spending always require exact scoped approval.

For arbitrary repositories, the current product ceiling is A2. A3/A4 is not safe for untrusted execution yet.

## Next proof

1. migration fixtures and kill-boundary persistence tests;
2. sandbox backend contract and adversarial containment suite;
3. minimum A2 Research Audit records;
4. single-worker reproducible search and claim extraction;
5. contradiction review and three-opportunity portfolio;
6. smallest reversible experiment selection;
7. real-user decision-value validation;
8. only then, bounded execution adapters and draft PR delivery.

## Hard invariants

- models cannot mutate kernel state directly;
- every accepted state change is attributable and replayable;
- policy decisions are deterministic for the same inputs;
- approvals match exact cycle, action and scope;
- unsupported claims fail closed;
- source content is data, not instruction;
- secrets and source content are not captured by default telemetry;
- rejected candidates and contradictory evidence remain inspectable;
- no merge, deploy or production mutation occurs implicitly;
- research readiness does not imply execution safety;
- learning promotion requires later consumption and measured evidence.

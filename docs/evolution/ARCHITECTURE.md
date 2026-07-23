# Shipkit unified product architecture

Status: integrated architecture v1  
Issue: #9

## One product boundary

Shipkit is one AI-native product development system. Repository packages are safety and implementation boundaries, not separate products.

```text
Shipkit product
├── Product Workspace and Foundation
├── Evolution Kernel
├── Research Intelligence
├── Execution and Sandbox
├── Verification and Evidence
├── Delivery and Operations
├── Measurement and Learning
└── Interoperability
```

All modules must connect through the same durable cycle, typed records, policy decisions and evidence references. A capability that only works as an isolated demo is not fully integrated.

## User-visible lifecycle

```text
Product objective and current workspace
                ↓
Understand repository, architecture, users and outcomes
                ↓
Research evidence and discover opportunities
                ↓
Select and approve a reversible experiment
                ↓
Implement through an authorized agent and sandbox
                ↓
Verify code, security and policy independently
                ↓
Release or deploy through explicit approval
                ↓
Measure technical and product outcomes
                ↓
Retain, reject or retire learning
```

The same `EvolutionCycle` follows the work from objective to measured outcome.

## Product modules

### Product Workspace and Foundation

Current implementation surfaces:

- `apps/web`;
- shared auth, database, security, mail, storage and payment packages;
- setup and generator scripts;
- Vercel and Docker recipes.

Long-term responsibility:

- product objective, brief and roadmap;
- repository connection and setup;
- opportunity and experiment review;
- evidence, citation and contradiction inspection;
- approvals and risk decisions;
- agent execution progress;
- verification and release verdicts;
- measured outcomes and learning history;
- creation of new product workspaces from the integrated foundation.

The web application is therefore an early product workspace and application foundation, not merely a disposable reference project.

### Evolution Kernel

Implemented in `packages/evolution-core`. It must remain useful without an LLM and owns:

- explicit stages and legal transitions;
- append-only event history;
- immutable transition outputs;
- autonomy and risk decisions;
- exact cycle/action/resource-scope approvals;
- evidence requirements for claims;
- rejection, rollback and inconclusive outcomes;
- persistence format and schema migration;
- resume and replay semantics.

No research worker, coding agent, web handler or integration may mutate accepted state outside kernel operations.

### Research Intelligence

Responsibility:

- decision framing and question decomposition;
- repository, internal, web, paper, specification, competitor and user research;
- reproducible queries and source retrieval;
- atomic claims, exact evidence spans and transformations;
- contradiction, freshness, applicability, uncertainty and expiry;
- opportunity portfolio and experiment selection;
- separate citation and adversarial review.

Research output is a typed handoff to planning and execution, not only a report.

### Execution and Sandbox

Responsibility:

- generic command and coding-agent adapters;
- capability-negotiated execution backends;
- isolated branches, worktrees and environments;
- bounded filesystem, process, dependency, secret, network and resource access;
- progress, tool calls, costs and change artifacts;
- draft PR and rollback preparation.

Agents are interchangeable activities. They do not own the cycle, approval or acceptance decision.

### Verification and Evidence

Responsibility:

- content-addressed evidence and contextual occurrences;
- technical, security, policy and product checks;
- independent review boundaries;
- CI and benchmark evidence;
- provenance and portable attestations;
- final verdicts and unresolved uncertainty.

Implementation and verification must not collapse into one unreviewed agent claim.

### Delivery and Operations

Responsibility:

- generated product foundation and environment setup;
- GitHub issue, branch and pull-request workflows;
- authorized release and deployment adapters;
- configuration, migrations and operational checks;
- rollback and incident evidence;
- local, self-hosted and hosted operation.

### Measurement and Learning

Responsibility:

- technical, UX, adoption, retention, conversion, reliability and cost measurement;
- experiment exposure and comparison;
- keep, iterate, reject and rollback decisions;
- memory and skill records with provenance, scope and expiry;
- actual later-cycle consumption;
- paired evaluation, promotion and retirement;
- controlled meta-improvement only after causal evidence.

### Interoperability

Responsibility:

- GitHub Action and repository integration;
- MCP tools/resources;
- A2A interoperability when independent agent systems must coordinate;
- optional OpenTelemetry-compatible telemetry;
- portable policy, evidence and attestation formats.

These protocols expose Shipkit capabilities; they do not replace Shipkit governance.

## Shared control/evidence planes

```text
Human and organization objectives
                 ↓
┌──────────────────────────────────────────────┐
│ Product experience plane                     │
│ workspace · foundation · generator · reviews │
└──────────────────────┬───────────────────────┘
                       │ product commands
┌──────────────────────▼───────────────────────┐
│ Control plane                                │
│ durable state · policy · approvals · plans   │
│ checkpoints · rollback · typed handoffs      │
└──────────────────────┬───────────────────────┘
                       │ authorized activities
┌──────────────────────▼───────────────────────┐
│ Activity plane                               │
│ research · agents · browser · shell · deploy │
│ sandbox · integrations                       │
└──────────────────────┬───────────────────────┘
                       │ artifacts and signals
┌──────────────────────▼───────────────────────┐
│ Evidence and outcome plane                   │
│ blobs · claims · checks · reviews · metrics  │
│ provenance · user/business outcomes          │
└──────────────────────┬───────────────────────┘
                       │ accepted evidence
┌──────────────────────▼───────────────────────┐
│ Learning plane                               │
│ memory · skills · paired evaluation          │
│ promotion · expiry · retirement              │
└──────────────────────────────────────────────┘
```

## Durable local store

Each attached product owns a local-first store:

```text
.shipkit/
  config.json
  cycles/
    <portable-cycle-directory>/
      state.json
      events.jsonl
      .write.lock
  evidence/
    sha256/
      <digest>.json|bin
      <digest>.blob.json
    occurrences/
      <occurrence-id>.json
  research/          future typed records
  executions/        future activity records
  evaluations/       future outcome records
```

### Journal and snapshot

- journal records are appended and synchronized before snapshot replacement;
- snapshots use synchronized temporary files, rename and best-effort directory sync;
- each record carries the resulting cycle, sequence and checksum;
- loading replays the journal first;
- missing, corrupt or stale snapshots are rebuilt;
- incomplete trailing writes are ignored as interrupted appends;
- malformed complete records, sequence mismatches and checksum mismatches fail closed.

### Writer serialization

- each cycle has an exclusive write lock;
- the lock records a random ownership token, process ID and acquisition time;
- only the matching owner may remove it;
- current state is reloaded inside the lock;
- competing stale writers are rejected.

Remaining proof includes migrations, kill-boundary tests, multi-process stress and stale-lock recovery.

## Approval model

An approval contains:

- unique approval ID;
- exact cycle ID;
- action and resource scope;
- approving actor and timestamp;
- policy version;
- supporting evidence references;
- expiry and revocation state;
- later, a digest of exact action parameters.

Authorization succeeds only when the approval matches the requested action, cycle, scope and active policy. A non-empty string is never sufficient approval.

## Evidence model

```text
EvidenceBlob
- SHA-256 digest
- immutable bytes
- media type
- byte length

EvidenceOccurrence
- unique occurrence ID
- blob digest
- kind and source identity
- capture time
- later: actor, cycle, transformation, classification and expiry
```

Identical bytes are stored once and may support many contextual occurrences. Registered evidence can be re-read and re-hashed.

Remaining work includes content-level secret detection, source/claim provenance, retention and deletion semantics, private-data enforcement and signed attestations.

## Repository and product understanding

Inspection must grow from code inventory into a unified project model:

- Git state, manifests, languages, source and tests;
- CI and verification commands;
- architecture and trust boundaries;
- product brief, roadmap, decisions and experiments;
- user journeys, analytics, support and research where authorized;
- deployment environments and operational state;
- evidence coverage and blind spots.

Current implementation covers repository structure and structural trust boundaries. Product/user/operational understanding is planned through research and governed connected sources.

## Current execution boundary

Discovered package scripts currently run:

- without a shell;
- in a temporary source copy;
- with timeout and bounded output;
- with a reduced environment and common secret redaction;
- without dependency installation.

Current limitations:

- network isolation is not enforced;
- filesystem writes outside the temporary workspace are not contained;
- process containment is incomplete;
- host `node_modules` may be linked.

This is a temporary-workspace runner, not a security sandbox. Untrusted execution requires a backend advertising:

```text
filesystemContainment
processContainment
dependencyIsolation
secretIsolation
networkPolicy
resourceLimits
```

Missing required capability must fail closed.

## Readiness model

Shipkit must distinguish:

- `researchReadiness`;
- `executionReadiness`;
- `verificationReadiness`;
- `releaseReadiness`;
- `measurementReadiness`;
- `autonomyCeiling`;
- `evidenceConfidence`.

Being ready for research does not imply execution or release safety.

## Integrated cycle stages

```text
created → observed → modeled → diagnosed → researched → decided
→ planned → executing → implemented → verified → measured → learned
→ meta-improved → completed
```

Terminal alternatives are `rejected`, `rolled-back` and `inconclusive`. A cycle may complete without claiming meta-improvement.

Each stage is a product integration point:

| Stage | Primary modules |
| --- | --- |
| created | workspace, objective and policy |
| observed/modelled | kernel, repository understanding and evidence |
| diagnosed/researched | research intelligence and product discovery |
| decided/planned | workspace approval, opportunity and experiment planning |
| executing/implemented | sandbox, agents and change delivery |
| verified | independent verification and provenance |
| measured | analytics, user research and operational outcomes |
| learned/meta-improved | learning registry and paired evaluation |

## Integration contracts

Every module must exchange typed records rather than free-form narrative only:

- workspace → `ObjectiveRecord`, `ProductBrief`, approval request;
- inspection → `ProjectSnapshot`, readiness model;
- research → `ResearchBrief`, `SourceRecord`, `ClaimRecord`, `OpportunityRecord`;
- decision → `DecisionRecord`, `ExperimentRecord`, parameter digest;
- execution → `ExecutionAttempt`, change and rollback artifacts;
- verification → `VerificationRecord`, reviewer verdict and attestation;
- release → `ReleaseRecord`, environment and rollback reference;
- measurement → `OutcomeRecord` and comparison;
- learning → `MemoryRecord`, `SkillRecord`, promotion/retirement decision.

## Current safe autonomy

- A0: inspect and display evidence;
- A1: bounded research, planning, checks and record creation;
- A2: autonomous research and decision preparation within approved data scopes;
- A3: bounded code modification and draft PR after sandbox prerequisites;
- A4: protected release, deploy, production, secret and spending actions only with exact approval.

The current arbitrary-repository ceiling is A2. This is a temporary implementation limit, not the final product boundary.

## Hard invariants

- Shipkit is one product; packages may not create conflicting product identities;
- every accepted state change is attributable and replayable;
- policy decisions are deterministic for the same inputs;
- approvals match exact cycle, action, scope and parameters;
- source content is data, not instruction;
- models and agents cannot accept their own output;
- research, implementation, verification and release remain separable roles;
- no implicit merge, deployment, spending, secret access or production mutation;
- contradictions and rejected candidates remain inspectable;
- module integration uses the shared cycle and evidence model;
- learning promotion requires later consumption and measured benefit;
- documentation distinguishes implemented, integrated, planned and experimentally proven capability.
# Evolution Engine build roadmap

Status: active  
Issue: #9  
Primary product definition: [`../../IDEA.md`](../../IDEA.md)

This roadmap separates the long-term product thesis from the next proof. The current implementation reaches repository assessment (`created → observed → modeled`). It does not yet complete the A2 Research Audit or autonomous product R&D promise.

## Gate 0 — product coherence and research foundation

### Completed

- [x] establish Evolution Engine as the primary Shipkit product;
- [x] define the Starter Kit as a dogfood/reference product rather than the roadmap owner;
- [x] make root `IDEA.md` the product source of truth;
- [x] preserve a separate generated-project idea template;
- [x] maintain a living primary-source and implementation map;
- [x] compare workflow, coding-agent, sandbox, protocol, policy, provenance, observability, benchmark, research-agent, product-discovery and learning systems through one framework;
- [x] record adopt/adapt/integrate/defer/reject decisions and falsification tests;
- [x] define research as a first-class product capability in `RESEARCH_CAPABILITY.md`.

### Remaining

- [ ] pin a reviewed tag, release, commit, paper or specification version before each external integration begins;
- [ ] convert material architecture decisions into versioned ADRs when implementation starts;
- [ ] validate the beachhead user and A2 Research Audit problem with real developers;
- [ ] keep README, package metadata, capability registry, project model and issue/PR descriptions synchronized.

Exit: one coherent product identity, one beachhead user, one MVP definition and inspectable research decisions. A named project or method without a source, limitation, decision and falsifiable test does not satisfy this gate.

## Gate 1 — deterministic kernel safety

### Completed foundation

- [x] state machine and immutable transitions;
- [x] A0–A4 autonomy and R0–R4 risk decisions;
- [x] protected actions and exact cycle/scope approval matching;
- [x] approval ID, policy version, expiry and revocation state;
- [x] atomic JSON snapshot and synchronized append-only journal;
- [x] recovery from missing/corrupt snapshot and interrupted trailing write;
- [x] per-cycle writer lock, competing-writer serialization and stale-writer rejection;
- [x] checksum-based accidental corruption detection;
- [x] local CLI for init, start, inspect, assess, status, show/resume and evidence-backed advance;
- [x] compiled CLI dogfood on Shipkit in CI.

### Remaining safety proof

- [ ] explicit event-schema migration fixtures across released versions;
- [ ] kill-process integration tests around journal append, file sync, snapshot write, rename and directory sync;
- [ ] multi-process persistence stress tests across supported operating systems;
- [ ] lock-lease recovery tests after forced process termination;
- [ ] define the boundary between corruption detection and signed cryptographic provenance;
- [ ] independent persistence and policy review.

Exit: committed state survives crashes and competing processes without duplicate accepted transitions. A3/A4 remains experimental until the remaining safety proof is complete.

## Gate 2 — repository perception, evidence and execution boundary

### Completed foundation

- [x] portable bounded project scanner;
- [x] package manager, manifest, language, source, test, docs, CI and product-signal discovery;
- [x] structural trust-boundary discovery for auth, database, deployment, secrets and payments;
- [x] SHA-256 content-addressed evidence blobs;
- [x] distinct evidence occurrences for contextual kind/source/capture metadata;
- [x] read-time digest and byte-length verification;
- [x] secret-path, outside-root, symlink, size and truncation tests;
- [x] discovered package-script execution without a shell;
- [x] timeout, output bounds, reduced environment and common secret sanitization;
- [x] scorecard with separate research, execution and verification readiness;
- [x] explicit A2 autonomy ceiling for the current read-only product surface;
- [x] proof on Shipkit and a pinned unrelated repository.

### Remaining containment work

- [ ] stable execution-backend contract;
- [ ] explicit capability negotiation for filesystem, process, dependency, secret and network containment;
- [ ] fail closed when requested isolation is unavailable;
- [ ] eliminate host `node_modules` links for untrusted execution;
- [ ] adversarial fixtures for host writes, secret inheritance, symlinks, process trees, output floods, timeout and egress;
- [ ] content-level secret detection and data-retention policy;
- [ ] independent sandbox/security review.

Exit: repository inspection remains portable; untrusted script execution occurs only in a backend that proves the requested containment. Until then, checks are described as **temporary-workspace checks**, not isolated or sandboxed checks.

## Gate 3 — A2 Research Audit MVP

First usable product:

```text
inspect → assess → decision brief → bounded research
→ atomic claims → contradiction review → 3 opportunities
→ transparent ranking → smallest reversible experiment
```

The MVP does not modify product code.

### 3A — minimum durable records

- [ ] `ResearchBrief`: decision owner, deadline, assumptions, constraints, evidence thresholds and protected outcomes;
- [ ] `ResearchPlan`: questions, dependencies, coverage map, source strategy, budget, checkpoints and stopping rules;
- [ ] `QueryRecord`: exact query, aliases, filters, parent query, rationale, tool and result identifiers;
- [ ] `SourceRecord`: canonical identity, version, publisher, access date, license, source class, digest, authority, freshness and applicability;
- [ ] `ClaimRecord`: atomic claim, evidence spans, claim type, confidence, uncertainty, expiry and supporting/contradicting sources;
- [ ] `ContradictionRecord`: conflicting claims, suspected cause, affected decision and resolution state;
- [ ] `OpportunityRecord`: problem, evidence, alternatives, expected outcome, risk, cost, uncertainty, ranking rationale and smallest experiment.

### 3B — single-worker research baseline

- [ ] transform vague objectives into decision-changing questions before searching;
- [ ] decompose questions into breadth-first and depth-first branches;
- [ ] route public, private and repository questions to appropriate sources;
- [ ] preserve query reformulation and citation-chasing history;
- [ ] search for failures, limitations, postmortems and falsifying evidence;
- [ ] score source authority, directness, freshness, applicability, independence and conflict of interest;
- [ ] enforce time, token, search, document and monetary budgets;
- [ ] stop on evidence threshold, diminishing returns, experiment superiority, exhausted budget or explicit inconclusive result.

### 3C — evidence review and synthesis

- [ ] reconstruct reports from atomic claims rather than narrative-only output;
- [ ] preserve contradictory evidence instead of silently choosing a preferred source;
- [ ] detect circular sourcing, citation laundering, stale versions and claims beyond evidence;
- [ ] run a separate reviewer for material claims and calculations;
- [ ] produce at least three distinct opportunities;
- [ ] keep evidence strength, expected value, strategic fit, urgency, cost, risk and learning value separately inspectable;
- [ ] recommend the smallest reversible experiment when it has more information value than further desk research.

### 3D — product discovery and real-user proof

- [ ] convert feature requests into problem and behaviour questions;
- [ ] gather recent observed behaviour from users, non-users, churned users and constrained users;
- [ ] triangulate interviews with issues, support, analytics, search logs, sales or workflow observation where available;
- [ ] validate the problem before expensive solution implementation;
- [ ] test the A2 Audit with real developers on Shipkit and at least one unrelated product;
- [ ] measure whether recommendations changed, confirmed or prevented a development decision;
- [ ] measure repeat use across later cycles.

### 3E — evaluation

- [ ] retrieval correctness and coverage under bounded budgets;
- [ ] citation precision and completeness;
- [ ] source quality and freshness accuracy;
- [ ] contradiction recall and unsupported-claim rate;
- [ ] human-review agreement and uncertainty communication;
- [ ] opportunity diversity and recommendation survival after experiments;
- [ ] time to decision-changing evidence, cost and implementation waste avoided;
- [ ] compare against a deterministic workflow and one human-assisted baseline.

### Deferred until the MVP proves value

- parallel research workers;
- research-skill promotion;
- automated domain research packs;
- broad authenticated-source ingestion;
- multi-agent research orchestration.

Parallel work is added only after it beats the single-worker baseline on a suitable task after cost and coordination failures are counted.

Exit: two unrelated products produce inspectable plans, reproducible search trajectories, verified claims, visible contradictions, user-grounded problems, three opportunities and a defensible experiment choice. At least one real user confirms decision value.

## Gate 4 — bounded A3 execution

Only after Gate 3 demonstrates value:

- [ ] stable agent adapter contract;
- [ ] generic command adapter as the minimal baseline;
- [ ] one coding-agent adapter;
- [ ] dedicated sandbox backend and capability negotiation;
- [ ] isolated branch delivery;
- [ ] draft PR only;
- [ ] independent technical verification and rollback plan;
- [ ] compare success, cost, duration, safety and portability against the minimal command baseline.

Exit: one scoped task can be implemented through two interchangeable clients without either client owning cycle state, policy or evidence acceptance. No automatic merge or deploy.

## Gate 5 — interoperability and portable trust

- [ ] MCP tools/resources over kernel operations;
- [ ] reusable GitHub Action and draft-PR scorecard;
- [ ] optional OpenTelemetry-compatible traces and metrics;
- [ ] in-toto-compatible cycle attestation;
- [ ] policy packs only when they demonstrate value over the local policy module;
- [ ] independent verifier for evidence and attestation claims.

Exit: different clients consume the same persisted cycle and portable claims are independently inspectable.

## Gate 6 — product outcome measurement

- [ ] technical, UX, adoption, retention, conversion, cost and uncertainty evaluators;
- [ ] experiment exposure and comparison contracts;
- [ ] keep, iterate, reject and rollback decision records;
- [ ] separate product-value evidence from code-quality evidence.

Exit: a technically passing change can be rejected when user or product evidence does not support it.

## Gate 7 — measured learning

- [ ] memory and skill registry with provenance, applicability, risk and expiry;
- [ ] record actual later-cycle consumption;
- [ ] paired comparable cycles with and without each proposed learning;
- [ ] success, regression, cost, duration and uncertainty reports;
- [ ] retire harmful, stale or over-specialized learning;
- [ ] permit no positive-recursion claim before causal later-cycle evidence.

Exit: at least one controlled process change improves a later comparable cycle without unacceptable protected-metric regression.

## Product metrics

- setup to first inspected model;
- committed-cycle recovery without state loss;
- false-allow and false-block rates;
- research coverage, citation quality and contradiction recall;
- percentage of recommendations surviving experiments;
- implementation waste avoided;
- cost and duration per verified decision or improvement;
- repeated use by the same developer;
- measured lift or harm from promoted learning.

## Distribution only after core proof

- standalone CLI package;
- reusable GitHub Action;
- MCP server;
- local dashboard;
- hosted history/policy/benchmark service only after local-first value is proven.

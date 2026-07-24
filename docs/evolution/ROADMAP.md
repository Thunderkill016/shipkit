# CycleWarden integrated product build roadmap

Status: active  
Issue: #9  
Product definition: [`../../IDEA.md`](../../IDEA.md)

CycleWarden is one product. This roadmap sequences implementation by dependency and safety while retaining the full destination: workspace, application foundation, evolution kernel, research, execution, sandbox, verification, release, deployment, measurement, learning and interoperability.

The current implementation reaches reviewed repository and explicit-public-source research decisions with typed execution handoffs (`created → observed → modeled → diagnosed → researched → decided → planned`) and includes an application foundation. It does not yet provide broad web discovery, direct user evidence, sandboxed implementation, release, measurement or learning in one complete user-visible cycle.

## Roadmap rules

1. No module is downgraded to a separate or disposable product.
2. Every module must have a typed input/output contract with the shared cycle.
3. A module is “implemented” when its local behavior works; “integrated” only when the unified workflow consumes it.
4. Safety prerequisites determine activation order, not product ownership.
5. Every external integration requires a pinned source/version, license review, decision and falsification test.
6. Every milestone must preserve honest boundaries and measurable acceptance criteria.

## Workstream A — product workspace and application foundation

### Implemented foundation

- [x] Next.js application surface;
- [x] localized landing, login and protected workspace;
- [x] Supabase and Better Auth adapter paths;
- [x] portable PostgreSQL setup and user isolation tests;
- [x] shared security, database, mail, storage and payment packages;
- [x] Vercel and Docker delivery recipes;
- [x] project generator and AI engineering workflow;
- [x] demo and portable PostgreSQL browser E2E;
- [x] read-only evolution cycle, research run, review, opportunity, experiment and handoff views backed by official CLI state.

### Required integration

- [ ] unified navigation for project, cycles, research, opportunities, executions, verification, releases, outcomes and learning;
- [ ] product objective, brief, roadmap and experiment editing;
- [ ] repository attach/create onboarding;
- [ ] human approval and risk-review surfaces;
- [ ] claim evidence spans, full source details, contradiction and uncertainty inspection;
- [ ] agent execution timeline and cost view;
- [ ] verification, release and rollback views;
- [ ] product metrics and learning history;
- [ ] organization/team roles after the solo workflow is proven;
- [ ] ensure generated projects retain their own product identity while connecting to CycleWarden tooling.

Exit: a user can operate each integrated milestone from one coherent CycleWarden workspace rather than assembling CLI outputs manually.

## Workstream B — deterministic evolution kernel

### Implemented foundation

- [x] state machine and immutable transitions;
- [x] terminal rejected, rolled-back and inconclusive outcomes;
- [x] A0–A4 autonomy and R0–R4 risk decisions;
- [x] exact cycle/action/resource-scope approvals;
- [x] approval IDs, policy versions, expiry and revocation state;
- [x] synchronized append-only journal and atomic snapshot;
- [x] corrupt/stale snapshot and interrupted trailing-write recovery;
- [x] per-cycle owner-token lock and stale-writer rejection;
- [x] content-addressed evidence blobs and distinct occurrences;
- [x] read-time digest verification;
- [x] local CLI and CI dogfood.

### Required hardening

- [ ] explicit cycle/store schema migration chain;
- [ ] fixtures for every released format;
- [ ] kill-process tests at every persistence boundary;
- [ ] multi-process writer and stale-lock stress tests;
- [ ] parameter digests on protected approvals;
- [ ] policy decision records and explanation schema;
- [ ] content-level secret detection;
- [ ] enforceable retention, deletion and dependent-claim invalidation;
- [ ] independently buildable and versioned core package;
- [ ] supported Node/OS compatibility matrix;
- [ ] independent persistence, policy and API review.

Exit: every later module can rely on durable, versioned, crash-safe and reviewable shared state.

## Workstream C — project and product understanding

### Implemented repository understanding

- [x] bounded inventory and truncation reporting;
- [x] Git, package manager, manifest and language discovery;
- [x] source, tests, documentation and CI discovery;
- [x] package-script check discovery;
- [x] structural auth, database, deployment, secret and payment boundaries;
- [x] temporary-workspace checks with timeout, output bounds and reduced environment;
- [x] separate research, execution and verification readiness;
- [x] proof on CycleWarden and a pinned unrelated repository;
- [x] deterministic repository model consumed by the research decision flow.

### Required product understanding

- [ ] typed `ProductBrief` and `ObjectiveRecord`;
- [ ] architecture/component and user-journey models;
- [ ] environment and deployment inventory;
- [ ] decision, experiment and incident history ingestion;
- [ ] authorized analytics, support and user-research signals;
- [ ] code-to-product-feature and feature-to-outcome mapping;
- [ ] blind-spot and evidence-coverage reports beyond the repository baseline;
- [ ] readiness dimensions for release and measurement.

Exit: CycleWarden understands both the codebase and the product context required to make responsible decisions.

## Workstream D — research intelligence

### D1 — decision framing

- [x] typed `ResearchBrief` with owner, deadline, assumptions, constraints, evidence thresholds and protected outcomes;
- [x] typed `ResearchPlan` with questions, coverage, source strategy, budgets and stopping rules;
- [x] deterministic conversion of a modeled repository objective into decision-changing repository questions;
- [ ] dependency-aware plans and checkpoints for adaptive external research;
- [ ] workspace authoring/review for high-risk or high-cost plans.

### D2 — modern retrieval

- [x] repository/internal evidence adapter using fresh snapshot, checks and scorecard;
- [x] manifest-driven public HTTP adapter for explicit URLs;
- [x] HTTP(S), standard-port, credential, DNS and redirect validation before public retrieval;
- [x] bounded sequential retrieval by source count, query count, time, response size and zero provider cost;
- [x] HTML/text/Markdown/JSON normalization into immutable evidence;
- [x] direct hostile-instruction screening with source quarantine and fail-closed outcome;
- [x] reproducible `QueryRecord` with exact query, rationale, tool and result references;
- [x] authority, directness, freshness, applicability, independence, conflict and limitation scoring;
- [ ] public search discovery and ranking beyond an explicit URL manifest;
- [ ] paper/PDF, specification-specific, competitor, changelog, incident and dataset adapters;
- [ ] authorized private-source adapters under data governance;
- [ ] adaptive reformulation, citation chasing, entity resolution and multilingual/domain search;
- [ ] negative, failure, postmortem and falsification search over external sources;
- [ ] browser rendering and stronger prompt-injection/hostile-source defenses;
- [ ] DNS pinning or network-sandbox enforcement for source retrieval.

### D3 — claims and contradictions

- [x] typed `SourceRecord`, `ClaimRecord` and `ContradictionRecord`;
- [x] typed `CitationSpanRecord` linked to claim and source IDs;
- [x] normalized-text quote, occurrence, offsets, quote digest, source-content digest and transformation version;
- [x] confidence, uncertainty and expiry fields;
- [x] preserve disagreement instead of silently selecting a favored answer;
- [x] prevent repository-only or public-page evidence from being mislabeled as direct user research;
- [x] require every repository research claim to resolve to persisted supporting sources;
- [x] require every public-source claim to have exact verified supporting text before decision acceptance;
- [ ] original DOM/PDF locators and richer transformation/calculation provenance;
- [ ] richer observation/interpretation/estimate/calculation/recommendation claim taxonomy;
- [ ] source circularity, citation laundering and stale-version detection.

### D4 — product discovery

- [x] repository research explicitly records that repository evidence cannot prove user demand;
- [x] public HTTP ingestion rejects `user-research` source classification;
- [x] opportunity portfolio includes direct user research as a distinct reversible experiment when it is the largest evidence gap;
- [ ] typed user-research records and consent boundaries;
- [ ] observed recent behavior rather than hypothetical preference only;
- [ ] interviews, workflow observation, support, analytics, churn, non-user, sales and accessibility evidence;
- [ ] reach, frequency, severity, strategic fit and constraints;
- [ ] problem validation before expensive implementation.

### D5 — synthesis and review

- [x] distinct deterministic reviewer actor required for repository and public-source research;
- [x] reviewer checks budget, source support, user-evidence boundary, contradiction visibility, opportunity portfolio, rejected alternatives, scope separation and stop reason;
- [x] public-source reviewer checks source safety, citation integrity, source strength and canonical-source duplication;
- [x] verified/unverified citation-span IDs and quarantined source IDs remain inspectable;
- [x] at least three distinct opportunities;
- [x] expected outcome, evidence, cost, risk, uncertainty, reversibility and learning value remain inspectable;
- [x] typed `DecisionRecord`, `ExperimentRecord`, `ResearchRunRecord` and `ResearchEvaluationRecord`;
- [x] explicit stop reason and durable automated `inconclusive` result;
- [x] persisted handoff to planning/execution;
- [ ] calculation verification, alternative causal explanations and full report reconstruction;
- [ ] broader citation precision/completeness benchmarks across discovered external sources.

### D6 — research orchestration and evaluation

- [x] deterministic single-worker repository baseline;
- [x] deterministic single-worker explicit-public-source baseline;
- [x] durable query/source/time/cost usage and coverage gaps;
- [x] CycleWarden repository dogfood run with journal reload and passing independent review;
- [x] tests for insufficient budget, reviewer separation and unsupported user claims;
- [x] tests for private-network destinations, unsafe redirects, hostile source content and missing exact quotes;
- [x] public research CLI journal reload retains runs, evaluation and citation spans;
- [ ] bounded parallel research for genuinely independent branches;
- [ ] compare manifest, search, single-worker, multi-worker and human-assisted configurations;
- [ ] autonomous external research proof on CycleWarden and an unrelated real product using pinned live sources;
- [ ] retrieval correctness, external citation precision/completeness and contradiction recall benchmarks;
- [ ] decision usefulness, recommendation survival, avoided waste, cost and latency across real users;
- [ ] research skill registry only after baseline evidence exists.

Exit: CycleWarden produces reproducible, reviewable product decisions and a typed experiment ready for governed implementation.

## Workstream E — execution and sandbox

### E1 — backend contract

- [ ] `ExecutionBackend` interface;
- [ ] capabilities for filesystem, process, dependency, secret, network and resources;
- [ ] trusted-local backend named honestly;
- [ ] container or remote sandbox backend;
- [ ] fail closed when requested capability is absent;
- [ ] cleanup and diagnostic contracts.

### E2 — adversarial containment

- [ ] host-write and forbidden-path fixtures;
- [ ] secret/environment leakage fixtures;
- [ ] symlink, mount and workspace escape tests;
- [ ] process tree, child process and resource exhaustion bounds;
- [ ] timeout, output and cleanup tests;
- [ ] blocked and allowed egress tests;
- [ ] untrusted dependency and lifecycle-script tests;
- [ ] independent security review.

### E3 — agent adapters

- [ ] generic command adapter baseline;
- [ ] Codex CLI adapter;
- [ ] OpenHands adapter;
- [ ] Claude Code, Grok or other adapters through the same contract where available;
- [ ] browser/tool activity adapter;
- [ ] optional MCP client/tool bridge;
- [ ] consistent cost, duration, retry and artifact records;
- [ ] compare success and safety across agents/models/environments.

### E4 — governed change delivery

- [ ] isolated branch/worktree;
- [ ] bind execution to approved plan and parameter digest;
- [ ] change manifest and generated evidence;
- [ ] rollback plan before mutation;
- [ ] draft PR creation;
- [ ] no implicit merge or deployment;
- [ ] progress and intervention controls in the workspace.

Exit: interchangeable agents can implement the selected experiment in containment while the kernel owns authorization and state.

## Workstream F — verification and portable trust

- [ ] independent verifier boundary distinct from implementer;
- [ ] project-specific test, lint, type, build, security and policy packs;
- [ ] regression and adversarial verification;
- [ ] benchmark tasks pinned by repository, environment and harness;
- [ ] human review and dissent records;
- [ ] OpenTelemetry-compatible optional traces/metrics;
- [ ] in-toto/SLSA-compatible provenance and attestations;
- [ ] evidence substitution, tamper, expiry and unsupported-claim tests;
- [ ] GitHub Action and PR scorecard;
- [ ] portable verdict and unresolved-risk representation.

Exit: a change cannot claim acceptance only because its implementation agent reports success.

## Workstream G — delivery, release and operations

- [ ] release and deployment adapter contract;
- [ ] Vercel deployment integration;
- [ ] Docker/self-hosted deployment integration;
- [ ] database migration planning and verification;
- [ ] environment and configuration checks;
- [ ] exact approval for merge, release, deploy, production writes, secrets and spending;
- [ ] progressive release/canary support where applicable;
- [ ] environment-specific rollback;
- [ ] release evidence, incident and recovery records;
- [ ] deployment controls in the unified workspace.

Exit: verified work can be explicitly authorized, released, observed and rolled back through the same cycle.

## Workstream H — product outcome measurement

- [ ] experiment exposure and comparison contracts;
- [ ] technical reliability and performance evaluators;
- [ ] UX, activation, adoption, retention and conversion evaluators;
- [ ] support, qualitative research and accessibility outcomes;
- [ ] cost and operational burden;
- [ ] guardrail/protected metrics;
- [ ] keep, iterate, reject and rollback decision records;
- [ ] separate code-quality evidence from product-value evidence;
- [ ] outcome views linked to the original objective, research, decision and release.

Exit: technically passing work may still be rejected or rolled back when product evidence does not support it.

## Workstream I — learning and controlled improvement

- [ ] memory and skill registry with provenance, scope, applicability, risk and expiry;
- [ ] research, planning, implementation, verification and release skill types;
- [ ] actual later-cycle consumption tracking;
- [ ] comparable cycles with and without proposed learning;
- [ ] success, regression, cost, duration and uncertainty reports;
- [ ] promotion only after measured benefit;
- [ ] retirement of stale, harmful or over-specialized learning;
- [ ] meta-change review and rollback;
- [ ] no positive-recursion claim without causal later-cycle evidence.

Exit: at least one accepted learning improves a later comparable end-to-end product cycle without unacceptable regression.

## Workstream J — interoperability and distribution

- [ ] standalone versioned CLI and libraries;
- [ ] reusable GitHub Action;
- [ ] MCP server over kernel, research and evidence operations;
- [ ] A2A support when independent agent systems need coordination;
- [ ] local unified dashboard/workspace;
- [ ] self-hosted team deployment;
- [ ] hosted history, policy, benchmarks and collaboration;
- [ ] organization roles, approvals and audit logs;
- [ ] import/export of cycles, evidence and attestations;
- [ ] extension packs for agents, sandboxes, research sources, verification and deployment.

Exit: local, repository and hosted surfaces present the same CycleWarden product and lifecycle.

## Integrated milestones

### Milestone 0 — identity and contracts

- [x] one unified product definition;
- [x] update active documents and machine-readable metadata;
- [x] map module contracts and ownership;
- [x] define integrated acceptance language.

### Milestone 1 — durable product understanding

Kernel hardening + workspace onboarding + repository/product model.

### Milestone 2 — research-to-decision

Repository objective → bounded repository research or explicit-public-source capture → exact citation review → experiment → execution handoff. Search discovery and direct user-research expansion remain open.

### Milestone 3 — decision-to-change

Approved experiment → sandboxed agents → draft PR → independent verification.

### Milestone 4 — change-to-outcome

Verified change → authorized release → measurement → keep/iterate/rollback.

### Milestone 5 — continuous evolution

Outcome → measured learning → improved later complete cycle.

Each milestone is a vertical integration of the final product, not a separate product launch.

## Full-product acceptance

CycleWarden reaches its intended v1 only when:

- one product workspace operates the complete lifecycle;
- a project can be created or attached;
- research selects a defensible experiment using repository, external and direct user evidence as applicable;
- at least two interchangeable agents can implement it in a real sandbox;
- independent verification can accept or reject it;
- release/deployment requires exact approval;
- technical and product outcomes are measured;
- rollback is exercised;
- later learning is causally evaluated;
- the complete cycle is proven on CycleWarden and unrelated real products.

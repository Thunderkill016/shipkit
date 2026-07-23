# Evolution Engine build roadmap

Status: active  
Issue: #9

## Phase 0 — research map and invariants

- [x] maintain a living primary-source and implementation map;
- [x] record architectural extracts, contradictions, licenses, and rejected patterns;
- [x] define kernel invariants before adding agent integrations;
- [x] compare durable workflow, coding-agent, sandbox, protocol, policy, provenance,
  observability, benchmark, research-agent, product-discovery, and learning systems through one
  common framework;
- [x] record explicit adopt/adapt/integrate/defer/reject decisions and falsification tests;
- [x] define research as a first-class product capability in `RESEARCH_CAPABILITY.md`;
- [ ] pin a reviewed tag, release, commit, paper, or specification version for every dependency,
  research method, benchmark, or integration candidate before implementation begins;
- [ ] convert material comparison and research-architecture decisions into versioned ADRs as their
  implementation starts.

Exit: product thesis, architecture, threat model, benchmark strategy,
`COMPARATIVE_ANALYSIS.md`, and `RESEARCH_CAPABILITY.md` are reviewable and linked to implementation
decisions. A project or research method named without a source, decision, limitation, and
falsifiable test does not satisfy this phase.

## Phase 1 — deterministic kernel

- [x] state machine and immutable transitions;
- [x] A0–A4/R0–R4 policy decisions;
- [x] scoped approvals and protected actions;
- [x] atomic JSON snapshot and append-only journal;
- [x] recovery from missing/corrupt snapshot and interrupted trailing write;
- [x] stale-writer rejection and checksum tamper detection;
- [x] local CLI for init, start, status, show/resume, inspect, assess, and evidence-backed advance;
- [x] compiled CLI dogfood on Shipkit in CI;
- [ ] explicit event-schema migration fixtures across released versions;
- [ ] kill-process integration test around every persistence boundary.

Exit: a full cycle can stop/restart and complete without any LLM.

## Phase 2 — repository perception and evidence

- [x] portable bounded project scanner;
- [x] package manager, manifest, language, source, test, docs, CI, and product-signal discovery;
- [x] structural trust-boundary discovery for auth, database, deployment, secrets, and payments;
- [x] content-addressed JSON/file evidence registry with SHA-256;
- [x] secret-path, outside-root, symlink, size, truncation, and tamper safety tests;
- [x] check command discovery from project manifests;
- [x] bounded configurable check runner with timeout, output limits, and secret sanitization;
- [x] evidence-backed project model and human-readable readiness scorecard;
- [x] prove inspection and assessment on a pinned unrelated real repository;
- [ ] enforce network isolation and filesystem write containment for untrusted repositories;
- [ ] define dependency isolation that does not link host `node_modules` into the check workspace.

Exit: an A2 audit works on Shipkit and a pinned unrelated repository. Execution of
untrusted repository scripts still requires an external sandbox until the remaining
isolation controls are implemented.

## Phase 3 — research capability and opportunity intelligence

### 3A — decision framing and research planning

- [ ] typed `ResearchBrief` with decision owner, deadline, assumptions, constraints, evidence
  thresholds, protected outcomes, and information value;
- [ ] typed `ResearchPlan` with question decomposition, dependency graph, coverage map, source
  strategy, budgets, checkpoints, and explicit stop conditions;
- [ ] transform vague objectives into decision-changing questions before any broad search begins;
- [ ] distinguish breadth-first branches that can run in parallel from depth-first dependent work;
- [ ] human-review checkpoint for high-cost, high-risk, or poorly scoped research plans.

### 3B — modern search and retrieval skills

- [ ] internal evidence collectors for issues, CI, docs, decisions, support, analytics, sales and
  prior user research;
- [ ] external-source adapters for web, papers, repositories, specifications, competitors,
  changelogs, incidents, datasets and authenticated sources;
- [ ] reproducible `QueryRecord` ledger with aliases, synonyms, filters, parent queries, rationale,
  result identifiers, and query reformulation history;
- [ ] citation chasing, entity resolution, negative/falsification queries, failure/postmortem search,
  and multilingual/domain-specific search strategies;
- [ ] adaptive search loop: inspect evidence, measure coverage, identify gaps, revise strategy, and
  search again;
- [ ] source-type routing so private/internal questions are not incorrectly sent to public web tools;
- [ ] source quality scoring for authority, directness, freshness, applicability, independence,
  conflicts of interest and known limitations.

### 3C — product discovery research

- [ ] convert team opinions and feature requests into testable research questions and assumptions;
- [ ] typed `UserResearchRecord` with participant criteria, consent boundary, method, observed
  behaviour, notes, findings, limitations, and evidence links;
- [ ] ingest interviews, contextual observation, support tickets, search logs, analytics, churn,
  non-user, sales and accessibility evidence;
- [ ] validate the user problem before solution design and validate proposed solutions before
  expensive implementation;
- [ ] maintain an opportunity map connecting desired outcomes, user needs, problems, candidate
  solutions and experiments;
- [ ] separate observed behaviour from stated preference and separate loud feedback from reach,
  frequency, severity and strategic fit;
- [ ] continue user research through discovery, alpha, beta and live operation rather than treating
  it as a one-time phase.

### 3D — claims, provenance and contradiction

- [ ] typed `SourceRecord`, `ClaimRecord`, and `ContradictionRecord`;
- [ ] preserve source identity, version, author/publisher, access date, license, scope, integrity and
  evidence digest;
- [ ] record claim type: observation, interpretation, estimate, calculation or recommendation;
- [ ] bind every material claim to exact evidence locations and transformations;
- [ ] record freshness, applicability, confidence, uncertainty and expiry;
- [ ] triangulate official claims, code, independent reproduction, user evidence and product data;
- [ ] preserve contradictory evidence and explain disagreements instead of silently selecting the
  source that supports the current hypothesis;
- [ ] detect source circularity, citation laundering, stale versions and unsupported claim elevation.

### 3E — bounded orchestration and research safety

- [ ] single-worker research baseline with explicit time, token, search, document and monetary
  budgets;
- [ ] bounded parallel-worker plan with clear division of labour, output schemas, duplicate-work
  avoidance, stop conditions and escalation rules;
- [ ] scale effort to decision value and query complexity rather than spawning agents by default;
- [ ] prove parallel research improves coverage or latency enough to justify coordination and token
  costs over the single-worker baseline;
- [ ] treat web pages, repositories and documents as hostile inputs rather than executable
  instructions;
- [ ] browsing and code-execution isolation, prompt-injection resistance, privacy minimisation,
  connected-source authorization and protected credential boundaries;
- [ ] retain complete `ResearchRun` trajectories, failures, budgets and stop reasons.

### 3F — adversarial review and synthesis

- [ ] independent research reviewer that searches for contrary evidence, alternative explanations,
  missing populations, source bias, faulty calculations and claims beyond evidence;
- [ ] citation verification and unsupported-claim checks separate from report generation;
- [ ] opportunity/hypothesis portfolio rather than a single generated answer;
- [ ] require every opportunity to identify comparable external mechanisms, rejected alternatives,
  supporting and contradicting evidence, expected outcome, risk, reversibility and cost;
- [ ] evaluator-backed candidate ranking that keeps evidence strength, expected value, strategic fit,
  urgency, cost, risk and learning value separately inspectable;
- [ ] smallest decision-changing experiment selected when experimentation has higher information
  value than more desk research;
- [ ] explicit `inconclusive` result when evidence thresholds cannot be met.

### 3G — research evaluation and skill learning

- [ ] typed `ResearchEvaluation` covering correctness, coverage, citation precision/completeness,
  source quality, contradiction recall, freshness, decision usefulness, cost, latency and human
  review;
- [ ] retrieval benchmarks inspired by BrowseComp and DeepSearchQA;
- [ ] report/evidence benchmarks using atomic verifiable rubrics and per-claim citation checks;
- [ ] product-decision benchmark measuring problem validation, opportunity quality, experiment
  survival, avoided waste and product outcome rather than report prose alone;
- [ ] compare deterministic workflow, single researcher, bounded parallel researchers and
  human-assisted configurations;
- [ ] research-skill registry for query transformations, source maps, decomposition templates,
  failure patterns and domain research packs;
- [ ] promote a research skill only after later comparable runs consume it and demonstrate measured
  improvement; expire or retire stale and harmful skills.

Exit: for two unrelated products, the engine produces inspectable research plans, reproducible
search trajectories, verified atomic claims, visible contradictions, user-validated problems, and
at least three evidence-backed opportunities. A human can explain why the selected experiment
outranks alternatives, which sources and comparable systems informed it, what remains uncertain,
and why the research stopped. The bounded research architecture must beat its simpler baseline on
at least one relevant quality metric without unacceptable cost, latency, safety or reliability
regression.

## Phase 4 — execution adapters

- [ ] stable agent adapter contract;
- [ ] Codex/CLI subprocess adapter;
- [ ] OpenHands adapter;
- [ ] generic command adapter;
- [ ] sandbox capability negotiation;
- [ ] MCP tools/resources over kernel operations;
- [ ] compare every adapter against a minimal command baseline for success, cost, duration,
  safety, and portability.

Exit: the same persisted cycle is consumed by at least two agent clients, and added adapter
complexity demonstrates measurable value over the minimal baseline.

## Phase 5 — verification and attestations

- [ ] independent reviewer boundary;
- [ ] OpenTelemetry-compatible traces/metrics;
- [ ] in-toto-compatible cycle attestation;
- [ ] GitHub Action and draft-PR scorecard;
- [ ] policy packs for common repository classes.

Exit: claims are portable and independently inspectable.

## Phase 6 — product outcome measurement

- [ ] technical, UX, adoption, retention, conversion, cost, and uncertainty evaluators;
- [ ] experiment exposure and comparison contracts;
- [ ] keep/iterate/rollback decision records;
- [ ] separate product-value evidence from code-quality evidence.

Exit: a technically passing change can still be rejected when product evidence does not
support it.

## Phase 7 — learning foundry

- [ ] memory/skill registry with expiry and applicability metadata;
- [ ] record actual later-cycle consumption;
- [ ] paired with/without meta-change experiments;
- [ ] benchmark tasks pinned by repository/environment;
- [ ] cost, duration, success, regression, and uncertainty reports;
- [ ] retire harmful or stale memories automatically after evidence review.

Exit: at least one controlled meta-change improves later comparable cycles; only
then may Shipkit consider an E3 positive-recursive claim.

## Comparative benchmark program

- durability: kill every persistence boundary and verify deterministic recovery;
- portability: three unrelated repositories, multiple package managers, and at least two languages;
- execution: two agent adapters plus one minimal command baseline;
- containment: hostile filesystem, process, secret, output, timeout, egress and prompt-injection fixtures;
- policy: allow, deny, and approval cases across every autonomy/risk combination;
- evidence: tamper, substitution, contradiction, expiry and unsupported-claim cases;
- research retrieval: hard-to-find facts, exhaustive multi-step lists, query reformulation and
  coverage under bounded budgets;
- research reporting: atomic correctness, citation precision/completeness, source quality,
  contradiction recall and uncertainty communication;
- discovery: validated user problems, opportunity quality, experiment survival and avoided waste;
- outcome: technical checks and product/user evaluators reported separately;
- learning: comparable later cycles with and without each promoted memory, research skill or
  meta-change;
- economics: success, regressions, cost, duration, retries, tool calls and human interventions;
- explainability: durable artifacts alone explain research scope, selection, authorization,
  evidence, uncertainty and verdict.

## Product metrics

- time from install to first inspected project model;
- time from decision brief to first decision-changing evidence;
- research coverage and unsupported-claim rate;
- citation precision, completeness and primary-source ratio;
- contradiction discovery and unresolved-gap visibility;
- percentage of opportunities grounded in direct user evidence;
- percentage of research recommendations that survive experiments;
- implementation waste avoided through problem or solution invalidation;
- percentage of cycles resumed without state loss;
- invalid/unsafe action block rate and false-block rate;
- verified outcome rate by task/repository/agent/model;
- cost and duration per verified improvement;
- percentage of retained memories and research skills actually consumed later;
- measured lift or harm from each promoted meta-change;
- user ability to explain selection, authorization, evidence and verdict.

## Distribution after core proof

- standalone CLI package;
- reusable GitHub Action;
- MCP server;
- self-hosted local dashboard;
- hosted enterprise history/policy/benchmark service only after local-first value
  is proven.
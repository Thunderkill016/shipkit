# Evolution Engine build roadmap

Status: active  
Issue: #9

## Phase 0 — research map and invariants

- [x] maintain a living primary-source and implementation map;
- [x] record architectural extracts, contradictions, licenses, and rejected patterns;
- [x] define kernel invariants before adding agent integrations.

Exit: product thesis, architecture, threat model, and benchmark strategy are
reviewable and linked to implementation decisions.

## Phase 1 — deterministic kernel

- [x] state machine and immutable transitions;
- [x] A0–A4/R0–R4 policy decisions;
- [x] scoped approvals and protected actions;
- [x] atomic JSON snapshot and append-only journal;
- [x] recovery from missing/corrupt snapshot and interrupted trailing write;
- [x] stale-writer rejection and checksum tamper detection;
- [x] local CLI for init, start, status, show/resume, inspect, and evidence-backed advance;
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
- [ ] safe configurable check runner with timeout and sanitized output;
- [ ] human-readable project model and scorecard;
- [ ] prove the scanner on a second unrelated real repository.

Exit: A2 audit works on Shipkit and a second unrelated repository.

## Phase 3 — research and opportunity intelligence

- [ ] internal evidence collector for issues, CI, docs, decisions, analytics, and user signals;
- [ ] external-source adapter contract for web, papers, repositories, competitors, and user research;
- [ ] source freshness, applicability, contradiction, confidence, and expiry records;
- [ ] parallel research worker plan with bounded budgets and stop conditions;
- [ ] opportunity/hypothesis portfolio rather than a single generated answer;
- [ ] evaluator-backed candidate ranking and smallest decision-changing experiment.

Exit: the engine produces three evidence-backed development opportunities for two
unrelated products, and a human can explain why the selected experiment outranks the
alternatives.

## Phase 4 — execution adapters

- [ ] stable agent adapter contract;
- [ ] Codex/CLI subprocess adapter;
- [ ] OpenHands adapter;
- [ ] generic command adapter;
- [ ] sandbox capability negotiation;
- [ ] MCP tools/resources over kernel operations.

Exit: the same persisted cycle is consumed by at least two agent clients.

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

## Product metrics

- time from install to first inspected project model;
- percentage of cycles resumed without state loss;
- invalid/unsafe action block rate and false-block rate;
- verified outcome rate by task/repository/agent/model;
- cost and duration per verified improvement;
- percentage of retained memories actually consumed later;
- measured lift or harm from each promoted meta-change;
- user ability to explain selection, authorization, and verdict.

## Distribution after core proof

- standalone CLI package;
- reusable GitHub Action;
- MCP server;
- self-hosted local dashboard;
- hosted enterprise history/policy/benchmark service only after local-first value
  is proven.

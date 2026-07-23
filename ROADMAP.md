# Shipkit roadmap

> Primary product: **Shipkit Evolution Engine**  
> Detailed build plan: [`docs/evolution/ROADMAP.md`](./docs/evolution/ROADMAP.md)  
> Product source of truth: [`IDEA.md`](./IDEA.md)  
> Machine-readable capability evidence: [`docs/CAPABILITIES.json`](./docs/CAPABILITIES.json)

The repository contains two product surfaces with different roles:

1. **Evolution Engine** — the primary product and roadmap owner.
2. **Starter Kit** — a maintained dogfood/reference project used to test repository inspection, checks, product context, auth, database isolation and generated-project workflows.

Starter Kit feature expansion must not displace Evolution Engine proof work unless it repairs a reliability or security regression required by dogfood.

## Current verified foundation

- deterministic evolution state machine and legal transitions;
- A0–A4 autonomy and R0–R4 risk model;
- cycle-bound exact-scope approvals for protected actions;
- append-only journal, atomic snapshot recovery and serialized writers;
- content-addressed evidence blobs with distinct evidence occurrences;
- bounded repository inspection and trust-boundary discovery;
- temporary-workspace repository checks with timeout and output limits;
- evidence-backed readiness scorecard;
- compiled CLI dogfood on Shipkit and a pinned unrelated repository;
- Starter Kit demo and portable PostgreSQL E2E paths.

“Verified” means repository code and current CI evidence exist. It does not imply product-market fit, complete sandboxing, production deployment or positive recursive improvement.

## Gate 0 — product coherence

- [x] establish Evolution Engine as the primary product;
- [x] define Starter Kit as dogfood/reference infrastructure;
- [x] make root `IDEA.md` the Evolution Engine product source of truth;
- [x] preserve a separate generated-project idea template;
- [ ] align README, package metadata, capability registry and AI project model;
- [ ] validate the beachhead user and A2 Research Audit problem with real users.

## Gate 1 — kernel safety

- [x] exact cycle/scope matching for approvals;
- [x] approval expiry, revocation state and policy version fields;
- [x] serialized cycle writers with stale-writer rejection;
- [x] separate immutable evidence blobs from evidence occurrences;
- [x] evidence read-time digest verification;
- [ ] event-schema migration fixtures across released versions;
- [ ] kill-process integration tests at every journal/snapshot boundary;
- [ ] multi-process persistence stress test;
- [ ] dependency, filesystem, process and network isolation through a declared sandbox backend;
- [ ] independent persistence, security/policy and product/API reviews.

A3/A4 execution must remain experimental and unavailable for untrusted repositories until this gate is complete.

## Gate 2 — A2 Research Audit MVP

Build one narrow read-only vertical slice:

```text
inspect → assess → decision brief → bounded research
→ atomic claims → contradiction review → 3 opportunities
→ ranking → smallest reversible experiment
```

Required implementation:

- typed `ResearchBrief`, `ResearchPlan`, `QueryRecord`, `SourceRecord`, `ClaimRecord`, `ContradictionRecord` and `OpportunityRecord`;
- single-worker baseline before parallel research;
- reproducible query and source ledger;
- source quality, freshness, applicability and expiry;
- independent citation and adversarial review;
- explicit stop reason, cost and remaining uncertainty;
- proof on Shipkit and at least one unrelated product;
- evaluation by real users, not report prose alone.

## Gate 3 — bounded execution

Only after the A2 audit demonstrates decision value:

- sandbox capability interface and fail-closed negotiation;
- generic command adapter;
- one coding-agent adapter;
- isolated branch delivery and draft PR;
- independent verification and rollback plan;
- no automatic merge or deploy.

## Gate 4 — interoperability and portable trust

- MCP facade over the same kernel state;
- GitHub Action and PR scorecard;
- OpenTelemetry-compatible optional telemetry;
- portable in-toto-compatible attestations;
- policy packs only when they demonstrate value over the local deterministic policy module.

## Gate 5 — measured learning

- record actual later-cycle memory consumption;
- compare comparable cycles with and without each proposed skill or process change;
- promote only measured improvements;
- expire or retire stale and harmful learning;
- make no positive-recursion claim before causal later-cycle evidence exists.

## Product metrics

- time to first inspected project model;
- percentage of committed cycles recovered without state loss;
- false-allow and false-block rates for policy decisions;
- citation correctness, contradiction recall and research coverage;
- percentage of recommendations that survive experiments;
- implementation waste avoided;
- cost and duration per verified decision or improvement;
- repeat use by the same developer across multiple cycles.

## Operating principles

1. One coherent product before multiple identities.
2. One valuable vertical slice before broad infrastructure.
3. Exact evidence and authorization before autonomy.
4. A temporary workspace is not a security sandbox.
5. Passing checks is not proof of user value.
6. Simpler baselines must be beaten before adding agent complexity.
7. Active documentation may not claim more than code, CI and user evidence prove.

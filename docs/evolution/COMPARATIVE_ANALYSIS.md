# CycleWarden Evolution Engine — comprehensive comparative analysis

Status: active decision record  
Issue: #9  
Reviewed: 2026-07-23

Current revisions, review expiry, limitations, contradictions and falsification
tests are enforced in
[`EXTERNAL_SYSTEMS.json`](./EXTERNAL_SYSTEMS.json). The narrative below preserves
the broader architecture baseline; the machine registry and
[`../CAPABILITIES.json`](../CAPABILITIES.json) take precedence for current
external revisions and implemented CycleWarden status.

## Purpose

This document prevents architecture-by-name-dropping. Every external system is evaluated
against the same dimensions, produces an explicit `adopt`, `adapt`, `integrate`, `defer`, or
`reject` decision, and names the evidence required to validate that decision in CycleWarden.

The comparison covers adjacent systems as well as direct coding-agent projects because
Evolution Engine spans durable workflow, agent execution, sandboxing, policy, evidence,
interoperability, evaluation, and learning. No single compared project owns that full scope.

## Method

For each system:

1. use primary documentation, specifications, papers, and official repositories;
2. record the source, license where applicable, and review date;
3. compare the same architectural dimensions;
4. separate useful mechanisms from product positioning;
5. state what CycleWarden adopts, adapts, integrates, defers, or rejects;
6. define a test or benchmark that can falsify the CycleWarden decision;
7. pin a release, tag, commit, or specification version before implementing an integration;
8. revisit the decision when a source changes materially or evidence contradicts it.

A comparison is not considered complete merely because a project is named or summarized.
The current entries are the architecture baseline; integration work remains blocked until its
specific source revision and ADR are pinned.

## Comparison dimensions

- primary problem and unit of work;
- deterministic versus nondeterministic responsibilities;
- durable state, replay, recovery, and migration;
- agent/model neutrality;
- workspace and network isolation;
- authorization, approvals, and enforcement;
- evidence, provenance, and claims;
- human checkpoints and explainability;
- interoperability and protocol surface;
- technical and product-outcome evaluation;
- memory, learning, and meta-improvement;
- operating model, deployment burden, and license;
- fit, overlap, and unresolved gap relative to CycleWarden.

## Landscape summary

| System | Primary scope | Strongest reusable mechanism | Missing relative to CycleWarden | Decision |
| --- | --- | --- | --- | --- |
| Temporal | durable distributed execution | replayable event history and crash recovery | repository/product semantics, agent policy, outcome learning | Adapt |
| LangGraph | stateful agent orchestration | checkpoints, interrupts, human-in-the-loop | independent evidence and product-governance lifecycle | Adapt |
| Microsoft Agent Framework | agents and graph workflows | provider adapters, executors, workflow composition | repository-first truth and improved-improver proof | Integrate later |
| OpenHands | AI software-development runtime | agent-neutral coding runtime and sandbox boundary | independent decision-to-outcome evidence and external user-value proof | Integrate |
| Codex CLI | local coding agent | strong terminal execution surface and subprocess UX | project lifecycle, cross-agent comparison, durable claims | Integrate |
| SWE-agent | issue-resolution agent research | agent-computer-interface and reproducible task framing | product discovery and long-lived project governance | Adapt for benchmarks |
| mini-SWE-agent | minimal coding agent | small agent loop and multiple environment backends | durable state, policy, evidence, product outcomes | Integrate as minimal baseline |
| OpenSandbox | general AI sandbox platform | lifecycle API, Docker/Kubernetes runtimes, egress controls | project decisions, evidence semantics, learning | Integrate rather than rebuild |
| MCP | tools/resources protocol | standard client-to-tool interoperability | lifecycle truth, authorization policy, evaluation | Expose CycleWarden through MCP |
| A2A | agent-to-agent protocol | capability discovery and long-running task transport | project governance and evidence acceptance | Defer until adapters exist |
| OPA | policy decision engine | policy-decision/enforcement separation | evolution-domain model and evidence gates | Adapt concepts; defer Rego dependency |
| in-toto / SLSA | supply-chain provenance | attestations, subjects, materials, incremental assurance | correctness and product-value verdicts | Adapt attestation model |
| OpenTelemetry | observability | vendor-neutral traces, metrics, and logs | authoritative cycle state and claim rules | Integrate telemetry only |
| SWE-bench | issue-resolution benchmark | pinned repositories and Docker evaluation harness | product outcomes and multi-cycle learning | Use as one technical benchmark |
| OpenHands Index | broad coding-agent comparison | multiple task categories and cross-agent reporting | causal process-improvement evaluation | Use as benchmark-design input |
| Self-Refine | iterative output refinement | feedback/refinement loop without training | durable cross-cycle learning and independent verification | Adopt only inside bounded activities |
| Reflexion | episodic verbal learning | trial feedback retained for later attempts | expiry, applicability, causal benefit, safety | Adapt with evidence gates |
| Voyager | lifelong skill acquisition | executable skill library and environment feedback | repository governance and controlled causal evaluation | Adapt skill registry principles |

## Detailed decisions

### Temporal — durable execution reference

**What it solves:** workflows that resume after process, network, or infrastructure failure.

**Adopt:** append-only history, deterministic transition logic, idempotent external activities,
and explicit recovery semantics.

**Adapt:** CycleWarden starts local-first with inspectable JSONL and snapshots rather than requiring
a Temporal service. A later distributed backend must preserve the same kernel contracts.

**Reject for now:** embedding repository policy and product decisions inside a generic workflow
engine, or making a hosted workflow service mandatory for local use.

**Falsification test:** kill processes at each persistence boundary and prove that replay yields
one legal cycle state without duplicated accepted actions.

### LangGraph — stateful agent orchestration reference

**What it solves:** long-running stateful agent graphs with checkpoints, stores, interrupts, and
human-in-the-loop continuation.

**Adopt:** resumable checkpoints, explicit interrupts, and separate short-term execution state
from longer-lived memory.

**Adapt:** CycleWarden cycle state remains the authoritative product record. Agent graphs are
activities or clients of the kernel, not the owner of truth, authorization, or accepted claims.

**Reject:** assuming persisted graph state proves repository improvement.

**Falsification test:** run the same cycle through a graph client and a plain CLI client and prove
both consume identical persisted state and policy decisions.

### Microsoft Agent Framework — workflow and provider abstraction reference

**What it solves:** composing agents, tools, conversations, persistence, executors, and workflows
across providers.

**Adopt:** adapter contracts, executor boundaries, and workflow composition patterns.

**Integrate later:** one Agent Framework client should consume CycleWarden through stable APIs after
the kernel and MCP boundary are complete.

**Reject:** framework-specific provider objects in kernel state.

**Falsification test:** identical cycle artifacts must be produced when equivalent work is
performed through two different agent clients.

### OpenHands — full coding-agent runtime reference

**What it solves:** interactive and autonomous software development using interchangeable models,
tools, containers, browser capabilities, and evaluation infrastructure.

**Adopt:** bring-your-own-model execution, explicit runtime/sandbox separation, and reusable
evaluation infrastructure.

**Integrate:** OpenHands should be an execution adapter, not copied into the deterministic kernel.

**Reject:** treating an agent finishing a task as sufficient evidence that a governed evolution
cycle succeeded.

**Falsification test:** execute one bounded implementation through OpenHands while CycleWarden alone
controls authorization, evidence acceptance, stage changes, and final verdict.

### Codex CLI — local coding-agent adapter reference

**What it solves:** local repository work through a terminal coding agent.

**Adopt:** subprocess-friendly local UX, explicit working directory, streamed activity, and
operator-controlled execution.

**Integrate:** implement a Codex adapter only after command scope, workspace isolation, timeout,
provenance, and branch-delivery contracts exist.

**Reject:** making Codex-specific sessions the durable source of truth.

**Falsification test:** interrupt Codex, resume the CycleWarden cycle with another agent, and retain
all accepted state without replaying unauthorized work.

### SWE-agent and mini-SWE-agent — coding-agent and minimal-baseline references

**What they solve:** repository task execution, especially issue resolution, with reproducible
environments and benchmark-oriented agent interfaces.

**Adopt:** pinned task/repository inputs, environment abstraction, trajectory retention, and a
minimal baseline that challenges unnecessary orchestration complexity.

**Adapt:** CycleWarden evaluates issue repair as one opportunity class among product discovery,
experiments, reliability, security, and optimization.

**Reject:** adding specialized tools or multi-agent layers without measured improvement over the
minimal baseline.

**Falsification test:** every proposed execution-layer feature must beat the minimal adapter on at
least one defined metric without unacceptable regression in cost, duration, safety, or portability.

### OpenSandbox — execution containment reference

**What it solves:** general-purpose sandbox lifecycle, command/file execution, Docker/Kubernetes
backends, resource controls, endpoints, and egress policy.

**Adopt:** a runtime-neutral sandbox contract covering lifecycle, command execution, files,
resource limits, network policy, diagnostics, pause/resume, and cleanup.

**Integrate rather than rebuild:** prefer a dedicated sandbox backend when running untrusted
repositories. CycleWarden owns authorization and evidence; the sandbox owns containment.

**Reject:** describing a temporary directory or copied workspace as a security sandbox.

**Falsification test:** adversarial fixtures must be unable to modify the host project, access
forbidden host paths, inherit secrets, or reach blocked network destinations.

### MCP and A2A — interoperability references

**MCP scope:** connect an AI application to tools, resources, and prompts.

**A2A scope:** discovery and communication among independent opaque agents, including long-running
tasks and multiple interaction modalities.

**Adopt:** expose kernel resources and permitted operations through MCP; preserve transport-neutral
internal APIs so A2A can later wrap complete agent capabilities.

**Reject:** using either protocol as a substitute for cycle state, authorization, evidence rules,
or outcome evaluation.

**Falsification test:** protocol clients must be unable to perform actions that the local CLI would
reject for the same cycle, autonomy, risk, approval, and stage inputs.

### OPA — policy architecture reference

**What it solves:** domain-neutral policy decisions over structured input, separated from the
application enforcement point.

**Adopt:** policy-decision/enforcement separation, structured context, explainable decisions,
versioned policy, and decision logging.

**Adapt:** keep the initial TypeScript policy module dependency-free and deterministic. Add an OPA
adapter only when external policy packs create demonstrated value.

**Reject:** a remote policy call as the only enforcement path for local protected actions.

**Falsification test:** the same policy fixture must produce the same decision locally and through
an optional external policy adapter.

### in-toto and SLSA — provenance references

**What they solve:** traceable software-supply-chain steps, subjects, materials, builders,
provenance, and increasing assurance against tampering.

**Adopt:** content-addressed subjects/materials, attributable activities, portable attestations,
and incremental conformance levels.

**Adapt:** CycleWarden attestations cover evolution-cycle claims, not only builds.

**Reject:** equating provenance with correctness, user value, or safety.

**Falsification test:** an independent verifier must detect changed evidence, changed inputs,
missing activities, and unsupported claim elevation.

### OpenTelemetry — observability reference

**What it solves:** vendor-neutral production of traces, metrics, and logs.

**Adopt:** stable semantic names, trace correlation, cost/duration/retry metrics, and optional
export through standard SDKs.

**Reject:** telemetry as the authoritative cycle journal, or source-content capture by default.

**Falsification test:** disabling telemetry exporters must not affect cycle correctness, recovery,
or evidence verification.

### SWE-bench and OpenHands Index — evaluation references

**What they solve:** reproducible comparison of coding systems across real repository tasks and,
in the Index, broader categories than issue resolution alone.

**Adopt:** pinned repositories, versioned tasks, isolated environments, retained trajectories,
independent harnesses, and reporting beyond one headline score.

**Adapt:** CycleWarden must also measure authorization correctness, recovery, explanation quality,
product outcomes, cost, duration, regressions, and later-cycle learning.

**Reject:** using public issue-resolution success as proof of general product evolution.

**Falsification test:** report results by repository, task class, agent, model, environment, cost,
duration, policy outcome, and product evaluator—not only aggregate pass rate.

### Self-Refine, Reflexion, and Voyager — learning references

**What they solve:** iterative feedback, episodic verbal memory, and reusable executable skills.

**Adopt:** bounded feedback/refinement activities, explicit consumed memory, reusable skills, and
environment-grounded verification.

**Adapt:** every retained memory or skill receives applicability, provenance, expiry, risk, and
later-consumption records.

**Reject:** narrative self-improvement claims, unbounded memory growth, or promotion based only on
the same model judging itself.

**Falsification test:** use paired comparable cycles with and without a proposed meta-change;
promote only when measured lift exceeds uncertainty and no protected metric regresses.

## Cross-system gap matrix

| Capability | Best external reference | CycleWarden status | Required proof |
| --- | --- | --- | --- |
| deterministic transitions | Temporal | implemented foundation | kill-boundary and migration tests |
| agent checkpoints/HITL | LangGraph | cycle resume implemented; agent interrupts absent | two-client resume proof |
| coding execution | OpenHands, Codex, mini-SWE-agent | adapters absent | same scoped task through two agents |
| untrusted isolation | OpenSandbox, Daytona | Docker baseline implemented; remote providers absent | provider parity, egress allowlist and external security review |
| policy architecture | OPA | local deterministic module implemented | external-policy parity fixtures |
| tool interoperability | MCP | absent | CLI/MCP policy-equivalence tests |
| agent interoperability | A2A | deferred | capability discovery plus identical cycle consumption |
| portable provenance | in-toto/SLSA | content-addressed evidence implemented | independent attestation verification |
| observability | OpenTelemetry | absent | exporter-independent correctness |
| coding benchmarks | SWE-bench/OpenHands Index | repository proofs exist; no broad outcome suite | audited, versioned multi-dimensional evaluation |
| durable learning | Reflexion/Voyager | absent | consumption records and paired evaluation |
| positive recursion | no compared system proves CycleWarden's full claim | absent by design | causal later-cycle improvement benchmark |

## Required benchmark program

Before claiming the core is broadly competitive, CycleWarden must run the following program:

1. **Durability:** process-kill tests at every journal/snapshot boundary and migration fixtures.
2. **Portability:** at least three unrelated repositories spanning different package managers and
   at least two implementation languages.
3. **Execution parity:** the same bounded task through two agent adapters and a minimal command
   baseline.
4. **Containment:** malicious repository fixtures for host writes, secret inheritance, symlinks,
   process trees, output floods, timeouts, and network egress.
5. **Policy:** allow/deny/approval fixtures across all autonomy and risk combinations.
6. **Evidence:** tamper, substitution, expiry, contradiction, and unsupported-claim tests.
7. **Outcome:** separate technical checks from a product or user outcome evaluator.
8. **Learning:** paired later cycles with and without a retained memory or process change.
9. **Economics:** report success, regression, cost, duration, retries, and human interventions.
10. **Explainability:** a reviewer can identify why an opportunity was selected, authorized, and
    accepted or rejected from durable artifacts alone.

## Definition of comprehensive comparison

The research gate is complete for a decision only when:

- at least one primary source is recorded;
- the reviewed version, tag, commit, or access date is recorded;
- license and integration implications are known where code reuse is possible;
- strengths and failure boundaries are described separately;
- an explicit CycleWarden decision is recorded;
- the decision has a falsifiable implementation or benchmark requirement;
- contradictory evidence is retained rather than silently removed;
- changes in the external system trigger review when they affect the decision.

## Current source registry

The current source-level decisions live in
[`EXTERNAL_SYSTEMS.json`](./EXTERNAL_SYSTEMS.json). The registry pins a version,
commit, publication date or access date; records the CycleWarden boundary,
limitation and falsification test; preserves material contradictions; and
expires on a declared review date.

`node scripts/check-external-systems.mjs` rejects floating revisions, expired
reviews, narrow coverage, missing dissent and incomplete decision records. It is
a structure and freshness gate, not independent proof that a source claim is
true or useful to users.

## Current conclusion

CycleWarden should not compete by rebuilding every adjacent runtime. Its differentiated responsibility
is the deterministic, evidence-backed, policy-governed project-evolution lifecycle across agents,
runtimes, repositories, and product outcomes.

The immediate plan is therefore:

1. keep external decisions current through the expiring registry;
2. validate decision-governance value with real users before broad integration;
3. adapt provider-neutral query, source, citation, budget and stop records;
4. consume one protected execution handoff through one coding-agent adapter;
5. keep remote sandbox, MCP/A2A, policy and telemetry integrations optional and
   gated by demonstrated use cases;
6. evaluate technical, policy, recovery, economic and product outcomes
   independently;
7. permit a positive-recursion claim only after controlled later-cycle evidence.

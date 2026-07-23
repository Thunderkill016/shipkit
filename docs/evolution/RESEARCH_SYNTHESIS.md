# Evolution Engine research synthesis

Status: active architecture research  
Date: 2026-07-23

No finite research process can literally consume every useful webpage or Git
repository. This program uses a reproducible source map, prioritizes primary
sources and high-signal implementations, records contradictions, and expands the
map when new evidence changes an architectural decision.

This synthesis explains the extracted principles. The system-by-system comparison,
source ledger, licenses, explicit decisions, limitations, and falsification tests live in
[`COMPARATIVE_ANALYSIS.md`](./COMPARATIVE_ANALYSIS.md). A project name without those records
is not accepted as completed research.

## Source domains and extracted principles

### Durable execution

Studied: Temporal and LangGraph.

Extract:

- persist state before/after meaningful transitions;
- make retries and resume deterministic;
- separate deterministic workflow decisions from nondeterministic activities;
- support human inspection and intervention at checkpoints;
- event history must be replayable and migration-aware.

Evolution Engine implication: the kernel is an append-only state machine; agent
calls, web research, and shell execution are external activities.

### Software agents and sandboxes

Studied: OpenHands, Codex CLI, SWE-agent, mini-SWE-agent, OpenSandbox, and OpenHands Index.

Extract:

- agent/model choice materially affects success, cost, and duration;
- a small general toolset can outperform over-specialized agent stacks;
- sandbox/workspace isolation is a reusable infrastructure boundary;
- agent runtime and project-improvement governance are different layers;
- broad benchmark coverage is more useful than one headline score.

Evolution Engine implication: bring your own agent and dedicated sandbox; Shipkit owns the
lifecycle, authorization, evidence, and verdict rather than the code-generation model or
sandbox runtime.

### Agent orchestration

Studied: LangGraph, Microsoft Agent Framework, A2A, and MCP.

Extract:

- MCP connects agents to tools/resources;
- A2A connects opaque agents to other agents;
- neither protocol defines how a project should select, authorize, verify, learn,
  or preserve dissent across improvement cycles;
- layered APIs and extension boundaries outperform giant opinionated runtimes.

Evolution Engine implication: expose kernel operations through adapters, MCP, and
later A2A; do not redefine their transport protocols.

### Policy and safety

Studied: Open Policy Agent and policy-as-code practice.

Extract:

- separate policy decision from enforcement;
- policies should consume structured context and return explainable decisions;
- protected actions need explicit scoped approval, not a generic autonomy flag;
- policy changes require versioning and tests.

Evolution Engine implication: authorization is a deterministic module and every
decision is recorded with the cycle.

### Provenance and software supply chain

Studied: in-toto Attestation Framework and SLSA provenance.

Extract:

- claims should bind subjects, materials, builders, steps, and outputs;
- attestations should be portable and independently verifiable;
- provenance is different from correctness but necessary for trust;
- schema/version compatibility is a product feature.

Evolution Engine implication: each accepted claim references immutable evidence
and can later emit signed attestations.

### Observability

Studied: OpenTelemetry and GenAI semantic conventions.

Extract:

- use stable semantic names across vendors;
- traces, metrics, events, and resources answer different questions;
- content capture can leak sensitive data and should be opt-in;
- record cost, duration, tool calls, agent/model version, retries, and outcomes.

Evolution Engine implication: telemetry is protocol-compatible but cycle truth
remains in repository state.

### Learning and self-improvement

Studied: Self-Refine, Reflexion, Voyager, and skill-benchmark research.

Extract:

- iterative feedback often improves one output;
- episodic memory can improve later attempts without weight updates;
- executable skill libraries can compound capability;
- retained instructions can also add token cost, become stale, and reduce success;
- therefore every memory/skill/meta-change requires paired evaluation rather than
  narrative promotion.

Evolution Engine implication: learning is not file creation. A later cycle must
record which memory it consumed, and E3 requires a controlled comparison.

### Evaluation and benchmark design

Studied: SWE-bench, OpenHands Index, ABC-Bench, Dialogue SWE-Bench,
SWE-Skills-Bench, and domain-specific SWE benchmarks.

Extract:

- pin repositories, tasks, environments, and test harnesses;
- report success, cost, duration, and regressions, not one score;
- separate agent effect, model effect, skill effect, and environment effect;
- public benchmarks are vulnerable to contamination and harness exploits;
- maintain hidden/rotating tasks and independent verification for high-value claims.

Evolution Engine implication: build a benchmark foundry, not a static leaderboard.

## Architecture decision

The product is a three-plane system:

1. **Control plane** — deterministic kernel, state, policy, provenance, claims.
2. **Execution plane** — interchangeable agents, tools, sandboxes, workflows.
3. **Evidence plane** — checks, telemetry, benchmarks, measurements, attestations.

A fourth compounding layer, the **learning plane**, promotes only memories and
meta-changes that show value under comparable evaluation.

## Strategic moat

The defensible assets are:

- a high-quality corpus of real evolution cycles and failure modes;
- policy and verification packs for repository classes;
- reproducible project-understanding and benchmark harnesses;
- cross-agent comparative data;
- meta-improvement experiments that identify which process changes generalize;
- interoperability and trust earned through an open kernel.

The moat must not depend on secretly storing user source code or locking users to
one model provider.

## Research acceptance rule

A material architecture or product decision is not research-complete until it records:

- a primary source and review date;
- reviewed release, tag, commit, or specification version where relevant;
- license and integration implications;
- strengths, limitations, and contradictory evidence;
- an explicit adopt/adapt/integrate/defer/reject decision;
- a test or benchmark capable of disproving that decision.

The current ledger and comparison baseline are maintained in
[`COMPARATIVE_ANALYSIS.md`](./COMPARATIVE_ANALYSIS.md). Material implementation decisions
will be promoted into versioned ADRs.

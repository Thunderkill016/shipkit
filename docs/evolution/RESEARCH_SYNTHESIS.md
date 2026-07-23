# Evolution Engine research synthesis

Status: active architecture research  
Date: 2026-07-23

No finite research process can literally consume every useful webpage or Git
repository. This program uses a reproducible source map, prioritizes primary
sources and high-signal implementations, records contradictions, and expands the
map when new evidence changes an architectural decision.

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

Studied: OpenHands, OpenHands Software Agent SDK, SWE-agent, mini-swe-agent,
Codex-style repository agents, and OpenHands Index.

Extract:

- agent/model choice materially affects success, cost, and duration;
- a small general toolset can outperform over-specialized agent stacks;
- sandbox/workspace isolation is a reusable infrastructure boundary;
- agent runtime and project-improvement governance are different layers;
- broad benchmark coverage is more useful than one headline score.

Evolution Engine implication: bring-your-own agent and sandbox; own the lifecycle,
not the code-generation model.

### Agent orchestration

Studied: LangGraph, AutoGen/Microsoft Agent Framework, A2A, MCP, and emerging
agent-governance gap research.

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

## Primary references

- Temporal durable execution and event history documentation
- LangGraph stateful/durable agent orchestration
- OpenHands and OpenHands Software Agent SDK
- SWE-agent and SWE-bench family
- Open Policy Agent
- in-toto Attestation Framework and SLSA
- OpenTelemetry semantic conventions and GenAI conventions
- MCP and A2A specifications
- Self-Refine, Reflexion, Voyager
- NIST AI RMF and secure software/supply-chain guidance

Exact source URLs and access dates will be maintained in the evidence ledger as
individual architecture decisions are implemented.

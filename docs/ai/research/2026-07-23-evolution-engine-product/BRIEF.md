# Research brief — Shipkit Evolution Engine as the primary product

Status: selected for delivery  
Date: 2026-07-23  
Issue: #9

## Decision

What should Shipkit become first if the core goal is a reusable system that helps any project improve itself through evidence, safe autonomy, verification, and retained learning?

## Product answer

**Shipkit Evolution Engine** is the product.

It is not a website builder, Product Slice generator, hosted app studio, or standalone standards body. It is an agent-neutral control plane for project evolution.

## Market position

Current products already cover adjacent layers:

- Codex, Claude Code, Cursor, and OpenHands execute engineering tasks.
- OpenHands and LangGraph provide agent runtimes and durable orchestration.
- LangSmith and Langfuse provide tracing and evaluation for LLM/agent runs.
- MCP standardizes how AI applications connect to tools and context.

Shipkit Evolution Engine should not replace those products. It coordinates the improvement lifecycle *around* them:

```text
project state + objective + evidence + risk policy
→ candidate selection
→ compatible agent execution
→ independent verification
→ outcome measurement
→ retained learning and meta-improvement
```

## Product promise

> Point the engine at a Git repository. It builds an evidence-backed project model, identifies the highest-value bounded improvement, coordinates any compatible AI agent, verifies the result, preserves learning, and improves future cycles without unauthorized production actions.

## First product surface

A local-first CLI is the first-class interface because it:

- works with arbitrary repositories;
- keeps source and memory local;
- can run without a paid model for A0/A1 operations;
- integrates naturally with Codex, Claude Code, OpenHands, CI, and scripts;
- provides deterministic state around nondeterministic agents.

Planned commands:

```text
shipkit evolve init
shipkit evolve inspect
shipkit evolve start
shipkit evolve advance
shipkit evolve record
shipkit evolve verify
shipkit evolve status
shipkit evolve learn
```

## Architecture wedge

The differentiator is a durable, policy-checked state machine:

- repository scanner and project snapshot;
- cycle state and append-oriented evidence;
- A0–A4 autonomy and R0–R4 risk policy;
- explicit mandatory stages;
- agent adapter boundary;
- verification boundary independent from implementation;
- outcome and meta-improvement comparison;
- PRES-compatible manifests;
- later MCP and GitHub adapters over the same core.

## Why this comes before other Shipkit features

Every later Shipkit product or feature can be researched, implemented, and improved by this engine. Building Studio, Product Slices, or a hosted service first would improve one output while leaving the core evolution mechanism as documentation and prompts.

## Constraints

- no paid AI dependency;
- no self-merge or deploy;
- no cloud custody requirement;
- no hidden chain-of-thought requirement;
- no claim of guaranteed monotonic progress;
- no E3 positive-recursion claim until controlled evidence exists.

## External evidence consulted

- OpenAI Codex CLI demonstrates demand for local coding agents with explicit approval modes.
- OpenHands exposes model-agnostic CLI, SDK, sandbox, and cloud surfaces.
- LangGraph focuses on durable stateful workflow execution and human-in-the-loop control.
- LangSmith and Langfuse focus on tracing/evaluation rather than repository evolution governance.
- MCP provides an agent-neutral client/server boundary for tools and resources.

## Next step

Implement the smallest real core: persistent cycle state machine + CLI + policy gates + repository inspection + tests. MCP, dashboard, GitHub Action, and external-agent adapters must reuse this core rather than create parallel logic.

# Shipkit Evolution Engine — product thesis

Status: focused product definition  
Issue: #9  
Date: 2026-07-23

## Product

Shipkit Evolution Engine is a deterministic control plane around nondeterministic
human and AI agents. It attaches to a repository, builds an evidence-backed model,
selects a bounded improvement, coordinates execution, verifies outcomes, retains
learning, and tests whether a meta-improvement makes later cycles better.

## The chip-fabrication analogy

A valuable semiconductor process is not one machine. It is a tightly controlled
system of design rules, process stages, measurement, defect detection, provenance,
yield learning, and expensive accumulated know-how.

Evolution Engine should be built the same way:

- models/agents are interchangeable design inputs;
- the deterministic kernel is the process-control system;
- repository checks and benchmarks are metrology;
- policy gates are process design rules;
- provenance and event history are the manufacturing record;
- failed cycles are yield-learning data;
- meta-improvements are process-node improvements;
- cross-repository benchmarks measure whether the process generalizes.

The moat is the accumulated process knowledge and evaluation infrastructure, not
a prompt or a single model integration.

## Product promise

> Use any agent. Keep repository control. Turn repeated AI work into governed,
> measurable, compounding project evolution.

## Core boundary

The kernel owns:

- cycle state and legal transitions;
- autonomy/risk authorization;
- evidence and provenance references;
- checkpoints and recovery;
- verification and outcome claim rules;
- learning consumption and meta-improvement comparison.

Agents may propose and execute actions through adapters. They do not own state,
permissions, truth, completion, or recursive-improvement claims.

## Initial wedge

The first paid-value problem is not autonomous coding. It is controlling mixed
agent workflows across repositories so teams can answer:

1. What is the system trying to improve?
2. Why was this candidate selected?
3. What was the agent allowed to do?
4. What changed and how can it be rolled back?
5. What evidence proves the outcome?
6. What learning was retained and consumed later?
7. Did a meta-change actually improve a comparable future cycle?

## Non-goals until the kernel is proven

- hosted app builder or Studio;
- Product Slice expansion;
- a proprietary foundation model;
- automatic merge/deploy/production mutation;
- multi-agent swarm theater without measurable benefit;
- claims of sentience or guaranteed monotonic improvement.

# Opportunity brief — Shipkit Evolution Engine

Status: selected  
Issue: #9

## Desired outcome

Make repository evolution executable, resumable, explainable, and agent-neutral.

## Opportunity map

```text
Trustworthy autonomous project improvement
├── persistent project/cycle state
├── deterministic stage transitions
├── autonomy and risk policy
├── evidence and provenance
├── external agent adapter boundary
├── independent verification
├── measured outcome
└── retained meta-learning
```

## Product concepts considered

| Concept | Strength | Why not first |
|---|---|---|
| Prompt/template pack | easy distribution | current Shipkit already has this; no executable state |
| Hosted autonomous coding agent | impressive demo | competes with mature runtimes and adds model/cloud cost |
| Studio/app builder | accessible | productizes output creation, not the evolution core |
| PRES compliance CLI only | precise | validates records but does not run the lifecycle |
| Evolution Engine core + CLI | reusable and foundational | selected |
| Full dashboard/MCP/GitHub suite | complete surface | must reuse a proven core; too broad for first slice |

## Selected wedge

A local CLI with a durable state machine that can inspect any Git repository and govern one complete evolution cycle. It is useful without an LLM for initialization, inspection, state, policy, validation, and verification. Agents connect later through adapters.

## Definition of product proof

The core is a product when a user can install/run it against an unfamiliar repository, stop and resume, understand the current state and gates, and produce a verifiable cycle without manually assembling Shipkit's internal documentation structure.

## Definition of non-proof

- another white paper;
- more prompts;
- a mock dashboard;
- a demo feature created by the existing workflow;
- an agent claiming it improved itself without a comparable measurement.

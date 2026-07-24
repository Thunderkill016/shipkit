# Named-Candidate Research

## Purpose

Named-candidate research is the smallest follow-up to the CycleWarden-on-CycleWarden calibration. It answers a decision that already names concrete alternatives without replacing them with a generic opportunity portfolio.

The adapter is manifest-driven. It does not discover GitHub issues, search the web, call a model, infer user demand, modify code, merge, or deploy.

## Inputs

`cyclewarden-research-candidates` consumes two explicit snapshots:

1. a candidate decision manifest;
2. the current CycleWarden capability registry.

Every candidate must provide all four evidence categories:

- `issue` — current issue status and requirement;
- `roadmap` — sequencing or product constraint;
- `capability` — expected current capability state;
- `implementation` — concrete code, merge, test, or artifact evidence.

The manifest also declares:

- the exact decision question;
- candidate status: `completed`, `active`, `planned`, or `blocked`;
- typed priority inputs;
- the selected execution path: `trusted-local`, `docker`, or `none`;
- protected constraints;
- an optional protected experiment with precommitted parameters and decision rules;
- reversible experiment and handoff fields for each candidate.

## Fail-closed rules

The run becomes durable `inconclusive` when:

- fewer than three candidates are supplied;
- any candidate lacks one of the four required evidence categories;
- referenced capability IDs are missing;
- expected capability status or verification state differs from the current registry;
- the selected execution backend lacks a verified passing capability;
- the query or source budget cannot cover the evidence map;
- all candidates are already completed;
- deterministic scoring has no unique leader.

The adapter does not invent evidence or silently choose an arbitrary candidate when these conditions occur.

## Deterministic score

For each candidate:

```text
pilotRelevance × 4
+ decisionImpact × 3
+ riskReduction × 2
− effort
```

Each input is explicitly stored in the manifest. This score is an inspectable project judgment, not a statistical estimate of market demand.

A completed candidate receives a selection score of `-1000`. It remains visible as a rejected alternative and can create a resolved contradiction when its historical priority signals are still positive.

A tie at the highest selectable score is inconclusive.

## Capability freshness

Capability statements are generated from the current capability-registry snapshot, not copied from an older research template.

A capability evidence item may declare `expectedStatus` and `expectedVerificationStatus`. A mismatch is treated as stale evidence and stops the run.

Execution claims are path-specific:

- `trusted-local` is explicitly described as not being a security sandbox;
- the current Docker baseline is reported separately when it exists;
- `docker` claims use the current `sandboxed-agent-execution` registry entry and preserve its limitations;
- `none` does not imply containment.

This prevents the stale calibration statement that described all execution containment as unproven after the Docker baseline had already merged.

## Protected experiments

A precommitted external pilot is not rewritten by generated research.

Protected experiment parameters, success criteria, and failure criteria are copied into:

- research constraints;
- experiment guardrails;
- content-addressed manifest evidence.

For the fixed CycleWarden fixture, the authoritative #14 values remain:

- 6 developers;
- 6 repositories;
- 14 days maximum;
- success at 3 of 6 decision-value audits plus 4 of 6 explainable rankings;
- inconclusive at exactly 2 of 6;
- failure at at most 1 of 6 or repeated serious evidence/privacy/safety failure.

## CLI

```bash
pnpm research:candidates -- <cycle-id> \
  --root .cyclewarden \
  --project-root . \
  --manifest packages/evolution-core/src/fixtures/cyclewarden-next-workstream.candidates.json \
  --capabilities docs/CAPABILITIES.json \
  --actor cyclewarden-candidate-researcher \
  --reviewer cyclewarden-candidate-reviewer
```

The cycle must already be at `modeled`, and policy must authorize `cycle:<cycle-id>:research`.

## Verified boundary

This slice can compare named project alternatives against supplied repository evidence and current capability state. It cannot establish:

- external user decision value;
- current market or competitor facts;
- source truth beyond the supplied snapshots;
- whether the typed scoring weights are valid for another organization;
- whether a selected experiment should be implemented automatically.

External decision value remains governed by the fixed #14 pilot. Broader search discovery remains separate work under #13.

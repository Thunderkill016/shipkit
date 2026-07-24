# Opportunity brief — applying leading-system research to CycleWarden

Status: delivery selected
Evidence ledger: [`EVIDENCE.md`](./EVIDENCE.md)

## Desired outcome

CycleWarden should make architecture decisions from current, reviewable evidence
without copying mature runtimes or mistaking benchmark and vendor claims for
user value.

## Target and triggering context

The target is a CycleWarden maintainer deciding what to build in the next 4–6 weeks.
The trigger is a new integration proposal, material upstream change, or external
claim that could change CycleWarden's boundary.

## Current behavior and alternatives

The narrative comparison is broad but its revisions were floating and several
CycleWarden status claims became stale after merged implementation. Alternatives are:

- manually reread and edit the narrative;
- depend on a vendor/framework's current architecture;
- add a search, sandbox, or coding-agent integration immediately;
- conduct direct user discovery before more implementation;
- do nothing and accept research drift.

## Opportunity map

```text
Make evidence-backed CycleWarden decisions
├── Keep external architecture evidence current and falsifiable [E2, E19, E20]
│   ├── pin revision or access date [E3, E8, E13]
│   ├── retain limitations and contradictions [E6, E9, E18]
│   └── expire the review instead of implying permanent truth [E2]
├── Reuse mature adjacent mechanisms through adapters [E3–E17]
│   ├── provider-neutral research records [E17]
│   ├── one bounded coding-agent handoff consumer [E7, E8, E10]
│   └── remote sandbox only with explicit trust/cost approval [E11]
└── Prove decision value with users before broad build-out [E21]
```

## Why this matters

- Frequency: every roadmap or integration decision can depend on moving upstream
  systems.
- Severity or upside: stale comparisons can cause duplicated infrastructure,
  unsafe trust assumptions, or misleading positioning.
- Reach: maintainers, future reviewers, agent implementers, and generated
  projects can reuse the decision boundary.
- Existing cost or effort: the previous ledger required manual interpretation
  and had no expiry or revision gate.
- Strongest evidence: E2, E3–E17, E19, E20.
- Strongest contradiction: the repository-consistency improvement does not prove
  user value (E21).

## Why now

OpenHands has expanded into the same generic control-plane territory, mature
durable systems expose agent integrations, and two recent benchmark audits show
that external evidence ages quickly and can reverse a decision.

## Concept portfolio

| Concept | Mechanism | Opportunity | Expected outcome delta | Key assumption | Evidence | Non-feature? |
|---|---|---|---|---|---|---|
| C1 | Versioned external-system registry plus validator | Prevent research/architecture drift | Medium repository reliability | Maintainers will keep the review current when CI fails | E2–E20 | Yes |
| C2 | Provider-neutral search source/action/citation records | Broader reproducible research | High research coverage | A provider can fit cost, privacy, and quality constraints | E17, E18, E21 | No |
| C3 | Consume one approved handoff through Codex or OpenHands | Close decision-to-execution loop | High workflow value | Users trust and need governed agent execution | E7, E8, E10, E21 | No |
| C4 | Remote sandbox adapter | Stronger provider-managed isolation | Medium security/portability | Provider trust and cost beat the Docker baseline | E11, E21 | No |
| C5 | Five past-behavior interviews using real decisions | Validate decision-governance value | Highest decision value | Relevant users experience this bottleneck | E21 | Yes |

## Comparative scorecard

Scores are 1–5 judgments, not measurements. Risk is worse when higher.

| Concept | Evidence | Outcome delta | Strategic fit | Differentiation | Feasibility | Risk | Notes |
|---|---:|---:|---:|---:|---:|---:|---|
| C1 | 5 | 3 | 4 | 2 | 5 | 1 | Bounded, dependency-free, and directly fixes observed drift. |
| C2 | 3 | 4 | 5 | 3 | 3 | 3 | Needs provider/cost approval and user-value proof. |
| C3 | 3 | 5 | 5 | 3 | 2 | 4 | Protected execution scope and issue #14 remain gates. |
| C4 | 3 | 3 | 4 | 2 | 2 | 5 | Security, credentials, data location, and cost are material. |
| C5 | 1 | 5 | 5 | 5 | 4 | 1 | Best next product decision; cannot be completed from repository/web evidence. |

## Red-team review

- C1 can become compliance theater if entries are updated mechanically without
  reading the sources.
- Vendor sources share incentives to overstate safety and product outcomes.
- A quarterly expiry adds maintenance burden and may block unrelated work.
- The registry validates structure, not truth, URL availability, license
  compatibility, or user value.
- A simple scheduled review checklist could be cheaper than code; the validator
  is justified only because the existing drift was concrete and recurring.
- C2–C4 could distract from C5, the missing user decision evidence.

## Selected opportunity and riskiest assumption

Select C1 for this bounded delivery. Its riskiest assumption is that failing CI
on stale or floating evidence prevents enough wrong decisions to justify the
maintenance burden.

C5 is the next product experiment. C2–C4 remain planned concepts, not authorized
integrations.

## Recommended next experiment

Add the registry and validator, prove negative fixtures catch floating revisions,
expired reviews, narrow coverage, and missing contradictions, then observe
whether the next material architecture update is easier and safer to review.

## Decision

Delivery for C1. Research/user experiment for C5. Defer C2–C4 until explicit
approval and issue #14 evidence.

## What would change the decision?

- The validator repeatedly blocks unrelated work without preventing drift;
- a simpler generated report provides the same protection;
- user research shows the decision-governance job is not important;
- an external standard supplies a compatible, maintained decision registry.

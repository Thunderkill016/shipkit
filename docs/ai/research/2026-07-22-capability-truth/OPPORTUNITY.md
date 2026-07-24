# Opportunity brief — trustworthy capability claims

Status: promoted to delivery  
Evidence ledger: `EVIDENCE.md`

## Desired outcome

A human or agent can answer “what does CycleWarden currently support, and what is
actually verified?” without reconciling several contradictory prose documents.

## Opportunity map

```text
Trustworthy repository context
├── Current structured capability status [E1, E2]
├── Evidence traceability [E2, E3]
├── Pull-request enforcement [E3, E4, E5]
└── Honest separation of code presence and runtime verification [E6, E7]
```

## Concept portfolio

| Concept | Mechanism | Strength | Limitation |
|---|---|---|---|
| Edit stale docs | manual cleanup | smallest immediate diff | drift returns silently |
| Generate all docs from code | automation | fewer duplicate tables | product/runtime truth cannot be inferred safely |
| Capability JSON + checker | structured evidence | simple, diffable, machine-readable | semantic truth still needs tests/review |
| Database/service catalog | heavier platform | queryable at scale | unnecessary complexity for this repo |
| No feature: review checklist only | process | no implementation | easy for agents/humans to skip |

## Selected mechanism

Capability JSON + dependency-free checker, with concise docs linking to it.

## Red-team review

- Evidence path can exist while behavior is broken; keep verification status.
- Registry can become stale; make it part of active workflow and review.
- Generated products must not inherit CycleWarden's pass state.
- A registry should not become an excuse to remove E2E tests.

## Decision

Promote to bounded delivery in issue #2. Keep runtime failure work in issue #3.

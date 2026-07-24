# Experiment card — machine-enforced external evidence

Status: technical spike completed
Opportunity: [`OPPORTUNITY.md`](./OPPORTUNITY.md)
Owner: Codex

## Decision and assumption

Test whether a dependency-free registry check can make current external evidence
mechanically reviewable and reject the concrete drift modes found in CycleWarden.

This does not test user value.

## Evidence needed

- the valid reviewed registry passes;
- a floating revision fails;
- an expired review fails;
- fewer than three contradictions fail;
- narrow system coverage fails;
- the existing AI workflow invokes the check.

## Method

Technical spike with positive and negative deterministic fixtures.

## Participants or system

CycleWarden repository at `origin/main` commit `788ca83`, Node.js 24.16.0.

## Procedure

1. Record current primary sources, revisions, decisions, boundaries,
   limitations, and falsification tests.
2. Validate minimum breadth and review expiry.
3. Mutate one rule at a time in memory.
4. Confirm each invalid record returns a targeted error.
5. Add the check to the existing AI workflow gate.

## Measures

| Measure | Baseline | Success threshold | Kill threshold | Collection method |
|---|---:|---:|---:|---|
| Current systems | Narrative only | At least 12 | Fewer than 12 | Registry checker |
| System groups | Not enforced | At least 5 | Fewer than 5 | Registry checker |
| Material contradictions | Not enforced | At least 3 | Fewer than 3 | Registry checker |
| Floating revision rejection | No | Pass negative fixture | Fixture passes | Pure validator test |
| Expired review rejection | No | Pass negative fixture | Fixture passes | Pure validator test |
| New runtime dependencies | 0 | 0 | Any unapproved dependency | Package diff |

## Duration and cost limit

One bounded repository cycle; no paid API, credentials, deployment, or new
package.

## Privacy, safety, and ethics

Only public primary sources and repository metadata were used. Product marketing
is labeled as first-party evidence. No user, private repository, or credential
data is included.

## Results

The registry contains sixteen systems, twenty-eight source records, eight groups,
and four contradictions. Focused positive and negative tests pass. Full workflow
and repository verification are recorded in the implementation plan and final
handoff.

## Interpretation

The spike proves structural freshness and dissent gates, not source truth,
comprehensiveness, market demand, or user usefulness. An alternative explanation
is that the same result could be achieved through disciplined manual review; the
next real architecture update should compare maintenance cost.

## Decision

Proceed with the bounded delivery. Do not promote search, sandbox, or coding-agent
integrations without their separate approval and evidence gates.

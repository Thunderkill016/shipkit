# CycleWarden Next-Workstream Calibration — 2026-07-23

## Status

Internal calibration only. This is not external product validation and does not count toward the six participants in #14.

## Reproducible run

- Issue: #26
- Draft PR: #28
- Workflow: `Decision Calibration`
- Workflow run: `30007369282`
- Calibration head: `aa14cd5b6f67ddb2fd2ec69ac409b480487aa9f7`
- Artifact: `decision-calibration-report`
- Artifact digest: `sha256:1351b164fe32783f40099a128003f076f7a322bc69bef56b0c5bf1f5a4d38566`
- Cycle: `cyclewarden:next-workstream-calibration-001`
- Adapter: `repository-single-worker`
- Reviewer: `calibration-independent-reviewer`
- Verdict: `pass`
- Usage: 5 queries, 3 sources, 1 recorded minute, $0

The run built the current merged Evolution Core and executed one fixed `start → inspect → assess → research-repository → resume` cycle. No engine behavior was changed during the run.

## Pre-audit decision

Recorded in #26 before the generated recommendation:

1. #15 standalone core;
2. minimal #13 reproducible search discovery;
3. fixed #14 external decision-value pilot;
4. #17 governed execution only after pilot success;
5. continue only exposure-blocking #12 work for the local pilot.

## Generated evidence

The assessment reported:

- repository inventory complete without truncation;
- 8 temporary-workspace checks passed;
- 6 product signal files;
- 3 CI configuration files;
- 5 structural trust-boundary categories;
- no scorecard blockers or unknowns;
- research readiness: `ready-for-research`.

The research run stopped because repository and scorecard evidence had reached the bounded map while the remaining uncertainty required user or external evidence.

### Generated opportunity portfolio

1. **Close the highest repository-readiness gap**
   - The reported gap was to separate or commit unrelated work before implementation.
2. **Publish a reproducible repository research audit**
   - Render one research run and review verdict in the workspace.
3. **Collect direct user evidence before feature expansion**
   - Observe five recent target-user workflows and record consented atomic evidence.

The engine selected opportunity 3 and rejected 1 and 2. Its rationale was that the repository foundation was ready enough for research and the largest decision-changing gap was direct user evidence.

## Comparison with the pre-audit decision

### What the run confirmed

The run materially confirmed the main diagnosis behind the revised roadmap:

> Repository correctness and architecture evidence cannot establish that CycleWarden changes a decision anyone needs to make.

It independently stopped at missing direct user behavior and external corroboration rather than recommending more feature construction. This supports keeping #14 as a falsifiable gate and continuing participant recruitment immediately rather than completing every sandbox, agent or platform feature first.

### What the run did not answer

The run did **not** determine whether #15, #13, #12 or #17 should be the first technical workstream. Although the objective named all four candidates, the generated opportunity portfolio remained generic and did not create claims specific to those candidates.

The only sources were:

- repository snapshot;
- temporary check report;
- deterministic scorecard.

The adapter did not inspect issue bodies, candidate-specific implementation constraints, current external evidence or the operational requirements of the six-person pilot. Therefore it could not test the exact sequencing rationale.

### Incorrect or stale context exposed

The generated claim said that a technically green workspace remained trusted-local-only because sandbox containment was not proven. That statement is stale after merged PR #25, which added a verified Docker sandbox baseline. The statement may still be true for the default trusted-local assessment path, but it is phrased as a general product limitation and does not distinguish available backends.

The run also used a pull-request checkout reported as dirty, causing “separate or commit unrelated work” to appear as the highest repository gap. That is valid for the checkout observed by the run but weak evidence for product-roadmap sequencing.

Finally, its generic experiment proposed five observed workflows, while #14 has a precommitted six-participant protocol. The fixed #14 protocol remains authoritative; generated defaults cannot silently alter it.

## Calibration verdict

**Verdict: partial decision value.**

- **Confirmed:** stop architecture-first expansion and move toward direct user evidence.
- **Did not decide:** the exact ordering of #15, #13, #12 and #17.
- **Prevented:** treating repository readiness or passing checks as proof that the next feature is valuable.
- **Exposed:** candidate-specific source blindness and stale capability claims.

This is useful internal calibration, but not evidence that an external developer receives decision value.

## Roadmap decision after calibration

The pre-audit implementation sequence remains, with one operational correction:

1. continue #15 to make external installation reproducible;
2. recruit the six #14 participants in parallel now;
3. implement only the smallest #13 slice needed to ground named decision candidates and retrieve reproducible external evidence;
4. begin the fixed external pilot as soon as #15 and that minimal evidence path are usable;
5. do not expand #12 or #17 unless the pilot threat model or participant workflow demonstrates a blocker.

The calibration does not justify broad web search, PDF/browser adapters, multiple agents or remote sandbox providers.

## Required follow-up from this run

- derive sandbox statements from current backend/capability evidence rather than a hardcoded global claim;
- represent named decision candidates and their issue/roadmap evidence in the research plan;
- preserve the external pilot's precommitted sample and thresholds rather than generated defaults;
- compare the next calibration or pilot output against this artifact without rewriting the baseline.

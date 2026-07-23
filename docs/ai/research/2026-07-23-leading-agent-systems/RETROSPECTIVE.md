# Research retrospective — leading external systems for Shipkit

Date: 2026-07-23
Final status: bounded delivery

## Decision and confidence

High confidence in the architecture decision:

- keep Shipkit's portable deterministic decision/evidence kernel;
- integrate rather than rebuild mature execution, workflow, sandbox, protocol,
  policy and telemetry systems;
- differentiate through decision-to-outcome evidence and honest evaluation,
  not the generic “agent control plane” label.

Low confidence remains in product value because no direct user evidence was
collected.

## Most decision-changing evidence

OpenHands' May 2026 control-plane scope removed a central positioning assumption.
Pydantic AI and Temporal reinforced that distributed durability is an integration
surface. The February and July 2026 coding-benchmark audits showed why external
evidence and evaluations need revisions, limitations, expiry, and dissent.

## Most important contradiction

Shipkit's strongest internal architecture evidence does not establish that users
will value the governed decision workflow. Issue #14 remains the product gate.

## Belief that changed

Before the review, a generic control/evidence-plane position appeared more
distinct. After the review, the defensible hypothesis is narrower: connect a
decision to authorized action, independent evidence, product outcome, and later
learning across interchangeable systems.

## Process review

| Question | Answer |
|---|---|
| Which query, source, or method found the strongest evidence? | Current official product architecture plus recent primary benchmark audits; checking current GitHub revisions exposed how quickly moving systems invalidate floating references. |
| Which sources were stale, repetitive, or misleading? | The old narrative source ledger used “Required” revisions; vendor outcome claims were useful for scope but not independent proof. |
| Where did confirmation bias appear? | Early searches favored systems that validated the control-plane thesis. Searching current competitors and benchmark failures produced the strongest contradictions. |
| Which unknown consumed time without changing the decision? | Additional sandbox capability differences did not change the defer decision because any hosted adapter still requires explicit trust, cost, and credential approval. |
| What should the next agent reuse? | `EXTERNAL_SYSTEMS.json`, its pure validator, evidence IDs, review expiry, and the provider-neutral query/source/citation/budget fields in the opportunity brief. |

## System learning

- [ ] No workflow change
- [ ] Update a prompt
- [ ] Update a template
- [x] Add a validation check
- [x] Update product or architecture documentation

The `review-change` pass tightened the validator against duplicated source
revisions, duplicated contradiction evidence, malformed URLs, and future-dated
reviews.

## Follow-up

1. Run the issue #14 past-behavior/user decision experiment.
2. If supported, define provider-neutral query, action, source, citation, budget,
   and stop records without adding a paid provider.
3. After explicit execution approval, consume one protected handoff through one
   Codex or OpenHands adapter and compare it with the minimal command baseline.
4. Re-review the external registry by 2026-10-23.

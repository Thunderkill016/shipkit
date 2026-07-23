# A2 Research Audit pilot report

## Protocol

- Issue: #14
- Protocol version: `2026-07-24-v1`
- Participants/repositories: exactly 6/6
- Primary audits: one per repository
- Duration: maximum 14 calendar days from the first eligible session
- Session limit: 90 minutes
- Thresholds: success `>=3`, inconclusive `=2`, failure `<=1`

## Recruitment and exclusions

Report recruitment channels, eligibility decisions, withdrawals and
replacements without direct identity. Do not omit negative or incomplete
sessions.

## Session outcomes

| Participant | Repository | Product outcome | Specific causal evidence | Explainable + challengeable | Technical outcome | Serious failure | Minutes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P01 | R01 |  |  |  |  |  |  |
| P02 | R02 |  |  |  |  |  |  |
| P03 | R03 |  |  |  |  |  |  |
| P04 | R04 |  |  |  |  |  |  |
| P05 | R05 |  |  |  |  |  |  |
| P06 | R06 |  |  |  |  |  |  |

## Product decision rule

Report:

- decision-value audits;
- participants who could both explain and challenge the ranking;
- repeated serious evidence, privacy or safety failures;
- final classification: `success`, `inconclusive` or `failure`.

Apply the fixed rule directly. Do not reinterpret general praise, technical
completion or willingness to retry as primary decision value.

If decision value is at least three but fewer than four participants can both
explain and challenge the ranking, and no repeated serious failure occurred,
report the result as an unclassified protocol gap and request an explicit owner
decision. Do not alter a threshold after observing the data.

## Technical results

Report retrieval, citation, audit completion, duration and technical failures
separately. A technically successful audit can still have
`no-decision-value`.

## Contradictions and rejected output

Include all material contradictions, false positives, missing context,
unsupported claims and participant-rejected recommendations.

## Experiment survival and avoided waste

Where a reversible experiment occurred, report whether the recommendation
survived and what implementation waste was observably avoided. Mark missing
follow-up as missing; do not infer success.

## Repeat-use signal

Report willingness to run another cycle as a secondary signal only.

## Decision

If the fixed rule classifies the observed result without the documented gap,
choose exactly one:

- continue after pilot success;
- run the single permitted redesigned pilot after an inconclusive result;
- reassess beachhead, problem or value proposition after failure.

If the unclassified condition occurred, record `protocol-gap` instead and stop
for an explicit owner decision without relabeling the observed data.

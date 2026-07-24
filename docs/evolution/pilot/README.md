# A2 Research Audit external pilot

This folder operationalizes issue #14 without changing its precommitted sample,
timebox or decision rule. The internal CycleWarden calibration is already complete
and is not part of the external sample.

## Current status

- External audits: **0/6**.
- Pilot clock: **not started**.
- Technical gate: **ready** — PR #31 merged as `8b39e29`.
- Product gate: technical success never counts as decision value by itself.

`A2_RESEARCH_AUDIT_PROTOCOL.json` is the fixed protocol.
`PILOT_STATE.json` is the redacted progress ledger.
`SESSION_TEMPLATE.json` defines one redacted session record.
`REPORT_TEMPLATE.md` defines the final six-session report.

## Recruitment message

> I’m testing whether CycleWarden can help a developer make one real repository
> decision—not whether the interface looks impressive. The session uses one
> repository you control, records your decision before the audit, then compares
> it with an evidence-linked recommendation. It may confirm, change, prevent,
> or fail to help your decision. The session lasts up to 90 minutes. We will not
> merge, deploy, read secrets, or modify production. Participation is voluntary,
> and weak or negative results are equally valuable.

Use the eligibility, exclusion and consent identifiers from the protocol
unchanged for the first six eligible completed primary audits. A missing or
ambiguous consent answer stops the session.

## Operator sequence

1. Confirm `technicalGate.status` remains `ready`; PR #31 is merged.
2. Select an eligible participant and assign the next `P0N`/`R0N` pair.
3. Keep direct identity, repository URL and raw notes outside Git.
4. Save consent and the pre-audit decision before revealing a recommendation.
5. Run one primary audit within 90 minutes and the exact approved scope.
6. Ask the participant to explain and challenge the ranking.
7. Record product outcome separately from technical outcome.
8. Redact the session record, run `node scripts/check-a2-pilot.mjs`, then link
   only the redacted record from `PILOT_STATE.json`.
9. Start the 14-day clock at the first eligible external session.
10. Stop after exactly six eligible completed primary audits and apply the
    fixed decision rule without changing thresholds. The checker derives the
    aggregate verdict from the six linked redacted records and requires
    `finalDecision` to match it.

Replacements are allowed only when a participant withdraws or is found
ineligible before completing the primary audit. Record the reason outside the
six completed slots in `excludedAttempts` without adding a seventh completed
audit. If an excluded attempt started a session, its timestamp still starts or
contributes to the original 14-day clock.

Issue #14 does not classify one possible result: at least three decision-value
audits, fewer than four explainable-and-challengeable rankings, and no repeated
serious failure. If observed, report the protocol gap and stop. Do not invent a
new threshold or silently label it success, inconclusive or failure.

## Data boundary

Do not commit names, contact details, GitHub logins, repository URLs, customer
data, credentials, secrets or raw notes. Commit only pseudonymous redacted
evidence necessary to reconstruct the decision-value classification.

The checker rejects unexpected schema fields, common email/repository URL/token
patterns, mismatched record paths, post-start pre-audit timestamps and
completions after the original 14-day deadline. This automated screen supports
but does not replace the required human redaction review.

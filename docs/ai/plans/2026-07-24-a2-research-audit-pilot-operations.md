# Implementation plan: A2 Research Audit pilot operations

- Status: implemented in draft PR #33; pilot not started
- Date: 2026-07-24
- Issue: #14
- Autonomy: A2 research and planning
- Owner: Codex
- Human gate: participant recruitment, repository access, session consent and
  any change to the precommitted protocol

## Problem and outcome

Issue #14 has a fixed six-participant protocol and an internal calibration, but
the operational record still lives primarily in an issue comment. Create a
repository-backed pilot pack that prevents threshold drift, separates product
value from technical success, and keeps private/raw participant material out of
Git.

## Current evidence

- `docs/evolution/calibration/2026-07-23-next-workstream.md` — internal
  calibration is complete and does not count toward the external sample.
- Issue #14 — exact sample, timebox, outcome definitions and decision rule.
- Issue #14 comment `5058555747` — eligibility, recruitment, consent,
  pre-session capture and outcome protocol.
- Issue #14 comment `5060506682` — external audits remain 0/6 and the pilot
  clock has not started.
- PR #31 — required public repository-search baseline; merged as `8b39e29` on
  2026-07-24 and the technical gate is now ready.

## Acceptance criteria

- [x] Fixed protocol values are machine-readable and cannot drift silently.
- [x] Pilot state contains exactly six pseudonymous participant/repository slots.
- [x] A session cannot start while the PR #31 technical gate is pending.
- [x] Session records require eligibility, consent and a saved pre-audit
  decision before an outcome can be recorded.
- [x] Decision value requires specific evidence plus a causal explanation.
- [x] Contradictions, false positives, missing context and rejected
  recommendations are retained.
- [x] Product outcome, technical outcome and repeat-use intent remain separate.
- [x] Raw notes, direct identity, repository URLs and secret-bearing material
  are forbidden from committed pilot state.
- [x] The checker enforces the 90-minute session limit, the original 14-day
  clock, pre-audit timestamp ordering and exact state/record identity.
- [x] Negative tests cover protocol drift, duplicate slots, premature start,
  missing consent, unsupported decision value and metric conflation.
- [x] `pnpm check:ai` and the AI workflow run the focused checker and tests.

## Out of scope

- recruiting or contacting participants without a human-selected channel;
- accessing any participant repository;
- starting the two-week clock;
- inventing session results;
- modifying the research engine;
- merging any additional pull request without explicit authorization;
- merge, deployment, paid services or production writes.

## Implementation slices

1. Commit the fixed protocol, empty six-slot state and session/report templates.
2. Add a dependency-free validator and negative fixtures.
3. Wire the checks into the existing AI workflow.
4. Open a draft PR and keep the state `not-started` until PR #31 is merged and
   a human schedules the first eligible session.

## Verification

```bash
node scripts/check-a2-pilot.mjs
node scripts/test-a2-pilot.mjs
pnpm check:ai
pnpm verify
git diff --check
```

## Rollback

Remove the pilot pack and its workflow wiring. No runtime state, participant
data, dependency, migration or external service must be cleaned up.

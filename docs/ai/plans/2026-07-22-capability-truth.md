# Implementation plan: machine-verifiable capability truth

- Status: active
- Date: 2026-07-22
- Issue: #2
- Owner: Thunderkill016 + AI implementer
- Reviewer: independent diff review

## Problem and outcome

Contradictory capability status in active docs makes repository context unsafe
for autonomous planning. Create one structured current-status source and a CI
check that verifies its shape and evidence paths.

## Acceptance criteria

- [ ] Registry uses allowed status/verification enums and unique IDs.
- [ ] Implemented/partial claims link to existing repository paths.
- [ ] Missing evidence, invalid JSON, duplicate IDs, or placeholders fail CI.
- [ ] Generated projects receive their own identity and `not-run` verification.
- [ ] Current development/architecture/roadmap docs link to the registry and do
      not repeat stale capability tables.
- [ ] Project model, health report, research, plan, and indexes record this cycle.
- [ ] Existing checks run; unrelated portable E2E failure remains separately
      tracked in issue #3.

## Out of scope

- Product source behavior.
- Auth, database, mail, Stripe, or deploy changes.
- Fixing issue #3.
- Replacing root `IDEA.md` without a human product decision.

## Steps

### 1. Record current evidence

- Files: `docs/ai/PROJECT_MODEL.md`, health/research/improvement records.
- Verification: every material claim references a path or CI observation.
- Risk: incorrect inference; keep blind spots and confidence visible.

### 2. Add capability registry and checker

- Files: `docs/CAPABILITIES.json`, `scripts/check-capabilities.mjs`.
- Verification: run checker against valid registry and negative cases.
- Risk: another stale artifact; connect it to active docs and CI.

### 3. Integrate generation and workflow validation

- Files: generator, generator integration test, workflow checker/action.
- Verification: generate a clean project, validate identity reset and evidence.
- Risk: generated projects inheriting false pass status; reset all to `not-run`.

### 4. Repair active status docs

- Files: architecture, roadmap, development plan.
- Verification: compare against registry and inspected code.
- Risk: overclaiming environment-specific integrations; distinguish implemented,
  partial, passing, failing, and not-run.

### 5. Review and CI

- Run syntax/registry/generator checks and GitHub Actions.
- Review only the issue #2 diff.
- Keep PR draft; do not merge or deploy.

## Rollback

Revert the commits. No runtime data or external service is changed.

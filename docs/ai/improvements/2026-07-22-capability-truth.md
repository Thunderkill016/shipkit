# Improvement proposal — machine-verifiable capability truth

Type: repair / reduce risk  
Status: delivered in draft  
Source health report: `2026-07-22-health-report.md`

## Observed problem

Shipkit has several prose documents that describe different points in time.
`ROADMAP.md` reflects recent work, while `docs/DEVELOPMENT_PLAN.md` still says
notes are memory-only, i18n is unwired, welcome mail is unused, billing is absent,
and portable auth E2E is missing. Current code contradicts those statements.

Because agents use repository documents as context, this is not cosmetic drift:
it can make the agent repeat completed work or prioritize the wrong gap.

## Evidence

- `docs/DEVELOPMENT_PLAN.md` contains stale missing/partial claims.
- `apps/web/src/lib/notes-store.ts` has Postgres operations and user scoping.
- landing/login/app pages use i18n and locale switching.
- `apps/web/src/app/actions/auth.ts` sends welcome mail after signup.
- `/app/billing` and Stripe dependencies exist.
- portable auth and notes-isolation tests exist, although current CI is failing.

## Expected outcome

- One machine-readable file states capability status, evidence paths, and current
  verification state.
- CI rejects invalid status, duplicate IDs, unresolved placeholders, and missing
  evidence files.
- Generated products inherit claims as `not-run` rather than falsely inheriting
  Shipkit's verification result.
- Human docs link to the registry instead of maintaining contradictory tables.

## Confidence and uncertainty

High confidence that drift exists and affects agent context. Medium confidence
that file-path validation alone prevents future semantic drift; runtime tests and
human review remain necessary.

## Options considered

1. Edit stale prose only — cheapest, but drift returns silently.
2. Generate all docs from code — too broad and unable to infer product/runtime
   truth reliably.
3. Registry + dependency-free checker + concise linked docs — selected.
4. Do nothing — rejected because the new autonomous workflow depends on truthful
   repository memory.

## Priority rationale

- Impact: high for every future AI task.
- Confidence: high.
- Urgency: high before calling the template reusable.
- Effort: medium.
- Risk: low; no product behavior changes.
- Reversibility: high.

## Permission gate

A3. Documentation, scripts, generator behavior, and CI only. No app behavior,
auth, data, billing, production, or dependency changes.

## Decision

Deliver in issue #2 and PR #1. Keep portable-pg reliability in issue #3.

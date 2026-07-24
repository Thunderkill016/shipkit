# Portable-pg authentication reliability repair

Date: 2026-07-23  
Issue: #3  
Pull request: #1

## Symptom

`E2E / portable-pg` repeatedly timed out during email/password sign-up while
`Test & Build`, database migration, and demo-mode E2E passed.

## Evidence improvement

The CI job previously retained no Playwright report, trace, screenshot, or video.
The workflow and Playwright configuration now retain those artifacts on failure.
The first diagnostic artifact showed the sign-up form returning:

```text
[# Drizzle Adapter]: The model "user" was not found in the schema object.
Please pass the schema directly to the adapter options.
```

## Root cause

The Postgres migrations contained Better Auth's tables, but the Drizzle instance
was created without a typed schema and the Better Auth adapter was not given an
explicit schema object. Runtime model lookup therefore failed before user/session
creation.

Classification: product integration defect, exposed by CI; not a flaky assertion.

## Fix

- define and export the Better Auth `user`, `session`, `account`, and
  `verification` Drizzle tables in `@cyclewarden/db`;
- pass those table objects explicitly to `drizzleAdapter`;
- preserve Playwright failure artifacts for future portable-path incidents;
- update the capability registry only after clean verification.

## Verification

- unit tests and production build passed;
- demo-mode E2E passed;
- portable-pg sign-up, session creation, protected-app access, note creation, and
  cross-user isolation passed on CI run 39;
- the focused portable-pg job passed again from a clean service container;
- final head CI run 40 and AI workflow check run 33 passed before this
  documentation-only retrospective commit.

## Retained learning

A database migration proving that tables exist is not sufficient evidence that an
ORM adapter can resolve its logical models. ORM-backed auth adapters MUST receive
or import the same schema contract used by migrations. Integration CI MUST retain
failure artifacts before a repeated failure is classified or repaired.

# Evidence ledger — capability truth

## Hypotheses

| ID | Hypothesis | Confidence | Falsifier |
|---|---|---|---|
| H1 | Contradictory repository status is already harming agent legibility | High | Current docs and code agree materially |
| H2 | A structured registry plus CI is the smallest recurring control | High | It requires fragile dependencies or cannot survive generation |
| H3 | Evidence-path validation is useful but insufficient for semantic truth | High | File existence proves runtime behavior |

## Evidence

| ID | Observation | Source and date | Level | Relation | Kind | Confidence |
|---|---|---|---:|---|---|---|
| E1 | Development plan calls notes memory-only, i18n unwired, mail unused, billing absent | `docs/DEVELOPMENT_PLAN.md`, accessed 2026-07-22 | 4 | Supports H1 | Fact | High |
| E2 | Current code contains Postgres notes, localized pages, welcome mail, and billing UI | repository files, accessed 2026-07-22 | 5 | Supports H1 | Fact | High |
| E3 | OpenAI describes structured repository docs, indexes, dedicated linters, CI, and doc gardening to prevent drift | https://openai.com/index/harness-engineering/, published 2026-02-11, accessed 2026-07-22 | 4 | Supports H2 | Source interpretation | High |
| E4 | GitHub checks expose automated pass/fail evidence on pull requests | https://docs.github.com/en/pull-requests/reference/status-checks, accessed 2026-07-22 | 4 | Supports H2 | Fact | High |
| E5 | Existing AI workflow check and generator integration test run successfully without third-party dependencies | GitHub Actions run 7 | 5 | Supports H2 | Fact | High |
| E6 | File existence cannot prove a user journey works | reasoning from E2/E4 and CI separation | 1 | Supports H3 | Agent inference | High |
| E7 | Portable-pg E2E failed on the initial run and failed-job rerun despite evidence files existing | GitHub Actions run 22 / issue #3 | 5 | Supports H3 | Fact | High |

## Contradictions and limits

- A registry creates another artifact that can become stale; therefore it must be
  validated and linked from active docs.
- Evidence paths validate traceability, not semantic correctness.
- CI status is time-bound and may be flaky.
- Human-readable summaries remain useful; the registry should not replace product
  judgment or runtime tests.

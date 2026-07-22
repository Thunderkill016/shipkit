# Research retrospective — capability truth

Date: 2026-07-22  
Final status: delivery in draft

## Decision and confidence

Selected a structured registry plus dependency-free validation. Confidence is
high for traceability benefits and medium for long-term semantic accuracy.

## Most decision-changing evidence

The stale development plan contradicted several concrete current code paths. The
research protocol therefore found a real problem in the repository rather than
inventing a feature.

## Most important contradiction

The existence of a test or implementation file does not mean the behavior is
healthy: portable-pg E2E failed while all evidence paths existed.

## Belief that changed

The initial expectation was that documentation drift would be the only output.
The baseline run exposed a separate repeatable reliability failure and forced it
into a dedicated issue without expanding the current implementation scope.

## Process review

| Question | Answer |
|---|---|
| Strongest method | compare active docs with code, then run the existing CI baseline |
| Misleading source | stale internal development-plan status tables |
| Confirmation-bias control | retained the failing E2E instead of using code presence as proof |
| Missing evidence | exact Playwright/server failure artifact for issue #3 |
| Reusable lesson | capability claims need both repository evidence and separate verification state |

## System learning

- [x] Add a validation check.
- [x] Add structured project memory.
- [x] Create a separate issue for a newly discovered unrelated failure.
- [ ] Do not weaken or hide the failing runtime check.

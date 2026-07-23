# Experiment card — capability registry control

Status: completed in draft PR  
Opportunity: `OPPORTUNITY.md`

## Assumption

A dependency-free registry checker can catch structural/evidence drift and work
inside both Shipkit and a newly generated project.

## Method

Technical spike and integration test.

## Success thresholds

- valid current registry passes;
- missing evidence path fails;
- duplicate/invalid IDs or statuses fail;
- generated registry identity changes to the new project;
- generated verification state resets to `not-run`;
- generated workflow checker passes;
- no third-party package is added.

## Kill thresholds

- generator requires special network access;
- checker needs a schema dependency;
- evidence paths cannot remain valid in the copied scaffold;
- integration materially slows or destabilizes existing checks.

## Result

Implementation and GitHub Actions are the experiment. Final status remains
pending until the latest PR checks finish.

## Decision

Proceed in draft; do not merge while required repository checks are failing.

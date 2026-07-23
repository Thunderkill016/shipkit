# Research brief — preventing capability and documentation drift

Status: completed  
Owner: AI researcher  
Date: 2026-07-22  
Issue: #2

## Decision

Choose the smallest mechanism that lets humans and AI agents distinguish current
implemented capability, partial/integration code, and actual verification while
preventing unsupported repository claims from silently drifting.

## Desired outcome

Current capability claims are traceable, generated projects do not inherit false
verification, and pull requests receive a mechanical pass/fail signal.

## Current belief

A version-controlled JSON registry with evidence paths and a dependency-free
checker is enough for the first control layer, provided it does not pretend file
existence proves runtime behavior.

## Decision-changing evidence

The approach should be rejected or reduced if it creates dependency/tooling cost,
cannot survive project generation, duplicates more truth than it removes, or
cannot catch real stale claims.

## Internal evidence inspected

- `ROADMAP.md`, `docs/DEVELOPMENT_PLAN.md`, `ARCHITECTURE.md`, `IDEA.md`.
- current routes, auth actions, notes store, E2E tests, package scripts, CI.
- existing AI workflow and generator checks.

## External evidence

- OpenAI Harness Engineering: structured repository knowledge, mechanical
  checks, CI, and doc-gardening reduce drift.
- GitHub status checks: automated checks provide detailed pass/fail evidence on
  pull requests and can participate in merge policy.

## Constraints

- No new dependency.
- No runtime behavior change.
- Evidence path existence is traceability, not proof of behavior.
- Generated products must start with `not-run` verification.

## Stop condition

Stop when one low-risk design can be implemented and tested in the existing
workflow without adding a package.

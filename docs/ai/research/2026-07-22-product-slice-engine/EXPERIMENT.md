# Experiment card — executable product contract

Status: technical experiment passed with one dependency risk  
Date: 2026-07-22

## Assumption

One compact contract can safely produce a useful owner-scoped workflow and be
copied into generated projects without adding a paid AI dependency.

## Method

Implement one Feedback Inbox slice and a CLI-generated second-slice contract.
Verify definition/record validation, memory isolation, build, generated-project
inheritance, browser create/delete, and focused Postgres owner/slice isolation.

## Success thresholds

- invalid definitions and records fail;
- CLI creates a valid second slice and rejects duplicates;
- production build passes;
- demo browser creates, lists, and deletes a config-defined record;
- Postgres query/delete cannot cross owner or slice boundaries;
- generated projects inherit the engine with verification reset.

## Results

- unit and contract tests: pass;
- CLI integration: pass;
- production build: pass;
- generated-project integration: pass;
- demo browser create/list/delete: pass;
- focused Postgres schema and isolation: pass;
- full Better Auth portable browser suite: failing, tracked in issue #3.

## Decision

Promote the Product Slice Engine as Shipkit's product differentiator in a stacked
draft. Do not call the complete authenticated portable journey stable. The next
experiment is measured time-to-first-slice in a generated project.

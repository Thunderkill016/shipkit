# Retrospective — Product Slice Engine

Date: 2026-07-22  
Status: delivered in stacked draft

## What changed

Shipkit moved from “foundation plus instructions for the next feature” to an
executable mechanism that creates the first class of domain workflows from a
small versioned contract.

## Evidence that changed the decision

- public starter-kit positioning showed agent rules and infrastructure are
  increasingly common;
- Shipkit's own notes flow proved owner-scoped CRUD was useful but duplicated per
  domain;
- the first generic slice passed unit, CLI, build, demo browser, generator, and
  focused Postgres isolation checks;
- the unresolved auth suite prevented an overclaim about the complete portable
  journey.

## Review findings fixed

- dynamic Zod output initially lost its `Record<string, string>` type at the
  storage boundary;
- the slice page initially created a DB client only to render a storage label;
- the demo E2E initially targeted the first delete button rather than the record
  it created;
- feature-specific Postgres evidence was initially hidden inside a failing
  broader auth job, so a focused job was added.

## Remaining risks

- no measured time saved yet;
- Product Slice pages are not localized;
- JSONB and three field types will not fit complex domains;
- full authenticated browser isolation remains blocked by issue #3;
- no production or user-behavior evidence exists.

## System learning

A breakthrough claim should identify a repeatable mechanism, prove one complete
vertical slice, keep an escape hatch, and expose dependency failures instead of
adding a large feature list.

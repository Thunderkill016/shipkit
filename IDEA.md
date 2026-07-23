# Shipkit Evolution Engine — product source of truth

> This file defines what the Shipkit repository builds.
> Engineering constraints live in `AGENTS.md`; detailed architecture and research decisions live in `docs/evolution/`.

## Product

Shipkit Evolution Engine is a deterministic, evidence-backed control plane around human and AI agents.

It attaches to a project, builds a durable model, researches internal and external evidence, identifies bounded development opportunities, recommends the smallest decision-changing experiment, governs permitted execution, verifies technical and product outcomes, and preserves learning without making unsupported self-improvement claims.

## Primary user

The first beachhead user is a solo developer or open-source maintainer who already uses coding agents and needs a trustworthy answer to:

> What should this project do next, why, and what is the smallest safe experiment that can test it?

Secondary users may include engineering teams and non-expert builders, but their broader workflows must not expand the first MVP.

## First usable MVP — A2 Research Audit

The MVP is read-only with respect to product code:

1. initialize and persist an evolution cycle;
2. inspect and assess an arbitrary repository;
3. frame one explicit product or technical decision;
4. run bounded, reproducible internal and external research;
5. extract atomic claims with source provenance and contradictions;
6. produce at least three evidence-backed opportunities;
7. explain the ranking and rejected alternatives;
8. recommend the smallest reversible experiment;
9. stop with an explicit reason and remaining uncertainty.

The MVP does not modify code, merge, deploy, read secrets, spend money, or mutate production.

## Product structure

```text
Shipkit
├── Evolution Engine       primary product
├── Starter Kit            dogfood/reference project and generator foundation
└── shared packages        reusable auth, database, security and delivery components
```

The existing Next.js starter application remains useful as a realistic dogfood target. It is not the source of truth for Shipkit's primary product direction.

Generated starter projects should copy `templates/STARTER_IDEA.md` and then replace it with their own product definition.

## Success criteria

The first product proof requires:

- setup to first inspected model in under five minutes;
- a complete A2 Research Audit on Shipkit and at least one unrelated real project;
- research claims that can be reconstructed from evidence records;
- visible contradictory evidence and uncertainty;
- three distinct opportunities rather than one generated answer;
- a human reviewer who can explain and challenge the selected experiment;
- at least one real user reporting that the audit changed, confirmed, or prevented a meaningful development decision.

## Non-goals before the A2 MVP is proven

- automatic code modification;
- merge, deploy or production mutation;
- hosted dashboard or marketplace;
- A2A integration;
- multi-agent swarms without measured advantage;
- automatic memory promotion;
- claims of positive recursion or guaranteed monotonic improvement;
- expanding the Starter Kit feature surface as the primary roadmap.

## Product rule

Passing tests proves technical compatibility, not user value. Shipkit accepts a product recommendation only when the decision, evidence, alternatives, experiment and remaining uncertainty are inspectable.

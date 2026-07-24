# Research brief — Product Slice Engine

Status: selected for delivery  
Date: 2026-07-22  
Autonomy: A3  
Target: turn CycleWarden from an AI-friendly boilerplate into an executable product-building system

## Decision

What product mechanism can create a meaningful, defensible jump beyond common SaaS starter kits without paid AI dependencies or a broad rewrite?

## Market observation

Current leading starter kits emphasize production infrastructure: authentication, billing, organizations, admin, i18n, tests, agent rules, MCP, and AI integrations. Those are valuable but increasingly convergent.

The unmet gap is the step after infrastructure: converting a product idea into a safe, owner-scoped, working domain workflow with measurable behavior.

## Selected concept

A declarative Product Slice Engine:

- a project defines slices and fields in one JSON file;
- CycleWarden renders a working create/list/delete workflow;
- Zod validation is derived from the same definition;
- records persist in Postgres and remain scoped by user ID;
- demo mode remains explicit and in-memory;
- a CLI adds a new slice without an LLM or paid API;
- tests verify schema validation and owner isolation.

## Why this can be a breakthrough

A normal boilerplate provides infrastructure and asks the founder or coding agent to build the product. The Product Slice Engine makes the first class of product workflows executable from a compact contract. It reduces idea-to-working-slice time while retaining reviewed architecture and security boundaries.

## Non-goals for the first slice

- arbitrary relational schemas;
- joins, file uploads, payments, or background jobs;
- visual no-code editing;
- AI-generated product decisions;
- replacing custom code after product-market evidence requires it.

## Success criteria

- one config-defined example works in demo and Postgres paths;
- adding a second slice requires only a CLI/config change;
- server validation comes from the slice definition;
- records cannot be read or deleted across owners;
- configured database errors are surfaced instead of silently falling back;
- unit, build, demo E2E, and portable-pg checks provide evidence.

## External evidence consulted

- MakerKit and supastarter now include AI-agent rules and/or MCP, alongside standard SaaS infrastructure.
- Open SaaS includes agent rules, skills, and LLM-friendly documentation.
- These products validate the importance of agent context, but their public positioning still centers on infrastructure rather than a declarative owner-scoped product workflow runtime.

Sources and access date are recorded in `EVIDENCE.md`.

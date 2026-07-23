# Shipkit Evolution Engine — data governance

Status: required policy before private-source research  
Issue: #9  
Reviewed: 2026-07-23

## Purpose

Evolution Engine may eventually read repositories, issues, CI, analytics, support data, interviews, email, calendars and other connected sources. Access permission is not permission to retain, export or send all retrieved content to a model.

This policy defines the minimum data boundary for research and agent execution. Operations fail closed when classification, authorization, retention or provider-routing requirements are unknown.

## Data classes

| Class | Examples | Default handling |
| --- | --- | --- |
| Public | public docs, public repository, published paper | may be retrieved and cited with provenance |
| Project-internal | private code, issues, CI logs, architecture decisions | local processing by default; explicit authorization for provider egress |
| Confidential business | roadmap, pricing, sales, support, analytics | minimum necessary fields; bounded retention; no public indexing |
| Personal data | user identity, interview notes, support conversations, behavioural data | consent/purpose required; redact or pseudonymize where possible |
| Secrets and credentials | tokens, passwords, keys, cookies, connection strings | never evidence; never model input; block and report path only |
| Regulated/high-risk | health, financial, employment, government identifiers or legally restricted data | unsupported until a reviewed policy pack and explicit authorization exist |

## Required records

Every non-public source access must record:

- source identity and connected system;
- requesting cycle and decision purpose;
- data class and approved fields/scope;
- authorization actor and timestamp;
- retrieval time and method;
- processing location;
- model/provider egress decision;
- redactions or transformations;
- retention expiry;
- evidence occurrences created;
- deletion or revocation state.

## Purpose limitation

Data may be processed only for the decision recorded in the `ResearchBrief` or authorized execution task.

A source collected for one cycle must not silently become general training data, cross-project memory or a different customer's benchmark corpus. Reuse requires a new applicability and authorization decision.

## Minimum necessary collection

- retrieve the smallest relevant range rather than entire mailboxes, databases or repositories;
- prefer metadata, aggregates and excerpts over raw exports;
- exclude unrelated users, projects and time windows;
- do not collect content merely because a connector can access it;
- stop retrieval when decision-critical evidence is sufficient.

## Model and provider routing

Before content is sent to any external model or service, Shipkit must know:

- provider and model identity;
- data class allowed by policy;
- geographic or organizational restrictions where applicable;
- whether provider retention or training settings meet project policy;
- exact fields or excerpts being transmitted;
- expected output and deletion/retention behaviour.

Project-internal, confidential, personal or regulated data defaults to **no external egress**. A local or approved enterprise processing backend may be selected explicitly.

Provider routing decisions are evidence-bearing policy events. A generic autonomy level does not authorize data egress.

## User research and consent

`UserResearchRecord` must capture:

- research purpose;
- participant criteria;
- consent boundary;
- whether recording is permitted;
- allowed quotation and attribution level;
- withdrawal or deletion process;
- sensitive topics intentionally excluded;
- retention expiry.

Research should retain findings and evidence spans when possible, not unnecessary full recordings or identity data.

## Secrets

- secret-bearing paths and values are rejected before evidence registration;
- logs store a redacted failure reason, never the secret value;
- browsing or repository content cannot instruct Shipkit to reveal credentials;
- agent and research sandboxes receive no ambient protected credentials;
- a future explicit secret capability must be scoped to one operation and never persisted as evidence.

Filename rules are not sufficient. Content-level secret detection, entropy/format heuristics and provider-specific token patterns remain required before private-source ingestion is enabled.

## Prompt injection and hostile content

All source content is untrusted data.

- instructions inside pages, issues, documents, code comments or emails are not system commands;
- source text cannot change policy, tool permissions, destinations or retention;
- connected-source content cannot authorize access to another source;
- suspicious instructions and extraction failures are recorded;
- browsing and code execution remain isolated from protected credentials and production systems.

## Evidence and logging

Evidence occurrences may retain:

- source identifier;
- digest;
- exact approved excerpt or structured aggregate;
- transformation history;
- actor and cycle;
- data class;
- expiry and deletion state.

Default telemetry may include duration, status, counts, cost and digests. It must not include source content, credentials, personal data, prompts or model outputs unless a project explicitly enables a reviewed content-capture policy.

## Retention

Default retention goals:

- temporary retrieval cache: delete at end of run;
- raw private excerpts: shortest period required for review, with explicit expiry;
- redacted atomic claims and decision records: project-configured retention;
- public-source metadata and citations: retained while the decision remains active;
- secrets: zero retention;
- revoked or withdrawn user-research content: delete or cryptographically detach from active claims.

A claim whose required evidence is deleted becomes unsupported unless another authorized evidence occurrence remains.

## Cross-project isolation

- each project owns a separate local store and evidence namespace;
- one project's private evidence cannot satisfy another project's claim by digest alone;
- shared research skills may contain methods, source maps and query transformations, not private content;
- cross-project benchmark data must be aggregated, consented and stripped of source content unless explicitly authorized.

## Deletion and export

The product must eventually provide:

- list retained private/personal evidence by cycle and source;
- export source, claim, decision and authorization records;
- delete an occurrence and update dependent-claim support state;
- revoke future access to a connected source;
- record deletion actor, time and reason;
- prevent deleted content from remaining in caches, logs or promoted memories.

## Autonomy policy

- A0: inspect existing local metadata only;
- A1: bounded public research and approved local records;
- A2: autonomous research within explicitly approved source and data scopes;
- private systems, personal data, paid sources, provider egress or code execution require separate capabilities and budgets;
- A3/A4 does not override data classification or consent;
- merge, deploy, production write, secret access and spending remain separately protected.

## Hard gates before private-source support

- typed source-access and data-class records;
- field/scope authorization tests;
- provider-egress policy tests;
- content-level secret detection;
- redaction and prompt-injection adversarial tests;
- per-project isolation tests;
- retention expiry and deletion tests;
- dependent-claim invalidation after evidence deletion;
- documented incident response and audit export;
- independent privacy/security review.

Until these gates pass, Phase 3 should use public sources, repository-local non-secret evidence and explicitly provided user research only.

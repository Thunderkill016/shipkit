# PRES governance

## 1. Status

PRES is currently an open Editor's Draft maintained in the Shipkit repository.
The repository owner is the initial editor, not a permanent standards authority.

The goal is to move governance into an open, multi-implementation community if
PRES receives meaningful adoption.

## 2. Principles

Governance SHOULD be:

- open to public review;
- transparent and versioned;
- vendor, model, and framework neutral;
- based on implementation evidence and documented failure cases;
- resistant to capture by a single commercial provider;
- compatible with royalty-free open implementation;
- conservative about expanding autonomy or weakening evidence.

## 3. Document maturity

### Editor's Draft

Work in progress with no claim of consensus.

### Candidate

Normative scope is considered implementable and ready for broad testing.
Promotion requires:

- no known internal normative contradictions;
- at least two pilot implementations or profiles;
- a machine-readable schema and conformance fixtures;
- public issue review;
- documented unresolved questions.

### Recommendation

Recommended for broad implementation. Promotion SHOULD require:

- at least two independent interoperable implementations;
- implementation experience across more than one project or domain;
- public conformance tests;
- security, privacy, and governance review;
- resolution or explicit disposition of major objections;
- documented backward-compatibility strategy.

### Deprecated or Superseded

A document may be deprecated when unsafe, obsolete, or replaced. The reason,
replacement, migration path, and effect on prior claims MUST be published.

## 4. PRES Improvement Proposals

Normative changes SHOULD use a **PIP — PRES Improvement Proposal**.

A PIP includes:

- identifier and title;
- author and disclosures;
- problem and evidence;
- normative proposal;
- compatibility impact;
- security and governance impact;
- implementation and test plan;
- alternatives and rejection conditions;
- status and decision record.

Suggested states:

```text
Draft → Review → Accepted → Implemented → Final
                 ↘ Rejected / Withdrawn / Superseded
```

## 5. Consensus and objections

Consensus does not require unanimity. Editors MUST document material objections
and their disposition.

Normative changes SHOULD prefer demonstrated implementation experience over
purely theoretical preference.

Changes affecting safety, conformance claims, evidence requirements, or autonomy
MUST receive explicit focused review.

## 6. Versioning

PRES uses Semantic Versioning.

Schemas, normative specifications, profiles, and conformance fixtures MUST declare
compatible versions.

A profile MUST NOT claim compatibility with a Core major version it has not been
tested against.

## 7. Extensions and profiles

Extensions SHOULD use namespaced identifiers such as:

```text
org.example.product.revenue-impact
```

The Core extension registry SHOULD eventually record:

- namespace owner;
- schema and version;
- security/privacy considerations;
- compatible Core versions;
- status and deprecation path.

Extensions MUST NOT redefine Core fields or weaken Core requirements.

## 8. Open implementation and intellectual property

The reference implementation is licensed under the Shipkit repository's MIT
license.

The intended policy for the standard text is open, royalty-free implementation.
A formal community standards body SHOULD adopt a clear document and patent policy
before Recommendation status. This draft is not legal advice and does not itself
resolve third-party patent rights.

## 9. Conformance marks

No implementation may imply official PRES certification while the project lacks a
formal certification program.

Implementations MAY make scoped self-assessed claims using the format in
`CONFORMANCE.md`.

The governance process MUST support correction or revocation of misleading
claims if an official registry is later created.

## 10. Reference implementation neutrality

Shipkit is the first reference implementation. Shipkit-specific architecture MUST
NOT become a Core requirement unless at least one independent implementation
demonstrates the need and the community accepts the change.

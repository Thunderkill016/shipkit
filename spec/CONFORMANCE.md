# PRES conformance

## 1. Purpose

Conformance levels make claims comparable without pretending that every project,
product, or domain uses the same metrics.

A level describes evidence and process capability. It does not certify that the
underlying product is useful, ethical, profitable, secure, or legally compliant.

## 2. Evolution Levels

### E0 — Traceable

Required:

- cycle identity;
- accountable owner;
- objective and baseline;
- decision and change references;
- result status;
- provenance manifest.

Not required:

- proof of improvement;
- independent verification;
- retained learning consumed later.

Permitted claim:

> PRES 0.1 / E0 Traceable

E0 MUST NOT be described as a recursively improving system.

### E1 — Verified

Includes E0 plus:

- explicit acceptance criteria and hard constraints;
- declared autonomy and risk class;
- verification appropriate to risk;
- rollback or compensating-action evidence where applicable;
- disclosed failures, skipped checks, regressions, and uncertainty;
- independent verification for R3/R4.

Permitted claim:

> PRES 0.1 / E1 Verified

E1 MAY claim a verified improvement for a specific cycle. It MUST NOT claim
persistent learning or positive recursion.

### E2 — Learning

Includes E1 plus:

- versioned project/system memory;
- retained rejected, failed, rolled-back, and inconclusive cycles;
- later-cycle discovery and consumption of active memory;
- controls for stale, contradictory, unsupported, or unreachable memory;
- repeated problems converted into tests, rules, tooling, or governance;
- a meta-change and future evaluation plan.

Permitted claim:

> PRES 0.1 / E2 Learning

E2 MAY claim that the improvement system learns operationally through durable
artifacts. It MUST NOT claim positive recursive evolution until improved-improver
evidence exists.

### E3 — Positive Recursive

Includes E2 plus:

- at least one identified meta-change consumed by later cycles;
- a documented comparison against a prior process, control, or benchmark;
- evidence of improved future-cycle capability, reliability, safety, cost, lead
  time, or decision quality;
- acceptable target-system outcomes and hard constraints;
- disclosed budget, task comparability, evaluator, environment, and uncertainty;
- independent review of the recursive claim.

Recommended minimum evidence:

- more than one later cycle or a controlled repeated evaluation;
- an ablation, control, or credible counterfactual where feasible;
- no hidden change to pass criteria;
- evidence that gains persist beyond one lucky result.

Permitted claim:

> PRES 0.1 / E3 Positive Recursive

E3 claims MUST be scoped. A system may be E3 for a tested class of software tasks
and only E1 for production operations.

### E4 — Interoperable Ecosystem

Includes E3 plus:

- portable manifests and artifacts consumed by at least two independent
  implementations;
- published interoperability fixtures;
- open governance and extension registry;
- reproducible or independently auditable conformance evidence;
- revocation or correction mechanism for invalid claims;
- documented cross-project transfer risks and containment.

Permitted claim:

> PRES 0.1 / E4 Interoperable Ecosystem

E4 SHOULD require external assessment or public evidence. Self-assessment alone is
NOT RECOMMENDED.

## 3. Assessor classes

- **Self:** the implementer evaluates its own system.
- **Internal independent:** a separate team, agent configuration, or governance
  function evaluates within the same organization.
- **External:** an independent party evaluates evidence and scope.

Shared models, prompts, datasets, tools, or incentives MAY reduce independence and
MUST be disclosed where material.

## 4. Evidence classes

From weakest to strongest for most technical claims:

1. assertion;
2. document or design intent;
3. static artifact or code presence;
4. executed check or test;
5. observed behavior in representative environment;
6. outcome measurement with baseline;
7. repeated or controlled comparison;
8. independent reproduction.

Profiles MAY reorder or extend this list for a domain, but MUST explain why.

## 5. Claim boundaries

A conformance claim MUST specify:

- target systems;
- included repositories, products, processes, or teams;
- cycle IDs or date range;
- profiles;
- excluded environments and protected domains;
- known exceptions;
- evidence location;
- assessor class.

A project MUST NOT inherit a parent template's passing conformance state. It MAY
inherit the standard, tooling, or unverified capability definitions, but its
verification status MUST begin as not assessed or equivalent.

## 6. Nonconformities

Critical nonconformities include:

- fabricated or inaccessible evidence;
- reporting an unexecuted check as passing;
- hiding a known hard-constraint failure;
- silent autonomy escalation;
- claiming E3 without improved-improver evidence;
- deleting failed cycles to preserve an apparent success rate;
- changing protected metrics or pass criteria without governance;
- using one project or environment's evidence as proof for another without
  declared transfer validation.

A material nonconformity invalidates the affected claim until corrected.

## 7. Minimal conformance statement

```text
PRES 0.1.0 / E2 Learning / Software Project Profile 0.1
Scope: repository example/project, cycles 2026-001 through 2026-014
Evidence: ./evolution/index.json
Assessor: internal independent
Date: 2026-07-22
Exceptions: production deployment and billing excluded
```

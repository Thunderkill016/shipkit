# PRES-1: Positive Recursive Evolution Core

**Version:** 0.1.0  
**Status:** Editor's Draft  
**Category:** Open Core Specification

## 1. Normative language

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**,
**SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY**, and
**OPTIONAL** in this document are to be interpreted as described in BCP 14,
RFC 2119 and RFC 8174, when and only when they appear in all capitals.

## 2. Scope

PRES-1 specifies the minimum lifecycle, artifacts, evidence, governance, and
claim requirements for an improvement system that changes a target project or
product through repeated cycles.

PRES-1 is domain-neutral. A profile MAY add domain-specific requirements but MUST
NOT weaken Core requirements.

PRES-1 does not standardize AI model internals, training, consciousness, or a
universal objective function.

## 3. Terms

- **Target system:** the project, product, process, or organization being changed.
- **Improvement system:** the actors, agents, tools, memory, policies, and
  evaluators that select and execute changes.
- **Cycle:** one bounded govern-to-learn sequence.
- **Artifact:** a versioned human- or machine-readable record used by a cycle.
- **Evidence:** an inspectable observation supporting or contradicting a claim.
- **Constraint:** a condition that MUST remain satisfied regardless of target
  metric movement.
- **Meta-change:** a change to the improvement system.
- **Improved-improver evidence:** evidence that a meta-change improved a later
  cycle under a documented comparison.
- **Owner:** the accountable human or organization for the target system.
- **Implementer:** the actor that executes the selected change.
- **Verifier:** the actor or system evaluating the change.
- **Governor:** the actor authorized to approve protected or high-risk action.

## 4. Required principles

A conforming implementation:

1. MUST separate evidence from inference and unsupported assertion.
2. MUST define a bounded objective and constraints before material action.
3. MUST record a baseline and known failures before attributing change impact.
4. MUST declare autonomy and risk before action.
5. MUST preserve provenance from baseline through result.
6. MUST verify behavior with methods appropriate to the risk class.
7. MUST retain negative, rejected, rolled-back, and inconclusive outcomes.
8. MUST update durable memory after each completed cycle.
9. MUST NOT claim positive recursive evolution without improved-improver evidence.
10. MUST NOT silently increase autonomy or weaken constraints to obtain a pass.

## 5. Roles and accountability

Every cycle MUST identify an accountable owner.

The owner MAY delegate research, implementation, and verification, but ownership
of consequences MUST remain explicit.

For risk class R3 or R4:

- the final verifier MUST be independent of the implementer in a manner declared
  by the implementation profile;
- protected actions MUST have explicit governor approval;
- the evaluator, acceptance threshold, or protected objective MUST NOT be changed
  in the same uncontrolled step as the evaluated change;
- rollback or compensating action MUST be tested or otherwise evidenced before
  release when technically possible.

An AI system MUST NOT be represented as the legally or morally accountable owner.

## 6. Required cycle artifacts

A cycle MUST provide durable references to the following artifacts or sections.
They MAY be separate files, records, issues, database objects, or signed events.

### 6.1 Intent

MUST include:

- objective statement;
- affected stakeholders or users;
- success and failure conditions;
- hard constraints;
- autonomy level;
- risk class;
- budget or resource bounds where material;
- protected actions and required approvals.

### 6.2 Baseline and project model

MUST include:

- capture time;
- inspected scope;
- current behavior and state;
- known failures;
- evidence references;
- confidence and material blind spots;
- freshness or refresh trigger.

Documentation MUST be treated as a claim until supported by implementation,
behavioral, operational, or other appropriate evidence.

### 6.3 Candidate set and decision

MUST include:

- at least one candidate and the option to take no action;
- expected outcome;
- evidence and confidence;
- effort, risk, reversibility, and dependencies;
- selected candidate or rejection;
- decision rationale.

A broad audit MUST NOT by itself authorize broad implementation.

### 6.4 Research record

When external or uncertain knowledge is material, the cycle MUST record:

- decision questions written before search;
- source identity, publication date when available, and access date;
- source quality or authority;
- supporting and contradicting evidence;
- distinction among fact, source interpretation, stakeholder statement, and
  agent inference;
- stop condition for research;
- unresolved uncertainty.

### 6.5 Plan and rollback

MUST include:

- acceptance criteria;
- intended change scope;
- out-of-scope items;
- verification plan;
- dependency and migration plan where applicable;
- rollback or compensating-action reference;
- approvals required before execution or release.

### 6.6 Change record

MUST identify:

- changed artifacts;
- implementation actor or system;
- base and result revisions or equivalent immutable identifiers;
- material tool, model, environment, or configuration versions;
- deviations from plan.

### 6.7 Verification record

MUST include:

- checks performed and their results;
- evaluator or verifier class;
- failures, flakes, skipped checks, and unavailable evidence;
- whether verification is independent for the risk class;
- manual-review requirements;
- residual risk.

A check that did not run MUST NOT be reported as passing. The existence of a test
MUST NOT be reported as proof that the tested behavior passed.

### 6.8 Outcome record

MUST include:

- verdict: verified, rejected, rolled back, or inconclusive;
- comparison with baseline;
- metric or qualitative deltas;
- regressions and externalities;
- cost and time when material;
- uncertainty and causal limitations;
- release or non-release decision.

### 6.9 Learning and meta record

MUST include:

- durable memory updated;
- lessons learned;
- repeated failure converted into a proposed or completed control where
  applicable;
- follow-up issues kept outside the current scope;
- meta-change made or proposed;
- future comparison needed to test the meta-change.

## 7. Canonical lifecycle

A conforming cycle MUST transition through the following logical phases, although
an implementation MAY combine their user interface or storage:

```text
GOVERN → OBSERVE → MODEL → DIAGNOSE → RESEARCH → DECIDE
→ PLAN → ACT → VERIFY → MEASURE → LEARN → META-IMPROVE
```

A cycle MAY stop early as rejected or inconclusive. It MUST still retain the
reason and evidence.

A later phase MUST NOT retroactively overwrite earlier baseline evidence without
an auditable correction record.

## 8. Autonomy levels

Implementations MUST declare one autonomy level per cycle.

| Level | Meaning |
|---|---|
| A0 | Observe only; no project mutation. |
| A1 | Diagnose and rank; no delivery. |
| A2 | Research and plan; no material implementation without approval. |
| A3 | Bounded low/medium-risk implementation and draft result. |
| A4 | Sensitive or high-impact delivery requiring explicit gates. |

An implementation MAY define stricter levels. It MUST NOT define a profile that
silently grants more authority than the Core description.

## 9. Risk classes

| Class | Typical impact |
|---|---|
| R0 | Read-only or negligible reversible effect. |
| R1 | Local, low-impact, easily reversible change. |
| R2 | Material project change with bounded users or systems. |
| R3 | Security, privacy, money, production, migration, public API, or broad architecture. |
| R4 | Critical safety, legal, regulated, destructive, or systemic impact. |

Risk classification MUST consider affected stakeholders, reversibility,
uncertainty, blast radius, and external commitments, not only code size.

Profiles MUST define the evidence and approvals required for each class.

## 10. Measurement and constraints

Each cycle MUST declare at least one target outcome or uncertainty-reduction
measure and all material hard constraints.

Implementations SHOULD use a scorecard containing multiple dimensions such as:

- user or stakeholder outcome;
- correctness and reliability;
- security, privacy, and safety;
- cost and resource use;
- lead time and rework;
- accessibility and fairness where relevant;
- maintainability and reversibility;
- knowledge or uncertainty gain;
- future-cycle capability.

A single aggregate score MUST NOT conceal a violated hard constraint.

Measurements MAY be quantitative or structured qualitative evidence. The method
and uncertainty MUST be declared.

## 11. Positive-recursion claim

A system MAY claim an accepted project improvement when:

- the outcome record supports a positive or decision-useful result;
- all hard constraints pass;
- regressions and uncertainty are disclosed;
- required approvals and rollback evidence exist.

A system MUST NOT claim **positive recursive evolution** unless all of the
following are true:

1. it conforms at E2 or higher;
2. a specific retained meta-change is identified;
3. at least one later cycle consumes that meta-change;
4. a documented comparison shows improved capability, reliability, safety,
   cost, lead time, or decision quality;
5. target-system and risk constraints remain acceptable;
6. the comparison discloses task, budget, evaluator, environment, and uncertainty;
7. the claim is reproducible or independently reviewable at a level appropriate
   to the impact.

Repeated prompting, self-critique, or output refinement without these conditions
MUST be described as iterative refinement, not positive recursive evolution.

## 12. Memory consumption requirement

At E2 and above, durable memory MUST be discoverable and actually consumed by
later cycles.

A file that exists but is not linked, loaded, queried, or enforced does not
satisfy this requirement.

Implementations MUST define at least one test or audit that can detect stale,
unreachable, contradictory, or unsupported active memory.

## 13. Provenance

The portable manifest MUST identify:

- target-system identity;
- cycle identity;
- base and result revisions or equivalents;
- material agent/model/tool identifiers;
- artifact references;
- human approvals;
- timestamps;
- verification result and status.

Sensitive provenance MAY be redacted or access-controlled, but the redaction and
its impact on verification MUST be disclosed.

## 14. Portability

PRES Core artifacts SHOULD use open, documented formats.

A conforming manifest MUST validate against the versioned PRES JSON Schema or an
extension schema that declares Core compatibility.

Extensions MUST use namespaced fields and MUST NOT change the meaning of Core
fields.

## 15. Safety and security

Implementations MUST:

- prevent unauthorized autonomy escalation;
- protect secrets and personal or regulated data;
- preserve evidence of rejected and failed cycles;
- prevent an implementer from silently changing pass criteria;
- record external side effects and commitments;
- provide stop, rollback, or containment mechanisms appropriate to risk;
- disclose when an evaluator shares a model, prompt, data source, or other
  dependency that weakens independence.

Implementations SHOULD threat-model memory poisoning, prompt injection, tool
misuse, evaluator gaming, provenance forgery, and cross-project transfer of unsafe
methods.

## 16. Conformance claims

A public conformance claim MUST state:

```text
PRES <spec version> / Evolution Level <E0-E4> / Profile <name and version>
Scope: <systems and cycle range>
Evidence: <public or controlled reference>
Assessor: <self, internal independent, or external>
Date: <ISO 8601 date>
Known exceptions: <list>
```

A claim MUST NOT imply certification by the PRES project unless a future
certification process explicitly grants it.

## 17. Versioning

PRES follows Semantic Versioning for normative interfaces and schemas.

- MAJOR: incompatible normative or schema change;
- MINOR: backward-compatible requirement or extension capability;
- PATCH: clarification or editorial correction without changed conformance.

Draft status MAY include pre-release labels.

## 18. Profiles

A profile MUST declare:

- domain and scope;
- artifact mapping;
- autonomy and risk interpretation;
- required evaluators and checks;
- domain metrics and constraints;
- additional threat model;
- profile conformance tests.

Profiles MUST NOT remove Core evidence, provenance, memory, or positive-recursion
claim requirements.

## 19. Implementation status

PRES-1 0.1.0 is an Editor's Draft. Implementers SHOULD report ambiguity,
conflict, infeasible requirements, and real failure cases before the document is
promoted to Candidate status.

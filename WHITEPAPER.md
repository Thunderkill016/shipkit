# PRES White Paper

## Positive Recursive Evolution Standard

**Version:** 0.1.0 Editor's Draft  
**Date:** 2026-07-22  
**Status:** Proposal for public review; not yet a consensus standard  
**Reference implementation:** Shipkit Evolution Engine

---

## Abstract

AI systems can now research, plan, write code, operate tools, and evaluate their
own outputs. This increases production speed, but speed alone does not create an
evolving product. Repeated autonomous changes can just as easily compound
technical debt, false beliefs, security risk, documentation drift, metric gaming,
and dependence on opaque agents.

PRES — the **Positive Recursive Evolution Standard** — defines an open,
vendor-neutral method for projects and products to improve through repeated,
evidence-driven cycles while also improving the capability of future improvement
cycles.

PRES distinguishes three claims that are often incorrectly treated as the same:

1. **Output refinement:** a later answer or artifact is better than an earlier one.
2. **Project improvement:** a real project or product outcome improves after a
   change.
3. **Improved-improver evidence:** a retained change to the improvement system
   makes later improvement cycles measurably more capable, reliable, efficient,
   or safe.

Only the third claim is recursive improvement. PRES requires durable memory,
provenance, explicit objectives, baseline evidence, bounded action, independent
verification, rollback, outcome measurement, and meta-learning before a system
may claim positive recursive evolution.

PRES does not require a particular model, vendor, framework, repository host,
blockchain, or programming language. It can be applied to software, products,
operations, research, education, organizations, and other systems where actions
and outcomes can be observed.

---

## 1. The problem

Generative AI has reduced the cost of producing plausible work. It has not
removed the cost of determining whether that work is correct, valuable, safe,
and durable.

A system that repeatedly acts without trustworthy feedback tends to create a
negative recursive loop:

```text
more output
→ larger and less legible system
→ weaker understanding
→ lower-quality decisions
→ more rework and hidden risk
→ still more output
```

Common failure modes include:

- optimizing code cleanliness instead of user or business outcomes;
- accepting an agent's self-review as independent evidence;
- treating the existence of code or tests as proof that behavior works;
- retaining successful-looking outputs while discarding failed experiments;
- allowing stale documentation to become future agent context;
- maximizing one metric while transferring cost or risk elsewhere;
- changing the evaluator and the evaluated system in the same uncontrolled step;
- increasing autonomy faster than verification and rollback capability;
- calling any repeated refinement "self-evolution."

The result is not evolution. It is automated entropy.

## 2. The PRES thesis

A project can enter a positive recursive loop when every accepted cycle creates
both:

1. a bounded improvement or decision-quality gain in the target system; and
2. durable evidence, memory, tooling, or governance that increases the expected
   quality of future cycles.

The core loop is:

```text
observe
→ model
→ diagnose
→ research
→ decide
→ act
→ verify
→ measure
→ learn
→ improve the improvement system
→ repeat
```

The loop is positive only when the evidence supports improvement after accounting
for regressions, risk, cost, uncertainty, and irreversibility.

PRES treats recursive evolution as a **socio-technical management and engineering
system**, not as a claim that an AI model is conscious, human-like, or modifying
its own neural weights.

## 3. What PRES is

PRES is:

- an open specification for governed project and product evolution;
- a common vocabulary for comparing implementations;
- a portable artifact format for recording evolution cycles;
- a conformance model with increasing levels of evidence;
- a safety model for autonomy, risk, separation of duties, and rollback;
- a method for distinguishing genuine meta-improvement from repeated output;
- a base standard that domain-specific profiles may extend.

PRES is not:

- a token, cryptocurrency, blockchain, or consensus network;
- a promise of guaranteed monotonic improvement;
- a single scalar "fitness" function for all human values;
- permission for an AI system to merge, deploy, spend money, alter production,
  or change protected objectives without authorization;
- a substitute for domain experts, law, regulation, or organizational
  accountability;
- evidence of artificial consciousness or general intelligence.

## 4. Core definitions

### 4.1 Target system

The project, product, process, organization, research program, or other system
being improved.

### 4.2 Improvement system

The people, agents, tools, memory, prompts, policies, tests, evaluators, and
workflows that select and execute changes to the target system.

### 4.3 Evolution cycle

A bounded sequence from objective and baseline through decision, action,
verification, outcome measurement, and retained learning.

### 4.4 Project memory

Versioned, discoverable artifacts that preserve current state, evidence,
decisions, failures, constraints, and lessons for later cycles.

### 4.5 Meta-improvement

A change to the improvement system itself, such as a better test, evaluator,
research method, repository map, decision rule, rollback mechanism, or tool.

### 4.6 Improved-improver evidence

Evidence that a meta-improvement caused or materially contributed to better
future cycles under a comparable task, budget, risk class, or evaluation
protocol.

### 4.7 Positive recursion

A sustained condition where accepted cycles improve the target system while
some cycles also improve the expected performance of future evolution cycles,
without exceeding declared safety, risk, cost, or reversibility constraints.

### 4.8 Negative recursion

A feedback loop where apparent progress degrades future decision quality,
legibility, safety, maintainability, trust, or resource efficiency.

## 5. The three proofs

PRES separates three levels of proof.

### Proof A — artifact improvement

The new artifact is preferred or scores better than the old artifact.

This is useful but weak. It may be based on subjective judgment, a self-judge, or
an evaluator vulnerable to gaming.

### Proof B — target-system improvement

A project or product outcome improves against a recorded baseline and acceptance
criteria while required constraints pass.

Examples:

- fewer escaped defects;
- improved activation or task completion;
- lower latency or cost;
- reduced uncertainty before a strategic decision;
- safer or more reversible operations;
- shorter verified lead time.

### Proof C — improved improver

A retained meta-change improves later evolution cycles.

Examples:

- a new repository model reduces investigation time on later tasks;
- a regression test prevents recurrence in later releases;
- a research evidence ledger lowers false-source or stale-source decisions;
- a better experiment template rejects weak ideas earlier and more cheaply;
- a new isolation harness increases defect detection under the same budget;
- a portable manifest lets a different agent or implementation continue the
  cycle without losing context.

A system MUST NOT claim positive recursive evolution from Proof A alone. PRES
Evolution Level E3 requires Proof C.

## 6. System architecture

A PRES implementation contains seven logical planes.

```text
Intent and governance
        ↓
Perception and project model
        ↓
Diagnosis and opportunity discovery
        ↓
Research and decision
        ↓
Bounded execution
        ↓
Verification and outcome measurement
        ↓
Memory and meta-improvement
        ↺
```

### 6.1 Intent and governance plane

Defines ownership, objectives, protected values, autonomy, risk tolerance,
budget, approvals, and stop conditions.

### 6.2 Perception plane

Builds an evidence-backed model of current reality: users, journeys, modules,
assets, dependencies, data, constraints, metrics, incidents, and blind spots.

### 6.3 Diagnosis plane

Identifies defects, risks, bottlenecks, opportunities, and unknowns. It ranks
candidates transparently rather than choosing the easiest visible work.

### 6.4 Research and decision plane

Collects internal and external evidence, seeks contradiction, separates fact
from inference, and selects one bounded candidate or experiment.

### 6.5 Execution plane

Implements only the authorized scope with an explicit plan, rollback path, and
protected boundaries.

### 6.6 Verification plane

Runs mechanical checks, behavioral evaluation, independent review, and outcome
measurement. It records failures rather than hiding or relabeling them.

### 6.7 Memory and meta plane

Retains the cycle, updates current-state artifacts, extracts reusable lessons,
and tests whether changes to the improvement system help later cycles.

## 7. The canonical evolution cycle

Every conforming cycle follows these phases:

1. **Govern** — define owner, objective, autonomy, risk, budget, protected areas,
   and completion condition.
2. **Observe** — capture a current baseline and known failures.
3. **Model** — record inspected scope, evidence, confidence, freshness, and blind
   spots.
4. **Diagnose** — create evidence-backed candidates.
5. **Research** — resolve only decision-critical unknowns and seek contradictory
   evidence.
6. **Decide** — select one candidate, including the option to reject, defer, or do
   nothing.
7. **Plan** — define acceptance criteria, tests, rollback, dependencies, and
   approvals.
8. **Act** — execute the smallest useful reversible slice.
9. **Verify** — run required checks and independent evaluation appropriate to the
   risk class.
10. **Measure** — compare outcome metrics with the baseline and record uncertainty,
    regressions, externalities, and cost.
11. **Learn** — update durable memory and create follow-up issues rather than
    silently expanding scope.
12. **Meta-improve** — identify whether the improvement process itself should
    change and define how that change will be tested in a later cycle.

A cycle may end as verified, rejected, rolled back, or inconclusive. A rejected or
inconclusive cycle can still produce valuable learning.

## 8. Positive-recursion invariant

PRES does not require every metric to improve every cycle. Real systems have
trade-offs and noisy measurements. It requires a declared multi-objective
scorecard and hard constraints.

A useful conceptual model is:

```text
net cycle value
= target outcome gain
+ knowledge and uncertainty gain
+ future-cycle capability gain
- regression and externality cost
- resource cost
- risk and irreversibility cost
```

Implementations SHOULD retain the vector of underlying measures instead of
collapsing all values into one score. A single score is vulnerable to Goodhart's
law and can hide transferred risk.

An accepted cycle MUST:

- meet all declared hard constraints;
- provide evidence for its outcome verdict;
- record regressions and unresolved uncertainty;
- preserve rollback or compensating-action evidence where applicable;
- update durable memory.

A positive-recursion claim additionally MUST demonstrate that a retained
meta-change improved later-cycle capability, cost, reliability, safety, or
decision quality under a documented comparison.

## 9. Conformance levels

PRES defines five Evolution Levels.

### E0 — Traceable

The system records objective, baseline, decision, change, result, and provenance.
This is observability, not proof of improvement.

### E1 — Verified

Cycles use explicit acceptance criteria, checks, risk boundaries, and rollback.
Material claims have evidence beyond the implementer's assertion.

### E2 — Learning

Lessons, failures, decisions, and current state are retained in durable memory and
are discoverable by later cycles. Repeated failures are converted into tests,
rules, tools, or governance changes.

### E3 — Positive Recursive

The system produces improved-improver evidence: at least one meta-change is shown
to improve later cycles under a documented comparison, while target-system and
risk constraints remain acceptable.

### E4 — Interoperable Ecosystem

Cycle artifacts are portable across independent implementations; governance is
open; conformance evidence is independently reproducible; and multiple projects
or organizations can exchange validated methods without inheriting hidden state
or authority.

Higher levels include all lower-level requirements. Detailed requirements are in
`spec/CONFORMANCE.md`.

## 10. Autonomy and risk

PRES separates autonomy from capability.

A capable agent is not automatically authorized to act. Implementations declare
an autonomy level from observation through sensitive delivery and a risk class
from negligible to critical.

Higher-risk work requires stronger evidence, separation of duties, explicit human
approval, and rollback. High-impact changes MUST NOT be approved only by the same
agent that proposed and implemented them.

Protected areas commonly include:

- identity, authentication, and authorization;
- production and destructive data operations;
- money, billing, purchasing, and resource commitments;
- secrets and security controls;
- legal, privacy, safety, and regulated decisions;
- major objective, evaluator, or governance changes;
- irreversible external communication or deployment.

## 11. Memory, provenance, and portability

The improvement system cannot compound learning if its evidence remains trapped
in chat history or private memory.

PRES requires versioned references to:

- objective and constraints;
- current-system model and baseline;
- candidates and decision reasoning;
- sources and evidence quality;
- plan and rollback;
- change artifacts;
- verification and reviewer identity or class;
- outcome deltas and uncertainty;
- lessons and meta-changes;
- approvals and provenance.

The `pres-cycle.json` manifest is a portable index. It references richer human-
readable and machine-readable artifacts rather than attempting to embed all
project knowledge in one file.

## 12. Economics of compounding

The economic promise of PRES is not unlimited autonomous output. It is a declining
cost of trustworthy improvement.

A positive system should eventually reduce one or more of:

- time to understand current state;
- cost of finding decision-relevant evidence;
- defect escape and rework;
- time to reject a weak idea;
- cost of reproducing and verifying behavior;
- dependence on a specific person, model, or vendor;
- recovery time after failure;
- uncertainty in prioritization.

The saved resources can fund more or better cycles. This is the practical meaning
of positive recursion.

## 13. Threats and anti-patterns

A PRES implementation MUST address:

- **self-approval:** proposer, implementer, and final verifier are not sufficiently
  independent for the risk class;
- **evaluator capture:** the system changes the metric or test to make itself pass;
- **memory poisoning:** unsupported claims become future context;
- **selective retention:** successful cycles are retained while failures vanish;
- **metric monoculture:** one metric improves while safety or long-term value
  declines;
- **scope expansion:** an audit becomes authorization for broad changes;
- **autonomy escalation:** an agent silently moves to a higher permission level;
- **irreversible experimentation:** a hypothesis is tested directly in production
  without containment;
- **vendor lock-in:** memory or evidence cannot be exported;
- **ceremonial compliance:** documents exist but are not consumed, tested, or
  connected to decisions;
- **pseudo-recursion:** repeated iteration is marketed as recursive improvement
  without improved-improver evidence.

## 14. Application beyond software

PRES Core is domain-neutral. Profiles may define domain-specific artifacts and
checks.

### Product development

Use customer evidence, activation, retention, workflow completion, experiment
results, and research confidence as outcome measures.

### Research

Use hypotheses, protocols, datasets, reproducibility, negative results, and
uncertainty reduction.

### Operations

Use incidents, service levels, recovery time, cost, control effectiveness, and
process capability.

### Education

Use learning outcomes, retention, accessibility, learner effort, and curriculum
improvement evidence.

### Organizations

Use decision lead time, execution quality, knowledge transfer, risk, and the
ability of later teams to make better decisions from retained evidence.

No profile may weaken Core safety, provenance, or claim requirements.

## 15. Shipkit as the first reference implementation

Shipkit contains an early implementation of the PRES architecture:

- repository-local project model and capability registry;
- discovery, research, improvement, planning, implementation, review, and
  verification loops;
- explicit autonomy levels and safety gates;
- durable research and improvement memory;
- issue-shaped work and draft pull requests;
- mechanical checks against missing or unsupported repository claims;
- dogfood cycles that convert findings into tests and workflow improvements.

Shipkit currently maps to **PRES E2 — Learning**, not E3. It has evidence that
lessons are retained and reused, but it does not yet have a controlled benchmark
showing that a specific meta-improvement caused later cycles to become better.
This limitation is intentional and prevents the reference implementation from
using its own standard as marketing without evidence.

See `spec/SHIPKIT-PROFILE.md`.

## 16. Adoption path

A project can adopt PRES incrementally:

1. add a cycle manifest and durable evidence references;
2. record baselines and explicit outcome metrics;
3. add bounded risk and autonomy declarations;
4. connect verification and rollback to each material change;
5. retain failures, decisions, and lessons;
6. ensure later agents or teams actually consume the retained memory;
7. benchmark a meta-improvement under comparable conditions;
8. publish conformance evidence and invite independent implementation.

PRES does not require replacing existing agile, DevOps, research, governance, or
quality systems. It provides a common recursion and evidence layer across them.

## 17. Governance and openness

This draft follows established ideas from open technical standards:

- normative `MUST`, `SHOULD`, and `MAY` language;
- semantic versioning;
- public improvement proposals;
- editor draft, candidate, recommendation, and deprecated stages;
- implementation experience before stable recommendation;
- open, royalty-free implementation intent;
- profiles and extension registries rather than vendor forks of Core.

The current repository is not yet a standards body. PRES 0.1 is an editor's draft
published to obtain implementation experience and criticism.

## 18. Limitations and open questions

PRES cannot guarantee that:

- objectives are ethically correct;
- measurements capture every affected stakeholder;
- independent reviewers are free of shared bias;
- causality is established from a small number of cycles;
- a high conformance level implies a high-quality product;
- recursive gains continue indefinitely;
- a process optimized in one environment transfers to another.

Open research questions include:

- minimum evidence needed to attribute a future-cycle gain to a meta-change;
- robust multi-objective evaluation under changing environments;
- privacy-preserving exchange of evolution memory;
- preventing ecosystem-level monoculture and correlated failure;
- certification and revocation of conformance claims;
- profile design for non-software domains;
- governance when agents participate in proposing standard changes.

## 19. Roadmap

### 0.1 Editor's Draft

- core vocabulary and lifecycle;
- conformance levels;
- portable cycle manifest;
- Shipkit implementation profile;
- initial validator and example.

### Candidate 0.2

- external review;
- at least two non-Shipkit pilot projects;
- clarified evidence and risk profiles;
- interoperability test suite;
- documented failures and revisions.

### 1.0 Recommendation target

- multiple independent implementations;
- public conformance fixtures;
- stable governance and extension process;
- security and privacy review;
- evidence that artifacts can move between implementations;
- no unresolved normative contradictions.

## 20. References

- IETF RFC 2119 — https://datatracker.ietf.org/doc/rfc2119/
- IETF RFC 8174 — https://datatracker.ietf.org/doc/html/rfc8174
- NIST AI RMF 1.0 — https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10
- NIST Generative AI Profile — https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence
- ISO/IEC 42001 overview — https://www.iso.org/standard/42001
- SLSA specification — https://slsa.dev/spec/v1.2/
- W3C Process — https://www.w3.org/policies/process/
- JSON Schema 2020-12 — https://json-schema.org/draft/2020-12
- Semantic Versioning — https://semver.org/
- Open Standards Requirement — https://opensource.org/osr
- Reflexion — https://arxiv.org/abs/2303.11366
- Self-Refine — https://arxiv.org/abs/2303.17651
- OpenAI Harness Engineering — https://openai.com/index/harness-engineering/

---

## Conclusion

The central claim of PRES is simple:

> A system is not positively recursive because it changes itself repeatedly. It
> is positively recursive only when evidence shows that it improves real
> outcomes, preserves declared constraints, retains learning, and makes future
> improvement cycles better.

PRES turns that claim into something portable, testable, governable, and open to
independent implementation.

# CycleWarden — unified product source of truth

> This file defines the single product built by this repository.
> Engineering constraints live in `AGENTS.md`; architecture, research and implementation details live in `docs/evolution/`.

## Product

**CycleWarden is one integrated AI-native product development system.**

It helps a person or team take a project through one governed lifecycle:

```text
idea and product definition
→ foundation and workspace
→ repository and product understanding
→ modern internal/external research
→ opportunity discovery and experiment selection
→ agent-assisted implementation
→ independent verification and security review
→ release and deployment
→ product-outcome measurement
→ retained learning and controlled improvement
```

The deterministic Evolution Engine is the control core of CycleWarden, not a separate product. The web workspace, starter foundation, generator, research system, agent adapters, sandbox, evidence registry, verification, deployment, integrations and learning system are modules of the same product.

## Product promise

> Give CycleWarden a product objective and a repository. CycleWarden understands the current system, researches what should happen next, builds the selected change through governed agents, verifies it, ships it safely, measures the result and uses accepted evidence to improve future cycles.

## Users

CycleWarden must ultimately support:

- solo developers using coding agents;
- product and engineering teams coordinating human and AI work;
- open-source maintainers improving real repositories;
- builders who need a ready product foundation instead of assembling auth, data, security and deployment from zero.

The initial beachhead remains developers already using coding agents, but this narrows validation—not the final product boundary.

## Unified product modules

```text
CycleWarden
├── Product Workspace
│   ├── product brief, roadmap and experiment surfaces
│   ├── generated application foundation
│   └── human review and approval experience
├── Evolution Kernel
│   ├── durable cycles and legal transitions
│   ├── autonomy/risk policy and approvals
│   └── rollback, recovery and resumability
├── Research Intelligence
│   ├── repository, web, paper, competitor and user research
│   ├── claims, citations, contradictions and uncertainty
│   └── opportunity portfolio and experiment selection
├── Execution and Sandbox
│   ├── command and coding-agent adapters
│   ├── isolated branches and workspaces
│   └── capability-negotiated containment
├── Verification and Evidence
│   ├── tests, CI, reviews, provenance and attestations
│   └── technical, security and product-outcome verdicts
├── Delivery and Operations
│   ├── project generation, auth, data and integrations
│   ├── draft PR, release, deploy and rollback
│   └── local, self-hosted and hosted operation
├── Learning and Improvement
│   ├── durable memory and reusable skills
│   ├── paired evaluation and benchmark comparison
│   └── promotion, expiry and retirement
└── Interoperability
    ├── GitHub, MCP, A2A and external tools
    └── optional telemetry and portable trust
```

Implementation packages may be separated for safety and maintainability, but they must converge into one user-visible CycleWarden workflow and one shared state, policy and evidence model.

## Integrated product loop

A complete CycleWarden cycle is:

```text
created
→ observed
→ modeled
→ diagnosed
→ researched
→ decided
→ planned
→ executing
→ implemented
→ verified
→ measured
→ learned
→ meta-improved when proven
→ completed
```

The product may stop at `rejected`, `rolled-back` or `inconclusive`. No module may bypass the cycle, policy or evidence system.

## Current integration milestone

The next milestone is an **A2 Research and Decision slice inside the complete product loop**:

1. initialize a durable cycle;
2. inspect the repository and existing product foundation;
3. assess technical and product readiness;
4. frame one explicit decision;
5. run bounded reproducible research;
6. extract atomic claims and contradictions;
7. rank at least three opportunities;
8. select the smallest reversible experiment;
9. hand the accepted decision to the future execution module through the same persisted cycle.

This milestone ends before code mutation because sandboxed execution is not safe yet. It is not the final product and it does not remove execution, delivery, measurement or learning from CycleWarden.

## Final product requirements

CycleWarden is not complete until the same product can:

- create or attach to a real product repository;
- provide a usable workspace and application foundation;
- understand code, architecture, users and product context;
- conduct high-quality modern research;
- preserve claims, sources, contradictions and uncertainty;
- choose experiments and implementation plans;
- execute through interchangeable agents in a real sandbox;
- open reviewable changes and support rollback;
- verify technical, security and product outcomes independently;
- release and deploy through explicit authorization;
- measure actual user and business results;
- reuse learning only when later evidence shows benefit;
- expose the complete lifecycle through one coherent interface.

## Success criteria

Near-term proof:

- setup to first inspected project model in under five minutes;
- an evidence-backed research and decision cycle on CycleWarden and an unrelated project;
- a real user confirms that CycleWarden changed, confirmed or prevented a meaningful decision.

Full-product proof:

- at least one end-to-end cycle from product objective through sandboxed implementation, verification, release and measured outcome;
- the workspace, generator, engine, research, execution, evidence, deployment and learning modules use the same durable cycle;
- at least two interchangeable agent clients can perform the same governed task;
- unsafe actions fail closed and every accepted action is explainable;
- measured later-cycle learning improves a comparable task without unacceptable regressions.

## Product rules

1. CycleWarden is one product; modules are not competing product lines.
2. Sequencing implementation is allowed; deleting the unified destination is not.
3. The workspace and starter foundation are part of the product experience, not disposable demos.
4. Research determines what to build; agents do not own the decision.
5. Execution never bypasses policy, evidence, sandbox or verification.
6. Passing tests proves technical compatibility, not user value.
7. A learning or self-improvement claim requires later-cycle causal evidence.
8. Active documentation must distinguish implemented, integrated, planned and experimentally proven capability.
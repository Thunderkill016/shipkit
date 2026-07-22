# AI Engineering Workflow

Shipkit uses a repository-first workflow: important context, decisions, plans,
research, and verification live in Git instead of being trapped in chat history.

## Delivery loop

```text
Issue / request
      ↓
Explore without editing
      ↓
Define acceptance criteria
      ↓
Plan when risk or scope requires it
      ↓
Implement one small slice
      ↓
Run focused checks
      ↓
Run pnpm verify
      ↓
Independent diff review
      ↓
Fix accepted findings
      ↓
PR + merge
      ↓
Update docs/rules when a lesson repeats
```

## Autonomous improvement loop

Use this when the request is open-ended, such as “understand this project and
improve it.”

```text
Set objective and autonomy level
      ↓
Build an evidence-backed project model
      ↓
Validate baseline and trace critical journeys
      ↓
Diagnose and rank problems/opportunities
      ↓
Select one bounded candidate
      ↓
Research decision-critical unknowns
      ↓
Plan → implement if permitted → verify → draft PR
      ↓
Measure outcome and update project memory
```

Read `docs/ai/AUTONOMOUS_IMPROVEMENT.md`. Default to research and planning
(A2), not broad implementation, when autonomy is not explicit.

## Discovery loop

Use this before building an uncertain, innovative, or supposedly breakthrough
idea:

```text
Decision and target outcome
      ↓
Internal evidence
      ↓
Current external research
      ↓
Evidence ledger + contradiction
      ↓
Opportunity map
      ↓
Multiple mechanisms
      ↓
Riskiest assumption
      ↓
Cheapest decision-changing experiment
      ↓
Reject / park / research / prototype / spike / delivery
```

Read `docs/ai/DISCOVERY_RESEARCH.md`. Discovery does not authorize editing
product code.

## Which document to read

| Need | Source |
|---|---|
| Product goal | `IDEA.md` |
| Agent rules | `AGENTS.md` |
| Architecture | `ARCHITECTURE.md` |
| Open-ended project improvement | `docs/ai/AUTONOMOUS_IMPROVEMENT.md` |
| Product or technical discovery | `docs/ai/DISCOVERY_RESEARCH.md` |
| Full task lifecycle | `docs/ai/TASK_LIFECYCLE.md` |
| Roles and responsibility | `docs/ai/OPERATING_MODEL.md` |
| Context management | `docs/ai/CONTEXT_ENGINEERING.md` |
| Test and evidence policy | `docs/ai/VERIFICATION.md` |
| Risk and permissions | `docs/ai/SAFETY.md` |
| Learning support | `docs/ai/LEARNING_MODE.md` |
| Reusable prompts | `prompts/` |
| Reusable agent workflows | `.agents/skills/` |
| Templates | `docs/ai/templates/` |
| Active plans | `docs/ai/plans/` |
| Research memory | `docs/ai/research/` |
| Improvement memory | `docs/ai/improvements/` |

## Daily commands

```bash
pnpm check:ai   # validate workflow files
pnpm verify     # typecheck + lint + tests + build + workflow validation
```

## Fast rule

Small, obvious, low-risk edit: inspect → edit → focused check → diff review.

Defined task: explore → acceptance criteria → saved plan when needed →
implement → verify → independent review.

Open-ended improvement: model → baseline → diagnose → rank → research → one
bounded delivery candidate. Never turn an audit into an unlimited cleanup PR.

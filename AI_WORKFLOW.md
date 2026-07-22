# AI Engineering Workflow

Shipkit uses a repository-first workflow: important context, decisions, plans,
and verification live in Git instead of being trapped in chat history.

## The operating loop

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

## Which document to read

| Need | Source |
|---|---|
| Product goal | `IDEA.md` |
| Agent rules | `AGENTS.md` |
| Architecture | `ARCHITECTURE.md` |
| Full lifecycle | `docs/ai/TASK_LIFECYCLE.md` |
| Roles and responsibility | `docs/ai/OPERATING_MODEL.md` |
| Context management | `docs/ai/CONTEXT_ENGINEERING.md` |
| Test and evidence policy | `docs/ai/VERIFICATION.md` |
| Risk and permissions | `docs/ai/SAFETY.md` |
| Learning support | `docs/ai/LEARNING_MODE.md` |
| Reusable prompts | `prompts/` |
| Reusable agent workflows | `.agents/skills/` |
| Templates | `docs/ai/templates/` |
| Active plans | `docs/ai/plans/` |

## Daily commands

```bash
pnpm check:ai   # validate the workflow files
pnpm verify     # typecheck + lint + tests + build + workflow validation
```

## Fast rule

Small, obvious, low-risk edit: inspect → edit → focused check → diff review.

Everything else: explore → acceptance criteria → saved plan → implement →
verify → independent review.

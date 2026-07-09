# Vibe coding with Shipkit

## The loop

```text
1. Write / update IDEA.md     ← what you're building
2. pnpm doctor && pnpm dev    ← foundation running
3. Tell the agent:            ← implement ONLY product scope
   "Read IDEA.md + AGENTS.md.
    Implement the next MVP slice.
    Do not change adapters unless asked."
4. Click through /app         ← verify
5. Commit small               ← keep diffs reviewable
```

## What you should vibe

- Landing copy and sections  
- Dashboard features  
- Domain tables + UI  
- Business rules  

## What you should not vibe-rewrite

- Auth protocol (use `getAuth()` / AuthPort)  
- Security header package (extend carefully)  
- Random new frameworks mid-project  

## Prompt starters

**MVP slice**

> Read `IDEA.md` and `AGENTS.md`. Implement the next unchecked MVP item.  
> Add routes under `apps/web/src/app/app/`. Validate inputs with Zod.  
> Do not add new npm dependencies unless necessary.

**Data model**

> From IDEA.md, propose tables beyond `profiles`.  
> Add SQL under `packages/db/sql/` and TypeScript schema.  
> Document user isolation (who can read/write which rows).

**Ship check**

> Walk PRODUCTION_CHECKLIST.md for my preset.  
> List blockers only.

## Why this is faster

Agents thrash when the stack is undefined.  
Shipkit fixes stack + security + deploy shape so prompts stay about **your idea**.

# Interactive research workspace

Status: complete, ready for review
Autonomy: A2 bounded operator workflow
Issue alignment: #16, with existing #13 research contracts

## Objective

Turn the read-only Evolution Workspace into a safe local-first operator surface
for the existing deterministic A2 flow:

```text
create objective and cycle
→ inspect configured repository
→ assess trusted checks in a temporary copy
→ run bounded repository research
→ review the persisted opportunity, decision, experiment and execution handoff
```

## Current evidence

- `apps/web/src/app/app/evolution/page.tsx` reads `status` and `show` from the
  official built Evolution Core CLI.
- `packages/evolution-core/src/cli.ts` already implements `start`, `inspect`,
  `assess` and `research-repository` over one journal and policy model.
- `assess` and `research-repository` may execute discovered package scripts
  through the trusted-local backend in temporary source copies.
- The workspace has route middleware, but mutations must re-check identity
  inside the Server Action rather than trusting middleware alone.
- Vercel does not provide a durable shared filesystem for `.cyclewarden`
  journal state, so this slice must fail closed there.

Confidence is high for the repository-backed flow and medium for UX until a
real browser run is inspected. Hosted durable state, multi-user state
isolation and manual decision editing remain blind spots.

## Acceptance criteria

1. An operator can create an A2/R1 cycle with a validated objective and optional
   portable cycle ID.
2. The selected cycle exposes only the next legal repository operation:
   `inspect`, `assess` or `research-repository`.
3. Check-running actions require an explicit trusted-repository
   acknowledgement.
4. Server Actions:
   - use `execFile`, never a shell;
   - accept no user-controlled filesystem path, executable or arbitrary CLI
     option;
   - operate only on `CYCLEWARDEN_PROJECT_ROOT` (or the current repository);
   - canonicalize the configured repository before enforcing the filesystem-root boundary;
   - do not disclose the configured repository path to unauthorized viewers;
   - require `CYCLEWARDEN_WORKSPACE_ACTIONS=enabled`;
   - re-check auth and an operator allowlist when auth is configured;
   - reject production demo mode and Vercel filesystem mutation;
   - apply a bounded rate limit.
5. Successful actions revalidate the workspace and preserve errors as
   recoverable inline feedback.
6. Browser E2E proves a small fixture can reach `planned` and display a selected
   decision and execution handoff.
7. Typecheck, lint, unit tests, production build, AI checks and the relevant
   browser flow pass.

## Non-goals

- arbitrary repository path entry in the browser;
- public-web research or user-research ingestion;
- editing the generated opportunity ranking or decision;
- executing the handoff, modifying code, opening/merging a PR or deploying;
- durable hosted/multi-tenant state;
- changing the auth architecture.

## Implementation slices

1. Extract a server-only Evolution CLI/runtime adapter from the page.
2. Add mutation access policy and validated/rate-limited Server Action.
3. Add accessible cycle creation and next-action controls.
4. Add a deterministic browser fixture and end-to-end flow.
5. Update environment guidance, capability truth and project memory.
6. Run local verification, inspect the browser at desktop/mobile, then publish
   a draft PR.

## Verification evidence

- focused web typecheck and unit tests pass;
- browser flow reaches `planned` with no runtime console errors;
- desktop and 390 px mobile layouts were inspected with no horizontal overflow;
- demo-mode Playwright suite passes with the new create-to-handoff regression.
- `pnpm verify` passes across typecheck, lint, all unit suites (including
  Evolution Core 93 and web 10), production build and AI/project-memory checks.

## Rollback

Revert this slice. Existing CLI commands, journal schema and read-only
workspace records remain unchanged.

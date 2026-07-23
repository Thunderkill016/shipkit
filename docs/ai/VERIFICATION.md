# Verification and evidence

An agent saying “done” is not evidence.

## Evidence hierarchy

Strongest to weakest:

1. automated test reproducing the required behavior;
2. typecheck, lint, build, security, or schema validation output;
3. browser/API run with captured result;
4. reviewed diff against acceptance criteria;
5. explanation without execution.

Use the strongest practical evidence.

## Iteration loop

Run the narrowest check first:

```bash
pnpm --filter @shipkit/web lint
pnpm --filter @shipkit/web typecheck
pnpm --filter @shipkit/web test
```

Then run the repository gate:

```bash
pnpm verify
```

## Failure policy

- Never hide a failed command.
- Distinguish a failure caused by the change from a verified pre-existing
  failure.
- Do not weaken tests merely to make them pass.
- Do not replace meaningful assertions with snapshots or mocks that cannot
  catch the bug.
- If a required environment is unavailable, report exactly what was not
  verified and provide a reproducible manual check.

## UI changes

For user-visible changes, verify the actual flow when tooling permits:

- load the page;
- exercise the changed interaction;
- inspect console and network failures;
- check responsive and error states;
- attach screenshots or a short recording to the PR when useful.

## Completion evidence

The PR should list commands executed and their outcomes. “Not run” needs a
reason and a remaining-risk statement.

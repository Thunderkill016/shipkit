# Safety and change control

## Consequence-based control

Review the consequence of being wrong, not merely the command being used.

### Agent may proceed

- reading/searching the repository;
- creating local plans and tests;
- reversible edits on a feature branch;
- running local non-destructive checks.

### Human approval required before mutation

- production deploys or rollbacks;
- destructive database or storage operations;
- secret creation, rotation, or disclosure;
- billing changes;
- permission, auth, RLS, or security-policy changes;
- force pushes, history rewriting, or deleting branches/releases;
- new external services with cost or data exposure.

## Secret handling

- Never place credentials in prompts, logs, commits, screenshots, or fixtures.
- Use environment variables and documented placeholders.
- Treat service-role and production tokens as high-impact credentials.
- Redact sensitive output before attaching evidence.

## Dependency policy

Before adding a dependency, document:

- why existing platform or package code is insufficient;
- maintenance and security cost;
- runtime and bundle impact;
- license;
- rollback path.

## Database policy

- add forward migrations; do not rewrite deployed history;
- describe data backfill and rollback;
- test authorization and user isolation;
- separate schema changes from unrelated UI refactors.

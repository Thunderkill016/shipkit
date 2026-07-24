# Verified draft PR publication

**Date:** 2026-07-24  
**Parent:** issue #44  
**Predecessor:** merged PR #45  
**Status:** implemented candidate in PR #48

## Decision

Extend the trusted-local owner beta with one separate publication command after independent verification:

```text
accepted verification
→ verified local commit
→ explicit publication opt-in
→ exact branch push
→ remote commit confirmation
→ draft pull request
```

Publication remains outside release authority. It may make a verified change reviewable, but it may not approve, merge, deploy, write production, or claim product value.

## Preconditions

The publication command must require all of the following:

1. the cycle is still at `verified`;
2. policy authorizes `open-draft-pr` for the exact cycle scope;
3. the delivery control sidecar passes its integrity digest;
4. the latest delivery verification verdict is `accepted`;
5. the branch ref and isolated worktree HEAD both equal the verified commit SHA;
6. the isolated worktree is clean;
7. `--draft-pr` was explicitly supplied;
8. GitHub CLI exists and is authenticated before any push.

## Execution contract

- Push with `git` argument arrays and no command shell.
- Push only `refs/heads/<verified-branch>` to the same remote branch name.
- Confirm the remote branch resolves to the verified SHA before any PR operation.
- Reuse an already-open draft PR only when head and base match.
- Verify the final PR is open and draft.
- Persist the URL, step statuses, digests and unresolved risks as content-addressed evidence.
- Keep the cycle at `verified`; a draft PR is not a release-stage transition.

## Partial failure handling

A push can succeed while PR inspection or creation fails. That state is not rolled back automatically and must not be reported as published. CycleWarden records it as `inconclusive`, including that the remote branch may already exist, so a later invocation or human operator can reconcile it.

A remote branch whose SHA differs from the independently verified commit is `rejected` rather than repaired or force-pushed.

## Idempotency

After a successful publication record is persisted, replay returns the same record and does not push or create another PR. If a crash occurs before persistence, replay safely repeats the exact push and inspects for an existing matching draft PR before creating one.

## Security boundary

This is trusted-local publication, not credential isolation:

- the selected repository, remote and GitHub account must be trusted;
- Git and GitHub CLI run with the current operating-system user's available credentials and network access;
- remote hosting and account policy remain external dependencies;
- the command never invokes merge or deployment operations;
- stronger isolation requires a remote or microVM backend and explicit credential brokerage.

## Verification

Regression coverage must prove:

- only the accepted verified SHA reaches the remote branch;
- an explicit opt-in is required before push;
- missing GitHub authentication stops before push;
- successful replay does not create a duplicate PR;
- publication does not change the cycle from `verified`;
- no merge command is invoked.

Repository CI must continue to pass full tests/build, standalone package consumers on Node.js 20/22/24, Evolution proofs, hostile Docker proof and both browser E2Es.

## Deferred

- web controls for execution, verification and publication;
- crash-safe synchronized recovery and remote reconciliation;
- untrusted writable remote or microVM execution;
- protected-branch policy inspection and GitHub scorecards;
- release approval, merge, deployment, rollback and incident records;
- outcome measurement and learning;
- external decision-value validation, still deferred at `0/6`.

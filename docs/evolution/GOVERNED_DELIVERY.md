# Governed delivery — owner-directed local beta

This slice extends a planned A3/A4 CycleWarden cycle through one bounded implementation, an independent verification verdict, and an optional explicitly authorized draft pull request.

It is intentionally local-first. It does **not** claim a hostile-code sandbox, external product validation, autonomous merge, deployment, production writes, or outcome learning.

## Lifecycle

```text
planned ExecutionHandoff
→ isolated git branch and worktree
→ generic-command or Codex CLI adapter
→ changed-file scope enforcement
→ implemented
→ separate verifier commands
→ accepted / rejected / inconclusive
→ local verified commit
→ optional explicit publish
→ exact verified branch push
→ draft pull request
```

The implementation actor cannot be the verifier actor. CycleWarden creates a local commit only after independent verification. Publication is a separate opt-in action that pushes that exact verified commit and may open a draft pull request. It never merges, deploys, writes production, or accepts implementation output without the independent verdict.

The trusted implementation command and publication tools still run with the current operating-system user's privileges. CycleWarden cannot technically prevent those trusted tools from accessing resources available to that user.

## Manifest

```json
{
  "schemaVersion": 1,
  "adapter": "generic-command",
  "expectedParameterDigest": "<latest ExecutionHandoff parameterDigest>",
  "command": {
    "executable": "node",
    "arguments": ["scripts/implement-approved-change.mjs"],
    "relativeWorkingDirectory": ".",
    "timeoutMs": 600000,
    "maxOutputBytes": 1048576
  },
  "verification": [
    {
      "id": "tests",
      "executable": "pnpm",
      "arguments": ["test"],
      "timeoutMs": 600000,
      "maxOutputBytes": 1048576
    },
    {
      "id": "build",
      "executable": "pnpm",
      "arguments": ["build"],
      "timeoutMs": 600000,
      "maxOutputBytes": 1048576
    }
  ]
}
```

`codex-cli` uses the same contract but requires the executable basename to be `codex`. Command shells (`sh`, `bash`, `cmd`, PowerShell and equivalents) are rejected. Commands run with `shell: false` and a reduced environment.

## Run

The cycle must already be at `planned`, have autonomy A3 or A4, and contain a persisted `ExecutionHandoff`.

```bash
pnpm deliver -- execute <cycle-id> \
  --root .cyclewarden \
  --project-root /absolute/path/to/trusted/repository \
  --manifest delivery.json \
  --actor owner-implementation-agent \
  --trusted-repository

pnpm deliver -- verify <cycle-id> \
  --root .cyclewarden \
  --project-root /absolute/path/to/trusted/repository \
  --actor independent-verifier

pnpm deliver -- show <cycle-id> --root .cyclewarden
```

An accepted verification creates a commit on the isolated local branch. It does not push automatically.

## Publish a verified draft PR

Publication requires GitHub CLI (`gh`), an authenticated GitHub CLI session for the target hostname, a clean delivery worktree, and the explicit `--draft-pr` opt-in.

```bash
pnpm deliver -- publish <cycle-id> \
  --root .cyclewarden \
  --project-root /absolute/path/to/trusted/repository \
  --actor owner-publisher \
  --draft-pr \
  --remote origin \
  --base main \
  --title "Implement the approved CycleWarden change" \
  --body-file draft-pr.md
```

`--hostname` may be supplied for GitHub Enterprise or when the hostname cannot be derived from the push remote. If `--base` is omitted, CycleWarden asks `gh` for the repository default branch.

Before publication, CycleWarden verifies that:

- the cycle remains at `verified`;
- policy permits `open-draft-pr` for the cycle's autonomy and risk;
- the delivery control file still has a valid integrity digest;
- the verification verdict is `accepted` and contains a commit SHA;
- the isolated branch and worktree HEAD both equal that exact verified commit;
- the worktree is clean;
- `gh` exists and is authenticated before any push occurs.

The verified branch is pushed with an exact refspec. CycleWarden then confirms the remote branch resolves to the verified commit before it inspects or opens a pull request. An already-open draft PR with the same head and base is reused, making successful publication idempotent.

Publication writes content-addressed evidence and an integrity-covered publication record with step statuses, digests, unresolved risks, and the draft PR URL. The lifecycle remains `verified`; opening a draft PR does not grant release, merge, or deployment authority.

A push can succeed while later GitHub inspection or draft-PR creation fails. That outcome is persisted as `inconclusive` so the operator can see that the remote branch exists but the review surface still needs attention. CycleWarden never converts this partial result into an accepted release.

## Fail-closed boundaries

Execution is rejected or marked inconclusive when:

- the repository is dirty before the worktree is created;
- the manifest digest does not match the latest handoff;
- the cycle is below A3 or is not planned;
- the command invokes a shell;
- the command is unavailable, times out, fails, or produces no changes;
- any changed path is outside enforceable `allowedScope` rules;
- any changed path matches an enforceable `forbiddenScope` rule;
- the verifier is the implementation actor;
- the patch changes before verification or a verification command changes it;
- a verification command fails, times out, or is unavailable.

Publication is blocked or marked inconclusive when:

- `--draft-pr` was not explicitly supplied;
- the cycle is not verified or the verification record is not accepted;
- the verified branch, worktree or commit no longer match;
- the delivery worktree is dirty;
- policy does not authorize `open-draft-pr`;
- `gh` is missing or unauthenticated;
- the remote hostname or base branch cannot be resolved;
- push, remote-SHA confirmation, PR inspection, creation, or final draft verification fails.

Only `directory/**`, exact files and directory-prefix rules are enforced. Descriptive scope statements containing whitespace remain human-readable constraints and are not treated as filesystem globs.

## Security truth

The first beta uses the existing `trusted-local` backend because the current Docker baseline denies network access and therefore cannot run an authenticated online Codex workflow. Although its bind-mounted workspace can be writable, it was verified as a bounded check backend rather than as a complete agent-mutation environment. Trusted-local execution is **not a security sandbox**. The selected repository, command, command arguments, Git remote and authenticated GitHub account must be trusted, and the processes can access files, credentials and network resources available to the current operating-system user.

The delivery control sidecar is atomically written with an integrity digest and is cross-checked against the cycle, execution evidence, handoff, verification and publication records. It is not part of the synchronized cycle journal: loss of that local sidecar blocks verification or publication. The beta also has no crash-safe delivery resume, so an unexpected process termination after the cycle enters `executing` or during publication may require manual recovery. A later slice may add synchronized recovery records, a writable remote or microVM backend, explicit egress policy and stronger publication reconciliation. This document must not be used to claim such isolation or resilience today.

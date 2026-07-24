# Governed delivery — owner-directed local beta

This slice extends a planned A3/A4 CycleWarden cycle through one bounded implementation and an independent verification verdict.

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
```

The implementation actor cannot be the verifier actor. CycleWarden orchestration creates a local commit only after independent verification and does not itself push, open a PR, merge, deploy, read production secrets, or spend money. The trusted implementation command still runs with the current operating-system user's privileges, so CycleWarden cannot technically prevent that command from invoking other installed tools or accessing resources available to that user.

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

Only `directory/**`, exact files and directory-prefix rules are enforced. Descriptive scope statements containing whitespace remain human-readable constraints and are not treated as filesystem globs.

## Security truth

The first beta uses the existing `trusted-local` backend because the current Docker baseline denies network access and therefore cannot run an authenticated online Codex workflow. Although its bind-mounted workspace can be writable, it was verified as a bounded check backend rather than as a complete agent-mutation environment. Trusted-local execution is **not a security sandbox**. The selected repository, command and command arguments must be trusted, and the process can access files, credentials and network resources available to the current operating-system user.

The first slice also has no crash-safe delivery resume: an unexpected process termination after the cycle enters `executing` may require manual recovery. A later slice may add a writable remote or microVM backend, explicit egress policy and recovery records. This document must not be used to claim such isolation or resilience today.

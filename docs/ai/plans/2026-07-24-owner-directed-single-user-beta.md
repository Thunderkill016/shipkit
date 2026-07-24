# Owner-directed single-user beta sequence

Status: active owner decision  
Date: 2026-07-24  
Issues: #14, #16, #17, #18, #44

## Decision

Defer the fixed six-person external pilot and continue productization toward a complete single-user local beta. Issue #14 is closed as `not planned` for the current phase, not completed.

## Evidence boundary

- External audits remain `0/6`.
- The pilot clock never started.
- No participant or external repository was contacted.
- AtoEnglish and CycleWarden dogfood are internal use, not external validation.
- Technical CI and future organic usage must not be represented as completed pilot results.

## Active delivery sequence

```text
A2 objective → research → reviewed ExecutionHandoff
→ trusted-local isolated implementation
→ independent verification
→ verified local commit
→ explicit push and draft PR
→ workspace controls
→ writable remote/microVM backend
→ authorized release and outcome learning
```

## First slice — issue #44 / PR #45

- generic command adapter and optional Codex CLI profile;
- exact handoff digest binding;
- clean git base and isolated branch/worktree;
- shell-free bounded invocation;
- changed-file scope and symlink checks;
- content-addressed patch snapshot;
- distinct verifier, accepted/rejected/inconclusive result;
- local commit only after all checks pass.

## Explicit limitations

The first slice uses trusted-local execution. It is not a security sandbox and cannot prevent a trusted command from using the current user's available files, credentials, network or installed tools. CycleWarden orchestration does not itself push, merge or deploy, but stronger prevention requires a writable isolated agent backend.

The external pilot can be reactivated later under its original fixed protocol. Until real evidence is collected CycleWarden must state that external product value is unverified.

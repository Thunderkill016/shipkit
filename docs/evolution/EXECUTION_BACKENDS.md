# Execution Backends

CycleWarden separates repository check discovery from command execution. A check may only run through an `ExecutionBackend` whose declared capabilities satisfy the requested policy.

## Explicit CLI selection

Use the dedicated CLI so execution trust is never inferred silently:

```bash
pnpm sandbox:check -- --project-root . --backend trusted-local \
  --acknowledge-trusted-repository --check test

pnpm sandbox:check -- --project-root . --backend docker \
  --docker-image sha256:<64-hex> --check test
```

`--backend` is mandatory. Trusted-local execution additionally requires an explicit acknowledgement. Docker execution requires an immutable image digest and rejects mutable tags, missing local images and implicit pulls.

## Trusted local

`TrustedLocalExecutionBackend` is the compatibility backend for repositories the operator already trusts.

It provides:

- an explicit, secret-minimized environment;
- bounded output;
- timeout handling;
- temporary-workspace cleanup.

It does **not** claim filesystem, network, dependency, CPU, memory, process-tree or hostile-code isolation. It may link existing host `node_modules` directories into the temporary workspace so existing trusted workflows continue to run.

## Docker sandbox

`DockerExecutionBackend` is the first untrusted backend. Before any command runs, CycleWarden verifies that the Docker daemon is available and that the backend declares every required capability. Missing runtime or capability rejects execution.

The Docker invocation uses:

- one temporary source copy as the only writable bind mount;
- no host `node_modules` links;
- exclusion of symlinks and common credential files from the source copy;
- working-directory containment;
- `--network none`;
- a read-only container root filesystem;
- a bounded `/tmp` tmpfs;
- dropped Linux capabilities and `no-new-privileges`;
- CPU, memory, process-count, file-descriptor, timeout and output bounds;
- an explicit environment allowlist rather than host environment inheritance;
- direct Docker CLI termination and forced container removal after timeout;
- `--rm` cleanup;
- `--pull never` supply-chain enforcement.

The backend requires an explicit immutable image digest that already exists locally. CycleWarden checks the image with `docker image inspect` and refuses implicit pulls. Projects must select a reviewed image that already contains the required runtime or isolated dependencies.

## Hostile integration proof

CI explicitly provisions a local Node image, converts it to an immutable local image ID, and runs `scripts/test-sandbox-docker.mjs`. The hostile fixture verifies that:

- a protected host environment value is not inherited;
- `.env` and external symlinks are absent from the copied workspace;
- writes to the read-only container root fail;
- an embedded host path cannot modify the host sentinel;
- outbound network access is blocked;
- the isolated workspace remains writable;
- no `cyclewarden-check-*` container remains after execution.

## Current honest boundary

The Docker backend does not yet claim a hard writable-workspace disk quota. `disk-limit` exists in the capability contract, but requesting it fails closed until a backend proves it. Egress allowlists, remote sandbox providers, Windows/macOS container support and an independent external security review also remain required before issue #12 can close.

Source files are copied as data. Only repository package scripts discovered by CycleWarden may be selected for execution; arbitrary source instructions or prompt text do not become commands.

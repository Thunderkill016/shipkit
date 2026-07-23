# Execution Backends

Shipkit separates repository check discovery from command execution. A check may only run through an `ExecutionBackend` whose declared capabilities satisfy the requested policy.

## Trusted local

`TrustedLocalExecutionBackend` is the compatibility backend for repositories the operator already trusts.

It provides:

- an explicit, secret-minimized environment;
- bounded output;
- timeout handling;
- temporary-workspace cleanup.

It does **not** claim filesystem, network, dependency, CPU, memory, process-tree or hostile-code isolation. It may link existing host `node_modules` directories into the temporary workspace so existing trusted workflows continue to run.

## Docker sandbox

`DockerExecutionBackend` is the first untrusted backend. Before any command runs, Shipkit verifies that the Docker daemon is available and that the backend declares every required capability. Missing runtime or capability rejects execution.

The Docker invocation uses:

- one temporary source copy as the only writable bind mount;
- no host `node_modules` links;
- exclusion of symlinks and common credential files from the source copy;
- `--network none`;
- a read-only container root filesystem;
- a bounded `/tmp` tmpfs;
- dropped Linux capabilities and `no-new-privileges`;
- CPU, memory, process-count, file-descriptor, timeout and output bounds;
- an explicit environment allowlist rather than host environment inheritance;
- forced container removal after timeout plus `--rm` cleanup.

The default image is `node:22-bookworm-slim`. Projects that require other runtimes or isolated dependencies must select a reviewed image that already contains them.

## Current honest boundary

The Docker backend does not yet claim a hard writable-workspace disk quota. `disk-limit` exists in the capability contract, but requesting it fails closed until a backend proves it. Network allowlists, remote sandbox providers, Windows/macOS container support, hostile integration fixtures and an independent security review also remain required before issue #12 can close.

Source files are copied as data. Only repository package scripts discovered by Shipkit may be selected for execution; arbitrary source instructions or prompt text do not become commands.

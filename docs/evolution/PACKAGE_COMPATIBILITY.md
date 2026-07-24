# Evolution Core Package and Compatibility Policy

## Package boundary

`@cyclewarden/evolution-core` is the standalone deterministic core used by the CycleWarden workspace, CLIs and future integrations. It owns its TypeScript, Node type and Vitest toolchain and must build and test without `apps/web` or the web dependency tree.

The current package name is `@cyclewarden/evolution-core`. During the decision-value pilot it remains marked `private` to prevent accidental registry publication. Supported distribution is:

- workspace consumption;
- a locally produced npm tarball;
- installation of that tarball into an otherwise empty consumer project.

A public registry release is a separate product/distribution decision and does not happen automatically in this milestone.

## Runtime support

The current package contract supports:

- Node.js 20;
- Node.js 22;
- ESM consumers.

`package.json` encodes `>=20 <23`. CI must run the standalone install/build/test/pack/consumer proof on Node 20 and Node 22 before this support can be claimed. A newer Node major is unsupported until added to the matrix and verified.

## Package semantic versioning

The package follows Semantic Versioning with additional caution while the version is `0.x`:

- patch: fixes that do not intentionally change exported contracts or persisted formats;
- minor: additive exports and compatible behavior changes, with migration notes when relevant;
- major: incompatible public API changes after the package reaches `1.0.0`;
- before `1.0.0`, any incompatible API change still requires an explicit migration note and may not be hidden in a patch release.

The CLI binaries and root library export belong to the same package version.

## Persisted schema compatibility

Package versions and persisted schema versions are related but not interchangeable.

- Every released persisted envelope has its own explicit schema version.
- Reading a previous supported schema requires a deterministic tested migration.
- Unknown future schemas fail closed.
- A package version may not claim compatibility with a store schema unless a checked-in fixture and migration/replay test prove it.
- Removing support for a previously advertised schema is an incompatible compatibility change and requires a documented release decision.

The current persistence support boundary remains the one declared in `PERSISTENCE_SUPPORT.md`; package independence does not expand filesystem or hostile-writer guarantees.

## Standalone proof

`scripts/test-evolution-core-standalone.mjs`:

1. copies only `packages/evolution-core` into a temporary directory;
2. verifies package scripts do not reference `apps/web`;
3. performs a clean npm install using package-owned development dependencies;
4. runs typecheck, tests and build;
5. packs the package to a tarball;
6. installs the tarball into an empty consumer;
7. imports the public module and invokes the installed `cyclewarden-evolve --help` binary.

This proves package/toolchain independence. It does not prove public registry ownership, external adoption or product value; those remain separate gates.

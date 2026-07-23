# Persistence Support Boundary

## Supported milestone contract

The Evolution Core persistence gate is supported for the current Shipkit milestone on:

- GitHub Actions Ubuntu 24.04;
- Node.js 22;
- a local filesystem that supports atomic same-filesystem rename, file `fsync`, and directory `fsync`;
- process-crash recovery, including forced `SIGKILL` at the tested journal and snapshot boundaries.

Within this contract, Shipkit requires:

- deterministic migration from the released v1 store envelope to v2;
- contiguous journal sequences;
- cycle checksum validation and v2 previous-checksum chaining;
- one accepted next transition under competing writers;
- recovery of dead-owner locks without stealing a live-owner lock;
- recovery from a corrupt or missing snapshot using the append-only journal.

## Explicit non-goals for this milestone

This contract does not claim:

- Windows or macOS support;
- power-loss durability on every filesystem or storage device;
- correctness on network filesystems with weaker rename or locking semantics;
- cryptographic authenticity against a hostile writer that can rewrite the store;
- automatic compatibility with future schema versions that do not have checked-in fixtures and migrations.

## Fault injection

`SHIPKIT_PERSISTENCE_CRASH_POINT` is a reserved test-only environment variable used by the process-boundary fixture. Production operators must not set it. It is not a public runtime configuration surface.

## Gate decision

Passing the focused persistence tests, full CI, Shipkit dogfood, and the unrelated-repository proof is sufficient to merge the v2 migration and process-crash baseline for this declared platform. Broader platform, filesystem, power-loss, and hostile-writer guarantees must be delivered and reviewed separately before they are advertised as supported.

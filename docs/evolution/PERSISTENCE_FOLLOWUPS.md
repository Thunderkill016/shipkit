# Persistence Follow-up Boundaries

The process-crash baseline in PR #22 intentionally leaves the following work outside the current merge gate:

- Windows and macOS compatibility;
- filesystem and network-storage durability matrices;
- power-loss testing with an appropriate harness;
- cryptographically authenticated journal provenance;
- replacement of the reserved environment-variable fault hook with an injected test controller before persistence is embedded in a multi-tenant runtime;
- fixtures and migration policy for every future released schema.

These items must remain visible in GitHub tracking and must not be inferred as complete from the v2 store merge.

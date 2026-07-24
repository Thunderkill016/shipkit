# CycleWarden rename migration

Status: active<br>
Owner: Thunderkill016<br>
Date: 2026-07-24<br>
Autonomy: A3 for repository implementation; GitHub merge remains an explicit
owner action<br>
Decision: rename the product from Shipkit to CycleWarden

## Objective

Rename the product, package scope, command-line tools, generated-project
workflow, runtime defaults, user interface and active documentation without
losing an existing local lifecycle store.

## Evidence and current behavior

- The owner selected `CycleWarden` after confirming that `Shipkit` is already
  used by several adjacent AI-development products.
- The repository currently contains 179 non-lockfile files with the old name.
- Runtime state defaults to `.shipkit`.
- Published package metadata and imports use `@shipkit/*`.
- CLI binaries use `shipkit-*`.
- Runtime configuration uses `SHIPKIT_*` and
  `NEXT_PUBLIC_SHIPKIT_MODE`.
- The main checkout contains unrelated untracked owner files, so the migration
  is isolated in a dedicated worktree and branch.

## Acceptance criteria

1. The canonical product identity is `CycleWarden` / `cyclewarden`.
2. Workspace packages and imports use `@cyclewarden/*`.
3. CLI binaries and help output use `cyclewarden-*`.
4. Generator and proof scripts use CycleWarden filenames and identifiers.
5. New runtime state defaults to `.cyclewarden`.
6. If `.cyclewarden` is absent and a legacy `.shipkit` directory exists, CLI
   and workspace readers continue using the legacy store without moving or
   deleting it.
7. `CYCLEWARDEN_*` variables are canonical; user-facing runtime configuration
   accepts the corresponding `SHIPKIT_*` variable as a temporary fallback.
8. Repository inspection, temporary workspaces and project generation exclude
   both canonical and legacy state directories.
9. Active UI, code, package metadata, workflows and documentation use the new
   identity. Remaining old-name occurrences are limited to migration notes,
   explicit compatibility aliases and immutable historical evidence.
10. `pnpm verify` and the focused migration tests pass.
11. The migration is published as a draft PR. Repository renaming happens only
    after the exact merge action is authorized.

## Implementation slices

### 1. Runtime and package identity

- add a tested canonical/legacy state-root resolver;
- rename workspace packages and imports;
- rename CLI binaries, help text, actors, temp names and container names;
- rename generator, fixtures and proof scripts;
- rename environment variables while retaining read fallbacks where they
  protect existing local configuration;
- regenerate the lockfile without unrelated dependency changes.

### 2. Product and documentation identity

- update active UI text, metadata, health responses and dictionaries;
- update root product, architecture, workflow, operations and contributor docs;
- update active capability/project memory and JSON schema fields;
- retain an explicit former-name note and data migration guidance.

### 3. Verification and publication

- run focused state-root compatibility, package, CLI and generator tests;
- run `pnpm verify` on a supported Node version;
- run Evolution Core tests on Node 24;
- review the final diff and old-name allowlist;
- commit in reviewable units, push and open a draft PR.

## Rollback and data safety

- No state directory is deleted, moved or rewritten by this migration.
- Explicit `--root` values remain authoritative.
- Existing `.shipkit` state is read in place only when `.cyclewarden` does not
  exist.
- Reverting the commits restores the previous identity without modifying local
  lifecycle data.
- GitHub automatically redirects the old repository URL after the later
  repository rename, but local remotes will be updated and verified explicitly.

## Known risks

- Open dependency and Node 24 PRs touch package metadata and CI and may require
  rebasing after this migration.
- Third-party links, caches and untracked local files cannot be rewritten by a
  repository PR.
- Package-scope and binary renames are intentionally breaking for unpublished
  consumers; only state and configuration receive compatibility fallbacks.
- Naming checks reduce obvious collision risk but are not legal trademark
  clearance.

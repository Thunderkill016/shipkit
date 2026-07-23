# Standalone Evolution Core Review

## Scope

Focused implementation for #15. The change may alter only the Evolution Core package boundary, package-owned development toolchain, compatibility documentation, standalone package proof and CI coverage.

It must not add search discovery, product features, agent mutation, deployment or public package publication.

## Review questions

- Does any Evolution Core build, typecheck or test script reference `apps/web`?
- Can a copy containing only the package clean-install its declared development dependencies?
- Do typecheck, tests and build pass in that isolated copy?
- Does the packed tarball omit source-only and host-workspace files?
- Can an empty consumer import the package and invoke an installed CLI binary?
- Are supported Node versions mechanically tested?
- Are package SemVer and persisted-schema compatibility described separately?
- Does `private: true` continue to prevent accidental registry publication?

## Current boundary

The proposed milestone supports local workspace and tarball installation on Node 20 and Node 22. It does not claim registry ownership, public adoption, Node 23+, browser runtime support or broader persistence guarantees.

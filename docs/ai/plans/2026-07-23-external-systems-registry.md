# Implementation plan: external-system evidence registry

- Status: completed
- Date: 2026-07-23
- Issue: user-directed research cycle
- Owner: Codex
- Reviewer: Codex read-only `review-change` pass

## Problem and outcome

Shipkit's external comparison is useful but had floating revisions and stale
internal status. Create a machine-readable, expiring decision record and fail the
existing AI workflow when evidence loses required breadth, revision, limitation,
contradiction, or falsification metadata.

## Current behavior and evidence

- `docs/evolution/COMPARATIVE_ANALYSIS.md` — every integration revision was
  recorded as “Required”.
- `docs/CAPABILITIES.json` — the current implementation truth is newer than
  parts of the narrative project model.
- `docs/ai/research/2026-07-23-leading-agent-systems/EVIDENCE.md` — current
  primary-source ledger and contradictions.

## Acceptance criteria

- [x] At least twelve systems across five groups have primary sources.
- [x] Every source has a pinned revision, publication, or access date.
- [x] Every system has an explicit decision, boundary, limitation, and
  falsification test.
- [x] At least three contradictions are preserved.
- [x] The registry has a review expiry.
- [x] Positive and negative tests cover revision, expiry, breadth, and dissent.
- [x] `pnpm check:ai` invokes the new checks.
- [x] GitHub Actions watches the registry and validator paths and runs the
  focused checks.
- [x] Relevant capability and architecture documentation points to the registry.
- [x] Focused verification passes and the attempted full repository gate has
  explicit unrelated blockers recorded.

## Out of scope

- adding a paid search provider or API key;
- adding a remote sandbox;
- executing a Shipkit handoff with Codex or OpenHands;
- MCP or A2A endpoints;
- claiming user demand or product-market validation;
- rewriting all historical research.

## Proposed approach

### Step 1 — capture current decisions

- Goal: make the external evidence reproducible.
- Files: `docs/evolution/EXTERNAL_SYSTEMS.json`.
- Change: record sources, revisions, decisions, boundaries, limitations,
  falsification tests, contradictions, and review expiry.
- Verification: parse and validate the registry.
- Risk: first-party sources can be mistaken for independent proof.

### Step 2 — enforce the record

- Goal: reject concrete drift modes.
- Files: `scripts/external-systems-validation.mjs`,
  `scripts/check-external-systems.mjs`, and
  `scripts/test-external-systems.mjs`.
- Change: add a pure validator, CLI wrapper, and negative cases.
- Verification: run the focused checker and test.
- Risk: a time-based expiry can intentionally fail future CI until reviewed.

### Step 3 — integrate without overstating capability

- Goal: make the current workflow and capability record point to the check.
- Files: `package.json`, `scripts/check-ai-workflow.mjs`,
  `docs/CAPABILITIES.json`, `docs/evolution/COMPARATIVE_ANALYSIS.md`,
  `docs/ai/PROJECT_MODEL.md`, and research indexes.
- Change: invoke checks, correct stale status, and identify the machine registry
  as the current source record.
- Verification: `pnpm check:ai`, capability tests, documentation check.
- Risk: broad narrative edits can hide scope creep, so changes stay limited to
  facts affected by merged capabilities and this research.

## Data, security, and compatibility impact

No runtime data, external credentials, network calls, dependency, public API, or
production behavior changes. The check uses Node.js built-ins and reads committed
JSON. CI becomes intentionally time-sensitive to `reviewBy`.

## Rollback

Revert the package/check-workflow wiring and remove the registry, validator,
tests, and supporting research artifacts. No migration or runtime state cleanup
is required.

## Verification plan

```bash
node scripts/check-external-systems.mjs
node scripts/test-external-systems.mjs
node scripts/test-capabilities.mjs
pnpm check:ai
pnpm verify
```

## Open questions

- Who owns the quarterly external-source review after the first cycle?
- Should a later checker verify link availability without making offline CI
  depend on the network?
- Which direct-user experiment will satisfy issue #14?

## Completion notes

Passed:

- `node scripts/check-external-systems.mjs`;
- `node scripts/test-external-systems.mjs`;
- `pnpm check:ai`;
- `pnpm lint`;
- `git diff --check`;
- JSON parse checks;
- `@shipkit/evolution-core` build inside the broader build attempt.

Full `pnpm verify` was attempted but stopped in pre-existing areas outside this
diff:

- the repository declares Node.js `>=20 <23` for Evolution Core, while the
  available runtime is Node.js 24.16.0;
- `packages/config` typecheck cannot resolve `NodeJS` and `process`;
- four Evolution Core process/output/concurrency tests fail under the unsupported
  runtime;
- the Next.js production build reports a webpack failure without a diagnostic.

No package source, TypeScript configuration, Evolution Core runtime, or web
application code was changed in this delivery. The focused checks for the added
registry and its workflow integration pass.

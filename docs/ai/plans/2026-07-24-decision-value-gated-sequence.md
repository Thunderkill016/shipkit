# Decision-value-gated delivery sequence

Status: active strategy correction
Autonomy: A2 research, planning and bounded repository governance
Issues: #13, #14, #16, #17, #18

## Objective

Keep CycleWarden on one evidence-gated product path after the rename and recent documentation expansion. The immediate objective is not feature parity or marketing. It is to make the current A2 audit usable and determine whether it changes real developer decisions.

## Evidence reviewed

- `IDEA.md` — canonical product scope and near-term proof;
- `ROADMAP.md` — one-product lifecycle and dependency order;
- `AGENTS.md` — bounded delivery and no self-merge/deploy;
- `docs/ai/PROJECT_MODEL.md` — current integration gaps and 0/6 pilot state;
- `docs/CAPABILITIES.json` — implemented versus experimentally proven capability;
- `docs/evolution/pilot/*` — fixed protocol, six empty slots and redaction rules;
- open issues #9, #12, #13, #14, #16, #17 and #18;
- merged PRs #31–#40 and the complete diff/CI state of open PR #39.

## Diagnosis

1. Technical A2 architecture is no longer the primary uncertainty.
2. The external decision-value pilot is operational but remains 0/6.
3. `docs/STRATEGIC_DIRECTION.md` introduced a competing sequence—SaaS parity first—without user evidence that billing or feature parity is the current bottleneck.
4. PR #39 is aligned with the canonical plan because it reduces pilot operating friction without enabling code mutation.
5. A3 execution, broad research, monetization and compliance positioning must remain gated by external evidence.

## Delivery sequence

### Slice 1 — harden PR #39

- canonicalize configured repository paths before the filesystem-root boundary check;
- reject a symlink resolving to the filesystem root;
- hide configured absolute repository paths from unauthorized viewers;
- keep product autonomy wording at A2;
- run full CI on the final head;
- keep the PR draft until review is complete;
- do not merge without exact owner permission.

### Slice 2 — correct strategic direction

- replace roadmap-by-market-hype with an evidence-gated decision record;
- mark external company and legal facts as context, not demand proof;
- make #14 the immediate product gate;
- predefine success, inconclusive and failure branches;
- defer SaaS parity, MCP, microVM and monetization until evidence activates them;
- open a separate draft PR with no runtime changes.

### Slice 3 — external pilot

Human authorization is required before external contact.

Once an authorized recruitment channel exists:

- recruit exactly six eligible developers/maintainers;
- obtain consent before repository access;
- capture the pre-audit decision before showing recommendations;
- run one primary audit per repository within the fixed limits;
- commit only redacted pseudonymous records;
- apply the fixed aggregate decision rule.

## Acceptance criteria

- PR #39 contains no temporary workflow or trigger file;
- path-boundary regressions are tested;
- PR #39 CI is green on its final head;
- strategic direction no longer prioritizes unvalidated SaaS parity;
- strategic strategy PR changes documentation only;
- #14 remains 0/6 until a real consented session occurs;
- no participant contact, code-agent execution, merge or deployment is claimed or performed implicitly.

## Non-goals

- implementing Stripe, teams, admin or OAuth;
- adding MCP/A2A;
- adding a microVM/remote sandbox;
- connecting Codex/OpenHands to approved handoffs;
- changing pilot thresholds;
- contacting participants without owner authorization;
- merging either PR automatically.

## Exit

The current phase exits only when the interactive A2 workspace is review-ready and the fixed six-person pilot produces an evidence-backed success, inconclusive, failure or protocol-gap result.

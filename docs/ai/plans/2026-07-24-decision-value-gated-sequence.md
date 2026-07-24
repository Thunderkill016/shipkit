# Decision-value-gated delivery sequence

Status: strategy and A2 workspace merged; external pilot is the active gate
Autonomy: A2 research, planning and bounded repository governance
Issues: #13, #14, #16, #17, #18

## Objective

Keep CycleWarden on one evidence-gated product path after the rename and recent documentation expansion. The immediate objective is not feature parity or marketing. It is to use the merged A2 audit surface and determine whether it changes real developer decisions.

## Evidence reviewed

- `IDEA.md` — canonical product scope and near-term proof;
- `ROADMAP.md` — one-product lifecycle and dependency order;
- `AGENTS.md` — bounded delivery and explicit authorization gates;
- `docs/ai/PROJECT_MODEL.md` — current integration gaps and 0/6 pilot state;
- `docs/CAPABILITIES.json` — implemented versus experimentally proven capability;
- `docs/evolution/pilot/*` — fixed protocol, six empty slots and redaction rules;
- open issues #9, #12, #13, #14, #16, #17 and #18;
- merged PR #41 for the evidence-gated strategy;
- merged PR #39 for the bounded interactive A2/R1 workspace.

## Diagnosis

1. Technical A2 architecture is no longer the primary uncertainty.
2. The external decision-value pilot is operational but remains 0/6.
3. Billing, broad research, MCP, microVM, monetization and marketing are not justified as the next workstream without external decision-value evidence.
4. The merged workspace reduces pilot operating friction without enabling code mutation.
5. A3 execution and broader capability expansion remain gated by the fixed #14 result.

## Delivery sequence

### Slice 1 — harden and merge the A2 workspace

Completed through PR #39:

- canonicalized configured repository paths before the filesystem-root boundary check;
- rejected a symlink resolving to the filesystem root;
- kept configured absolute repository paths out of the client payload;
- kept product autonomy at A2/R1;
- passed full CI on the reviewed head;
- merged only after explicit owner authorization.

### Slice 2 — correct and merge strategic direction

Completed through PR #41:

- replaced roadmap-by-market-hype with an evidence-gated decision record;
- marked external company and legal facts as context, not demand proof;
- made #14 the immediate product gate;
- predefined success, inconclusive, failure and protocol-gap branches;
- deferred SaaS parity, MCP, microVM and monetization until evidence activates them.

### Slice 3 — external pilot

Active and not started. Human authorization is required before external contact.

Once an authorized recruitment channel exists:

- recruit exactly six eligible developers or maintainers;
- obtain consent before repository access;
- capture the pre-audit decision before showing recommendations;
- run one primary audit per repository within the fixed limits;
- commit only redacted pseudonymous records;
- apply the fixed aggregate decision rule.

## Acceptance criteria

- [x] PR #39 contains no temporary workflow or trigger file;
- [x] path-boundary regressions are tested;
- [x] PR #39 CI is green on its final reviewed head;
- [x] strategic direction no longer prioritizes unvalidated SaaS parity;
- [x] PR #41 changes documentation only and is merged;
- [ ] #14 completes exactly six eligible external audits;
- [ ] the fixed aggregate rule produces success, inconclusive, failure or protocol-gap;
- [ ] the next workstream is selected from that result.

## Non-goals before the pilot result

- implementing Stripe, teams, admin or OAuth;
- adding MCP/A2A;
- adding a microVM or remote sandbox;
- connecting Codex/OpenHands to approved handoffs;
- changing pilot thresholds;
- contacting participants without an authorized recruitment channel and explicit consent;
- treating technical CI success as product decision value.

## Exit

The current phase exits only when the fixed six-person pilot produces an evidence-backed success, inconclusive, failure or protocol-gap result. The pilot remains 0/6 and its clock remains not started until the first eligible consented external session begins.

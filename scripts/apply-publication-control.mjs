#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

function replaceOnce(source, before, after, label) {
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`missing replacement marker: ${label}`);
  if (source.indexOf(before, index + before.length) >= 0) {
    throw new Error(`replacement marker is not unique: ${label}`);
  }
  return source.slice(0, index) + after + source.slice(index + before.length);
}

const deliveryPath = "packages/evolution-core/src/delivery.ts";
let delivery = await readFile(deliveryPath, "utf8");
if (!delivery.includes("export type DeliveryPublicationRecord")) {
  delivery = replaceOnce(
    delivery,
    'import type { EvolutionCycle, ExecutionHandoff } from "./types.js";',
    'import type { AuthorizationDecision, EvolutionCycle, ExecutionHandoff } from "./types.js";',
    "authorization import"
  );

  delivery = replaceOnce(
    delivery,
    `export type DeliveryVerificationRecord = {
  schemaVersion: 1;
  recordType: "delivery-verification";
  recordId: string;
  cycleId: string;
  executionRunId: string;
  implementerActor: string;
  verifierActor: string;
  startedAt: string;
  completedAt: string;
  changedFiles: string[];
  checks: DeliveryVerificationCheck[];
  verdict: "accepted" | "rejected" | "inconclusive";
  unresolvedRisks: string[];
  commitSha: string | null;
};

type DeliveryControlFile = {`,
    `export type DeliveryVerificationRecord = {
  schemaVersion: 1;
  recordType: "delivery-verification";
  recordId: string;
  cycleId: string;
  executionRunId: string;
  implementerActor: string;
  verifierActor: string;
  startedAt: string;
  completedAt: string;
  changedFiles: string[];
  checks: DeliveryVerificationCheck[];
  verdict: "accepted" | "rejected" | "inconclusive";
  unresolvedRisks: string[];
  commitSha: string | null;
};

export type DeliveryPublicationRecord = {
  schemaVersion: 1;
  recordType: "delivery-publication";
  recordId: string;
  cycleId: string;
  executionRunId: string;
  verificationRecordId: string;
  actor: string;
  createdAt: string;
  remoteName: string;
  repository: string;
  baseBranch: string;
  headBranch: string;
  commitSha: string;
  authorization: AuthorizationDecision;
  push: {
    status: "pushed";
    remoteCommit: string;
  };
  pullRequest:
    | {
        status: "created";
        number: number;
        url: string;
        state: "OPEN";
        isDraft: true;
      }
    | {
        status: "failed";
        errorDigest: string;
      };
  outcome: "published" | "inconclusive";
  unresolvedRisks: string[];
  limitations: string[];
};

export type DeliveryControlFile = {`,
    "publication record"
  );

  delivery = replaceOnce(
    delivery,
    `  verification: DeliveryVerificationRecord | null;
  verificationEvidenceRef: string | null;
};`,
    `  verification: DeliveryVerificationRecord | null;
  verificationEvidenceRef: string | null;
  publication: DeliveryPublicationRecord | null;
  publicationEvidenceRef: string | null;
};`,
    "publication control fields"
  );

  delivery = delivery.replaceAll("controlPath(", "deliveryControlPath(");
  delivery = delivery.replaceAll("writeControl(", "writeDeliveryControl(");
  delivery = delivery.replaceAll("loadControl(", "loadDeliveryControl(");
  delivery = delivery.replace(
    "function deliveryControlPath(store: EvolutionStore, cycleId: string): string {",
    "export function deliveryControlPath(store: EvolutionStore, cycleId: string): string {"
  );
  delivery = delivery.replace(
    "async function writeDeliveryControl(",
    "export async function writeDeliveryControl("
  );
  delivery = delivery.replace(
    "async function loadDeliveryControl(",
    "export async function loadDeliveryControl("
  );

  delivery = replaceOnce(
    delivery,
    `    verification: null,
    verificationEvidenceRef: null,
  };`,
    `    verification: null,
    verificationEvidenceRef: null,
    publication: null,
    publicationEvidenceRef: null,
  };`,
    "initial publication fields"
  );

  delivery = replaceOnce(
    delivery,
    `    verification: control.verification,
    branchName: control.execution.branchName,`,
    `    verification: control.verification,
    publication: control.publication,
    branchName: control.execution.branchName,`,
    "show publication"
  );

  await writeFile(deliveryPath, delivery, "utf8");
}

let docs = await readFile("docs/evolution/GOVERNED_DELIVERY.md", "utf8");
if (!docs.includes("## Opt-in draft PR publication")) {
  docs += `

## Opt-in draft PR publication

After independent verification creates a clean local commit, an operator may run:

\`\`\`bash
cyclewarden-deliver publish <cycle-id> \\
  --base main \\
  --remote origin \\
  --confirm-push-and-draft-pr
\`\`\`

Publication fails before push unless the cycle is still \`verified\`, the integrity-checked control points to an accepted verification, the local branch and worktree both equal the exact verified commit, the worktree is clean, the remote is a \`github.com\` repository, and \`gh auth status --hostname github.com\` succeeds. Push uses a single non-force refspec. CycleWarden then verifies the remote ref, opens a draft PR, confirms its head/base/draft state with \`gh pr view\`, and stores a content-addressed publication record.

The command never invokes merge or deployment. If the branch push succeeds but draft PR creation or confirmation fails, CycleWarden stores an inconclusive publication record and blocks duplicate automated publication so a human can recover safely.
`;
  await writeFile("docs/evolution/GOVERNED_DELIVERY.md", docs, "utf8");
}

let projectModel = await readFile("docs/ai/PROJECT_MODEL.md", "utf8");
projectModel = projectModel.replace(
  "- independent command checks, patch-drift rejection and local commit only after\n  an accepted verdict;",
  "- independent command checks, patch-drift rejection and local commit only after\n  an accepted verdict;\n- opt-in non-force push and GitHub draft PR publication for the exact verified commit;"
);
projectModel = projectModel.replace(
  "- explicit push and draft-PR operation after verification;",
  "- web controls for explicit push and draft-PR publication;"
);
projectModel = projectModel.replace(
  "- explicit push and draft PR with a GitHub scorecard;",
  "- web GitHub scorecard and human review controls for the existing draft PR publication path;"
);
await writeFile("docs/ai/PROJECT_MODEL.md", projectModel, "utf8");

const capabilitiesPath = "docs/CAPABILITIES.json";
const registry = JSON.parse(await readFile(capabilitiesPath, "utf8"));
const sandbox = registry.capabilities.find((item) => item.id === "sandboxed-agent-execution");
if (sandbox) {
  sandbox.summary = "CycleWarden has capability-negotiated trusted-local and Docker backends. The governed-delivery beta consumes a persisted ExecutionHandoff through a generic command or Codex CLI profile in an isolated git worktree, enforces changed-file scope, requires a distinct verifier, creates a local commit only after accepted checks, and can explicitly publish that exact commit as a GitHub draft PR. Trusted-local delivery is not a security sandbox.";
  sandbox.limitations = sandbox.limitations.map((item) =>
    item === "No automatic push, draft PR, merge or deployment operation"
      ? "Draft PR publication is explicit and CLI-only; no merge or deployment operation exists"
      : item
  );
}
const governed = registry.capabilities.find((item) => item.id === "governed-local-delivery-beta");
if (!governed) throw new Error("missing governed-local-delivery-beta capability");
governed.summary = "A planned A3/A4 cycle can bind an exact ExecutionHandoff digest to a shell-free command manifest, create an isolated branch/worktree, record content-addressed implementation evidence, reject filesystem scope escape, run independent verification commands, create a local commit only after an accepted verdict, and explicitly publish that exact commit as an open GitHub draft PR.";
for (const path of [
  "packages/evolution-core/src/delivery-publish.ts",
  "packages/evolution-core/src/delivery-publish.test.ts"
]) {
  if (!governed.evidence.includes(path)) governed.evidence.push(path);
}
for (const check of [
  "Unit test: explicit publication non-force pushes only the exact verified commit and records an open draft PR",
  "Unit tests: missing confirmation, unavailable gh and failed gh authentication prevent remote mutation",
  "Unit test: repeat publication is rejected to prevent duplicate draft PRs"
]) {
  if (!governed.checks.includes(check)) governed.checks.push(check);
}
governed.limitations = governed.limitations.map((item) =>
  item === "The local verified branch is not pushed and no draft PR is opened"
    ? "Draft PR publication requires explicit confirmation, an authenticated local gh CLI and a github.com remote"
    : item
);
if (!governed.limitations.includes("Fork publication and GitHub Enterprise are not implemented in the first slice")) {
  governed.limitations.push("Fork publication and GitHub Enterprise are not implemented in the first slice");
}
await writeFile(capabilitiesPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");

console.log("Applied publication control, documentation and capability truth.");

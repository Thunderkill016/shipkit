#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(process.cwd());

async function read(path) {
  return await readFile(resolve(root, path), "utf8");
}

async function write(path, content) {
  await writeFile(resolve(root, path), content, "utf8");
}

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`missing replacement marker: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`replacement marker is not unique: ${label}`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

async function patchDelivery() {
  let source = await read("packages/evolution-core/src/delivery.ts");
  source = replaceOnce(
    source,
    'import { mkdir, mkdtemp, readFile, realpath, rename, writeFile } from "node:fs/promises";',
    'import { lstat, mkdir, mkdtemp, readFile, readlink, realpath, rename, writeFile } from "node:fs/promises";',
    "delivery fs imports"
  );
  source = replaceOnce(
    source,
    '  worktreeId: string;\n  executable: string;',
    '  worktreeId: string;\n  patchDigest: string;\n  executable: string;',
    "execution patch digest type"
  );
  source = replaceOnce(
    source,
    `async function listChangedFiles(worktreePath: string): Promise<string[]> {
  const tracked = await runGit(worktreePath, ["diff", "--name-only", "--no-renames", "HEAD", "--"]);
  const untracked = await runGit(worktreePath, ["ls-files", "--others", "--exclude-standard"]);
  return [...new Set([...tracked.split("\\n"), ...untracked.split("\\n")].map((item) => item.trim()).filter(Boolean))]
    .map(normalizeRepositoryPath)
    .sort();
}

function sameStrings(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}`,
    `async function listChangedFiles(worktreePath: string): Promise<string[]> {
  const tracked = await runGit(worktreePath, ["diff", "--name-only", "--no-renames", "HEAD", "--"]);
  const untracked = await runGit(worktreePath, ["ls-files", "--others", "--exclude-standard"]);
  return [...new Set([...tracked.split("\\n"), ...untracked.split("\\n")].map((item) => item.trim()).filter(Boolean))]
    .map(normalizeRepositoryPath)
    .sort();
}

async function patchDigest(worktreePath: string, changedFiles: string[]): Promise<string> {
  const worktreeRoot = resolve(worktreePath);
  const digest = createHash("sha256");
  for (const changedFile of changedFiles) {
    const path = normalizeRepositoryPath(changedFile);
    const absolutePath = resolve(worktreeRoot, path);
    const offset = relative(worktreeRoot, absolutePath);
    if (offset === ".." || offset.startsWith(\`..\${sep}\`) || isAbsolute(offset)) {
      throw new DeliveryError(\`changed path escapes the delivery worktree: \${path}\`);
    }
    let info;
    try {
      info = await lstat(absolutePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        digest.update(\`deleted\\0\${path}\\0\`);
        continue;
      }
      throw error;
    }
    if (info.isSymbolicLink()) {
      const target = await readlink(absolutePath);
      const resolvedTarget = resolve(dirname(absolutePath), target);
      const targetOffset = relative(worktreeRoot, resolvedTarget);
      if (
        isAbsolute(target) ||
        targetOffset === ".." ||
        targetOffset.startsWith(\`..\${sep}\`) ||
        isAbsolute(targetOffset)
      ) {
        throw new DeliveryError(\`changed symlink escapes the delivery worktree: \${path}\`);
      }
      digest.update(\`symlink\\0\${path}\\0\${target}\\0\`);
      continue;
    }
    if (!info.isFile()) {
      throw new DeliveryError(\`changed path is not a regular file: \${path}\`);
    }
    digest.update(\`file\\0\${path}\\0\${info.mode}\\0\`);
    digest.update(await readFile(absolutePath));
    digest.update("\\0");
  }
  return digest.digest("hex");
}

function sameStrings(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}`,
    "content-addressed patch snapshot"
  );
  source = replaceOnce(
    source,
    `  let changedFiles: string[] = [];
  let violations: string[] = [];
  try {
    changedFiles = await listChangedFiles(worktreePath);
    violations = scopeViolations(changedFiles, handoff.allowedScope, handoff.forbiddenScope);
  } catch (error) {
    violations = [error instanceof Error ? error.message : String(error)];
  }`,
    `  let changedFiles: string[] = [];
  let implementationPatchDigest = sha256("");
  let violations: string[] = [];
  try {
    changedFiles = await listChangedFiles(worktreePath);
    violations = scopeViolations(changedFiles, handoff.allowedScope, handoff.forbiddenScope);
    implementationPatchDigest = await patchDigest(worktreePath, changedFiles);
  } catch (error) {
    violations = [error instanceof Error ? error.message : String(error)];
  }`,
    "execution patch snapshot"
  );
  source = replaceOnce(
    source,
    `    branchName,
    worktreeId,
    executable: basename(manifest.command.executable),`,
    `    branchName,
    worktreeId,
    patchDigest: implementationPatchDigest,
    executable: basename(manifest.command.executable),`,
    "persist patch digest"
  );
  source = replaceOnce(
    source,
    `      "trusted-local delivery is not a security sandbox and is only for an explicitly trusted repository",
      "the implementation adapter cannot merge, deploy, write production, or accept its own output",
      "external product validation has not been established",`,
    `      "trusted-local delivery is not a security sandbox and is only for an explicitly trusted repository",
      "CycleWarden orchestration does not invoke merge, deploy, or production writes, but the trusted command runs with the current operating-system user's privileges",
      "only a distinct verifier can transition the CycleWarden cycle to verified; this does not constrain arbitrary side effects of the trusted command outside the worktree",
      "external product validation has not been established",`,
    "trusted local limitation truth"
  );
  source = replaceOnce(
    source,
    `  const startedAt = input.now ?? new Date().toISOString();
  const beforeChecks = await listChangedFiles(control.worktreePath);
  const changedBeforeVerification = sameStrings(beforeChecks, control.execution.changedFiles);
  const checks: DeliveryVerificationCheck[] = [];
  if (changedBeforeVerification) {`,
    `  const startedAt = input.now ?? new Date().toISOString();
  let beforeChecks: string[] = [];
  let beforeDigest: string | null = null;
  let beforeSnapshotError: string | null = null;
  try {
    beforeChecks = await listChangedFiles(control.worktreePath);
    beforeDigest = await patchDigest(control.worktreePath, beforeChecks);
  } catch (error) {
    beforeSnapshotError = error instanceof Error ? error.message : String(error);
  }
  const changedBeforeVerification =
    beforeSnapshotError === null &&
    sameStrings(beforeChecks, control.execution.changedFiles) &&
    beforeDigest === control.execution.patchDigest;
  const checks: DeliveryVerificationCheck[] = [];
  if (changedBeforeVerification) {`,
    "before verification patch digest"
  );
  source = replaceOnce(
    source,
    `  const afterChecks = await listChangedFiles(control.worktreePath);
  const patchUnchanged = sameStrings(afterChecks, control.execution.changedFiles);
  const unresolvedRisks: string[] = [];
  if (!changedBeforeVerification) unresolvedRisks.push("worktree changed after implementation and before verification");
  if (!patchUnchanged) unresolvedRisks.push("verification commands changed the implementation patch");`,
    `  let afterChecks: string[] = [];
  let afterDigest: string | null = null;
  let afterSnapshotError: string | null = null;
  try {
    afterChecks = await listChangedFiles(control.worktreePath);
    afterDigest = await patchDigest(control.worktreePath, afterChecks);
  } catch (error) {
    afterSnapshotError = error instanceof Error ? error.message : String(error);
  }
  const patchUnchanged =
    afterSnapshotError === null &&
    sameStrings(afterChecks, control.execution.changedFiles) &&
    afterDigest === control.execution.patchDigest;
  const unresolvedRisks: string[] = [];
  if (!changedBeforeVerification) {
    unresolvedRisks.push(
      beforeSnapshotError
        ? \`cannot verify the implementation patch: \${beforeSnapshotError}\`
        : "worktree content changed after implementation and before verification"
    );
  }
  if (!patchUnchanged) {
    unresolvedRisks.push(
      afterSnapshotError
        ? \`cannot verify the post-check patch: \${afterSnapshotError}\`
        : "verification commands changed the implementation patch content"
    );
  }`,
    "after verification patch digest"
  );
  await write("packages/evolution-core/src/delivery.ts", source);
}

async function patchStandalone() {
  let source = await read("scripts/test-evolution-core-standalone.mjs");
  source = replaceOnce(
    source,
    `  if (!searchHelp.stdout.includes("CycleWarden reproducible public search research")) {
    throw new Error(
      "installed cyclewarden-research-search binary did not return expected help output"
    );
  }

  await persistDiagnostics();`,
    `  if (!searchHelp.stdout.includes("CycleWarden reproducible public search research")) {
    throw new Error(
      "installed cyclewarden-research-search binary did not return expected help output"
    );
  }

  const deliveryBinary = join(
    consumerRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "cyclewarden-deliver.cmd" : "cyclewarden-deliver"
  );
  const deliveryHelp = await run(deliveryBinary, ["--help"], consumerRoot);
  if (!deliveryHelp.stdout.includes("CycleWarden governed delivery")) {
    throw new Error("installed cyclewarden-deliver binary did not return expected help output");
  }

  await persistDiagnostics();`,
    "installed delivery binary proof"
  );
  source = replaceOnce(
    source,
    `        consumerCli: "passed",
        consumerCandidateCli: "passed",
        consumerSearchCli: "passed",`,
    `        consumerCli: "passed",
        consumerCandidateCli: "passed",
        consumerSearchCli: "passed",
        consumerDeliveryCli: "passed",`,
    "delivery binary diagnostic"
  );
  await write("scripts/test-evolution-core-standalone.mjs", source);
}

async function patchDeliveryDocs() {
  let source = await read("docs/evolution/GOVERNED_DELIVERY.md");
  source = replaceOnce(
    source,
    "The implementation actor cannot be the verifier actor. An accepted verification creates a commit on the isolated branch but does not push, open a PR, merge, deploy, read production secrets, or spend money.",
    "The implementation actor cannot be the verifier actor. CycleWarden orchestration creates a local commit only after independent verification and does not itself push, open a PR, merge, deploy, read production secrets, or spend money. The trusted implementation command still runs with the current operating-system user's privileges, so CycleWarden cannot technically prevent that command from invoking other installed tools or accessing resources available to that user.",
    "orchestration security truth"
  );
  source = replaceOnce(
    source,
    "The first beta uses the existing `trusted-local` backend because the Docker check backend mounts a read-only workspace and is not a mutation environment. Trusted-local execution is **not a security sandbox**. The selected repository and command must be trusted, and the process can access files available to the current operating-system user.\n\nA later slice may add a writable remote or microVM backend. This document must not be used to claim such isolation today.",
    "The first beta uses the existing `trusted-local` backend because the current Docker baseline denies network access and therefore cannot run an authenticated online Codex workflow. Although its bind-mounted workspace can be writable, it was verified as a bounded check backend rather than as a complete agent-mutation environment. Trusted-local execution is **not a security sandbox**. The selected repository, command and command arguments must be trusted, and the process can access files, credentials and network resources available to the current operating-system user.\n\nThe first slice also has no crash-safe delivery resume: an unexpected process termination after the cycle enters `executing` may require manual recovery. A later slice may add a writable remote or microVM backend, explicit egress policy and recovery records. This document must not be used to claim such isolation or resilience today.",
    "docker and crash recovery truth"
  );
  await write("docs/evolution/GOVERNED_DELIVERY.md", source);
}

async function patchPilotReadme() {
  await write(
    "docs/evolution/pilot/README.md",
    `# A2 Research Audit external pilot

This folder preserves the previously designed six-session external validation protocol for future use. It no longer blocks the owner-directed productization path chosen on 2026-07-24.

## Current status

- External audits: **0/6**.
- Pilot clock: **not started**.
- Protocol status: **deferred, not completed**.
- Product validation claim: **none**.

The protocol files remain immutable historical planning artifacts unless the owner explicitly reactivates the pilot. Technical completion, internal dogfood and future user adoption must not be reported as results from this protocol.

\`A2_RESEARCH_AUDIT_PROTOCOL.json\` is the fixed protocol.
\`PILOT_STATE.json\` is the untouched redacted progress ledger.
\`SESSION_TEMPLATE.json\` defines one redacted session record.
\`REPORT_TEMPLATE.md\` defines the six-session report.

## Reactivation rule

If the external pilot is reactivated later:

1. use the existing sample, timebox and thresholds without retroactively counting internal dogfood;
2. obtain consent before repository access;
3. capture the pre-audit decision before showing a recommendation;
4. keep direct identity, repository URL and raw notes outside Git;
5. commit only redacted pseudonymous records;
6. apply the precommitted aggregate decision rule without changing thresholds.

## Data boundary

Do not commit names, contact details, GitHub logins, repository URLs, customer data, credentials, secrets or raw notes. Commit only pseudonymous redacted evidence necessary to reconstruct a future decision-value classification.
`
  );
}

async function patchProjectModel() {
  let source = await read("docs/ai/PROJECT_MODEL.md");
  source = replaceOnce(
    source,
    "Initial validation may focus on developers already using coding agents, but this is a beachhead rather than the final product boundary.",
    "The owner chose an owner-directed single-user beta before external recruitment. The preserved external pilot remains a future validation option, not proof of value or a blocker for the current implementation sequence.",
    "user and validation direction"
  );
  source = replaceOnce(
    source,
    `### External Decision-Value Validation

Operationally ready:

- the fixed issue #14 protocol is machine-readable and merged on \`main\`;
- exactly six pseudonymous participant/repository slots are precommitted;
- the protocol and fail-closed operations pack technical gate is ready after PR #31;
- the bounded interactive A2/R1 operator surface is merged after PR #39;
- eligibility, consent, pre-audit decision, product/technical outcome
  separation, redaction and aggregate classification are checked in CI;
- schema drift, early session start, timebox violations, record-path mismatch,
  common sensitive-content patterns and unsupported decision-value claims fail
  closed.

Current evidence boundary:

- external completed audits are \`0/6\`;
- the 14-day clock has not started;
- no participant or external repository has been contacted or accessed;
- operational readiness does not establish decision value, user demand or
  repeat use.

Remaining human gates:

- choose an authorized recruitment channel;
- recruit eligible developers or maintainers and obtain explicit consent;
- run exactly six primary audits within the original timebox;
- apply the locked success, inconclusive, failure or protocol-gap rule without
  changing thresholds after observing results.`,
    `### External Decision-Value Validation

Preserved but deferred:

- the fixed issue #14 protocol, six pseudonymous slots, consent boundary,
  redaction schema and aggregate classifier remain machine-readable;
- issue #14 was closed as \`not planned\` for the current owner-directed phase,
  not completed;
- external completed audits remain \`0/6\` and the 14-day clock never started;
- no participant or external repository has been contacted or accessed;
- internal dogfood, technical CI and future organic adoption cannot be counted
  retroactively as results from this protocol.

The protocol may be reactivated later without changing its original sample,
timebox or thresholds. Until then CycleWarden has no external decision-value,
demand or repeat-use proof.`,
    "deferred external validation"
  );
  source = replaceOnce(
    source,
    `### Execution and Sandbox

Implemented baseline:

- capability-negotiated \`ExecutionBackend\`;
- honestly named trusted-local execution for acknowledged repositories;
- Docker execution with an immutable local image, denied network, read-only
  root, reduced environment, resource bounds and forced cleanup;
- hostile fixtures for secrets, credentials, symlinks, root writes, host paths,
  network and cleanup;
- generic command baseline and explicit sandbox-check CLI.

Remaining:

- egress allowlists and remote sandbox providers;
- hard writable-workspace disk quota;
- cross-platform container support and external security review;
- Codex, OpenHands and additional coding-agent adapters;
- isolated branch/worktree;
- progress, cost and artifact records;
- draft PR and rollback plan.`,
    `### Execution and Sandbox

Implemented beta baseline:

- capability-negotiated \`ExecutionBackend\` with honestly named trusted-local
  and hostile-check Docker paths;
- a manifest-bound generic command adapter and Codex CLI command profile;
- exact \`ExecutionHandoff.parameterDigest\` binding;
- clean-base requirement and isolated git branch/worktree;
- shell-free bounded command invocation with reduced environment, timeout and
  output limits;
- content-addressed change manifests, filesystem-scope enforcement and external
  symlink rejection;
- separate implementation and verification actors;
- independent command checks, patch-drift rejection and local commit only after
  an accepted verdict;
- Docker hostile fixtures for secrets, credentials, symlinks, root writes, host
  paths, network and cleanup.

Remaining:

- trusted-local execution is not a sandbox and can exercise the current user's
  filesystem, credentials and network privileges;
- crash-safe resume or rollback for a cycle stranded at \`executing\`;
- explicit push and draft-PR operation after verification;
- workspace execution, pause/cancel, progress and intervention controls;
- writable remote or microVM agent backend, egress policy and disk quota;
- OpenHands and additional agent adapters, cross-platform support and external
  security review.`,
    "delivery implementation status"
  );
  source = replaceOnce(
    source,
    `### Verification, Release and Operations

Planned:

- independent verifier separate from implementer;
- test, lint, type, build, security and policy packs;
- regression and adversarial checks;
- GitHub Action and PR scorecard;
- provenance and attestations;
- authorized release/deployment adapters;
- Vercel and Docker operational paths;
- database migration and environment checks;
- release evidence, rollback and incident records.`,
    `### Verification, Release and Operations

Partially implemented:

- independent verifier identity must differ from the implementer;
- manifest-defined shell-free checks produce accepted, rejected or inconclusive
  durable evidence;
- patch content is digested before and after checks and accepted changes receive
  a local commit on the isolated branch.

Remaining:

- project-generated test/lint/type/build/security packs and policy re-evaluation;
- explicit push and draft PR with a GitHub scorecard;
- provenance attestations, authorized release/deployment adapters, rollback and
  incident records;
- Vercel/Docker operational execution and environment-specific evidence.`,
    "verification status"
  );
  source = replaceOnce(
    source,
    `## Current integration milestone

\`\`\`text
workspace objective
→ inspect and assess
→ research plan and reproducible search
→ sources, claims and contradictions
→ opportunities and decision
→ reversible experiment
→ persisted execution handoff
\`\`\`

The local workspace now operates this bounded deterministic slice against one
server-configured trusted repository. It remains one slice of the complete
CycleWarden lifecycle: public-web and direct-user research, manual decision
authoring, execution, verification, release and learning are still separate
future gates.`,
    `## Current integration milestone

\`\`\`text
workspace objective
→ inspect and assess
→ research and decision
→ persisted ExecutionHandoff
→ isolated trusted-local implementation
→ independent verification
→ verified local commit
\`\`\`

The web workspace still ends at \`ExecutionHandoff\`; governed delivery is
currently a CLI-only, trusted-repository beta. Push, draft PR, release,
deployment, measurement and learning remain separate future gates.`,
    "current integration milestone"
  );
  source = replaceOnce(
    source,
    "Latest verified merged state through PRs #41 and #39:",
    "Latest verified candidate state through PR #45:",
    "verification baseline"
  );
  source = replaceOnce(
    source,
    `- no single workspace operates the complete lifecycle;
- the interface operates only the deterministic local A2 repository path, not
  hosted collaboration, manual research authoring or external evidence;
- no real untrusted sandbox or coding-agent delivery;
- no independent full verification-to-release flow;`,
    `- no single workspace operates the complete lifecycle;
- the interface operates only the deterministic local A2 repository path, not
  hosted collaboration, manual research authoring, delivery or external evidence;
- governed delivery is trusted-local CLI-only and not an untrusted sandbox;
- no push/draft-PR or complete verification-to-release flow;`,
    "integration gaps"
  );
  source = replaceOnce(
    source,
    `- the external decision-value pilot is operational but remains \`0/6\`;
- no external user has yet demonstrated repeat complete-cycle use.`,
    `- the preserved external decision-value pilot is deferred and remains \`0/6\`;
- no external user has yet demonstrated repeat complete-cycle use.`,
    "external gap truth"
  );
  source = replaceOnce(
    source,
    `## Priority order

1. Keep one unified product identity, capability truth and fixed pilot protocol.
2. Keep the merged A2 workspace stable while running exactly six consented external decision audits under #14.
3. Apply the precommitted success, inconclusive, failure or protocol-gap rule without changing thresholds.
4. If successful, build one governed execution vertical slice from approved \`ExecutionHandoff\` through one real agent, independent verification and a draft PR.
5. If inconclusive, run at most one evidence-targeted redesigned pilot of the same size; if failed, reassess the beachhead, problem and value proposition before expanding capability.
6. Activate broader research, sandbox, release, learning, interoperability or hosted operation only when pilot evidence or a required dependency justifies it.

This order is a product-value gate, not a deletion of the intended full product.`,
    `## Priority order

1. Finish issue #44 as a reliable single-user local beta: handoff, isolated implementation, independent verification and reviewable change.
2. Add explicit push and draft-PR creation after an accepted verdict; never merge or deploy implicitly.
3. Add workspace controls for delivery status, approval, progress, pause/cancel and unresolved risks.
4. Replace trusted-local online-agent execution with a writable remote or microVM backend before accepting untrusted repositories.
5. Extend release, rollback, outcome measurement and learning through the same durable cycle.
6. Measure real adoption and outcomes when the owner introduces the product; external validation remains absent until evidence is actually collected.

The fixed six-session protocol is preserved for optional future reactivation but no longer blocks this owner-directed sequence.`,
    "owner-directed priority order"
  );
  source = replaceOnce(
    source,
    `- #14 — real-user decision-value validation; operations and the A2 operator surface are merged, but external evidence remains \`0/6\`;
- #15 — independent/versioned Evolution Core package;
- #16 — interactive product workspace integration.`,
    `- #14 — external decision-value validation deferred as not planned; evidence remains \`0/6\`;
- #15 — independent/versioned Evolution Core package;
- #16 — interactive product workspace integration;
- #17/#18 — governed agent execution and independent verification foundations;
- #44 — active owner-directed single-user beta vertical slice.`,
    "workstream tracking"
  );
  await write("docs/ai/PROJECT_MODEL.md", source);
}

async function patchCapabilities() {
  const path = "docs/CAPABILITIES.json";
  const registry = JSON.parse(await read(path));
  registry.lastVerified = "2026-07-24";
  registry.verificationScope =
    "Repository evidence and GitHub Actions through the PR #45 governed-delivery candidate. CycleWarden supports a standalone Evolution Core package on Node.js 20, 22 and 24, a bounded local A2 workspace through ExecutionHandoff, and an experimental A3/R1 trusted-local CLI path through isolated implementation, independent verification and a verified local commit. The external six-session protocol is preserved but deferred at 0/6; hosted multi-tenant operation, an untrusted writable agent sandbox, automatic push or draft PR, release, measured learning and external product value are not claimed.";

  const pilot = registry.capabilities.find((item) => item.id === "a2-external-decision-value-pilot");
  if (!pilot) throw new Error("missing a2 external pilot capability");
  pilot.summary =
    "A repository-backed fail-closed six-session protocol remains preserved for optional future external validation. The owner deferred this protocol on 2026-07-24; it is not completed and no internal or technical result is counted as external decision value.";
  pilot.limitations = [
    "The protocol is deferred and issue #14 is closed as not planned for the current phase, not completed",
    "External completed audits remain 0/6 and the 14-day clock never started",
    "No participant or external repository has been contacted or accessed",
    "Operational readiness, internal dogfood and technical CI do not establish user decision value",
    "Sensitive-content pattern checks support but do not replace human redaction review",
  ];

  const sandbox = registry.capabilities.find((item) => item.id === "sandboxed-agent-execution");
  if (!sandbox) throw new Error("missing sandboxed agent execution capability");
  sandbox.summary =
    "CycleWarden has capability-negotiated trusted-local and Docker backends. A governed-delivery beta now consumes a persisted ExecutionHandoff through a generic command or Codex CLI profile in an isolated git worktree, enforces changed-file scope, requires a distinct verifier and creates a local commit only after accepted checks. Trusted-local delivery is not a security sandbox.";
  for (const evidence of [
    "packages/evolution-core/src/delivery.ts",
    "packages/evolution-core/src/delivery-cli.ts",
    "packages/evolution-core/src/delivery.test.ts",
    "packages/evolution-core/src/delivery-hardening.test.ts",
    "docs/evolution/GOVERNED_DELIVERY.md",
  ]) {
    if (!sandbox.evidence.includes(evidence)) sandbox.evidence.push(evidence);
  }
  for (const check of [
    "Delivery tests: isolated branch/worktree, scope escape rejection and separate verifier",
    "Delivery hardening tests: clean base, exact digest, no-change, patch-content drift and shell rejection",
    "Standalone consumer proof: installed cyclewarden-deliver CLI",
  ]) {
    if (!sandbox.checks.includes(check)) sandbox.checks.push(check);
  }
  sandbox.limitations = [
    "Trusted-local delivery runs with the current operating-system user's filesystem, credential and network privileges",
    "The Docker baseline is verified for hostile checks, not as a complete authenticated online-agent mutation environment",
    "No crash-safe resume for a cycle interrupted after entering executing",
    "No automatic push, draft PR, merge or deployment operation",
    "No hard writable-workspace disk quota, restricted egress allowlist, remote sandbox provider or external security review",
    "Windows and macOS support is not established",
  ];

  const capability = {
    id: "governed-local-delivery-beta",
    category: "product",
    status: "partial",
    verificationStatus: "passing",
    summary:
      "A planned A3/A4 cycle can bind an exact ExecutionHandoff digest to a shell-free command manifest, create an isolated branch/worktree, record content-addressed implementation evidence, reject filesystem scope escape, run independent verification commands and create a local commit only after an accepted verdict.",
    evidence: [
      "packages/evolution-core/src/delivery.ts",
      "packages/evolution-core/src/delivery-cli.ts",
      "packages/evolution-core/src/bin-delivery.ts",
      "packages/evolution-core/src/delivery.test.ts",
      "packages/evolution-core/src/delivery-hardening.test.ts",
      "scripts/test-evolution-core-standalone.mjs",
      "docs/evolution/GOVERNED_DELIVERY.md",
    ],
    checks: [
      "Unit test: in-scope implementation becomes a verified local commit only after a separate verifier passes",
      "Unit test: outside-scope mutation is rejected",
      "Unit test: implementer cannot verify its own output",
      "Unit tests: dirty base, digest mismatch, no changes, same-file patch drift, mutating verifier and command shell rejection",
      "Standalone package proof on Node.js 20, 22 and 24 includes the installed delivery CLI",
    ],
    limitations: [
      "CLI only; the web workspace still ends at ExecutionHandoff",
      "Trusted-local execution is not a security sandbox and must be restricted to trusted repositories and commands",
      "The local verified branch is not pushed and no draft PR is opened",
      "No crash-safe execute resume, remote sandbox, release, deployment, outcome measurement or external validation",
    ],
  };
  const existingIndex = registry.capabilities.findIndex((item) => item.id === capability.id);
  if (existingIndex >= 0) registry.capabilities[existingIndex] = capability;
  else {
    const insertionIndex = registry.capabilities.findIndex(
      (item) => item.id === "verified-release-operations"
    );
    registry.capabilities.splice(insertionIndex < 0 ? registry.capabilities.length : insertionIndex, 0, capability);
  }
  await write(path, `${JSON.stringify(registry, null, 2)}\n`);
}

async function writeDecisionRecord() {
  await write(
    "docs/ai/plans/2026-07-24-owner-directed-single-user-beta.md",
    `# Owner-directed single-user beta sequence

Status: active owner decision  
Date: 2026-07-24  
Issues: #14, #16, #17, #18, #44

## Decision

Defer the fixed six-person external pilot and continue productization toward a complete single-user local beta. Issue #14 is closed as \`not planned\` for the current phase, not completed.

## Evidence boundary

- External audits remain \`0/6\`.
- The pilot clock never started.
- No participant or external repository was contacted.
- AtoEnglish and CycleWarden dogfood are internal use, not external validation.
- Technical CI and future organic usage must not be represented as completed pilot results.

## Active delivery sequence

\`\`\`text
A2 objective → research → reviewed ExecutionHandoff
→ trusted-local isolated implementation
→ independent verification
→ verified local commit
→ explicit push and draft PR
→ workspace controls
→ writable remote/microVM backend
→ authorized release and outcome learning
\`\`\`

## First slice — issue #44 / PR #45

- generic command adapter and optional Codex CLI profile;
- exact handoff digest binding;
- clean git base and isolated branch/worktree;
- shell-free bounded invocation;
- changed-file scope and symlink checks;
- content-addressed patch snapshot;
- distinct verifier, accepted/rejected/inconclusive result;
- local commit only after all checks pass.

## Explicit limitations

The first slice uses trusted-local execution. It is not a security sandbox and cannot prevent a trusted command from using the current user's available files, credentials, network or installed tools. CycleWarden orchestration does not itself push, merge or deploy, but stronger prevention requires a writable isolated agent backend.

The external pilot can be reactivated later under its original fixed protocol. Until real evidence is collected CycleWarden must state that external product value is unverified.
`
  );
}

await patchDelivery();
await patchStandalone();
await patchDeliveryDocs();
await patchPilotReadme();
await patchProjectModel();
await patchCapabilities();
await writeDecisionRecord();
console.log("Applied delivery hardening and owner-directed project truth refresh.");

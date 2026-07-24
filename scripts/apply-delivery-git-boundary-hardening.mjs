#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const deliveryPath = "packages/evolution-core/src/delivery.ts";
let source = await readFile(deliveryPath, "utf8");

function replaceOnce(before, after, label) {
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`missing replacement marker: ${label}`);
  if (source.indexOf(before, index + before.length) >= 0) {
    throw new Error(`replacement marker is not unique: ${label}`);
  }
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

replaceOnce(
  `function latestHandoff(cycle: EvolutionCycle): ExecutionHandoff {
  const handoff = cycle.research?.executionHandoffs.at(-1);
  if (!handoff) throw new DeliveryError("planned cycle has no persisted ExecutionHandoff");
  return handoff;
}

function portableCycleId`,
  `function latestHandoff(cycle: EvolutionCycle): ExecutionHandoff {
  const handoff = cycle.research?.executionHandoffs.at(-1);
  if (!handoff) throw new DeliveryError("planned cycle has no persisted ExecutionHandoff");
  return handoff;
}

function assertHandoffDeliveryPreconditions(handoff: ExecutionHandoff): void {
  const enforceableAllowed = handoff.allowedScope.filter(enforceableRule);
  if (enforceableAllowed.length === 0) {
    throw new DeliveryError("ExecutionHandoff requires at least one enforceable allowed path scope");
  }
  for (const rule of [...handoff.allowedScope, ...handoff.forbiddenScope].filter(enforceableRule)) {
    if (rule.includes("*") && !rule.replaceAll("\\\\", "/").endsWith("/**")) {
      throw new DeliveryError(
        \`unsupported scope glob: \${rule}; only exact paths, directory prefixes and directory/** are supported\`
      );
    }
  }
  if (handoff.rollbackPlan.length === 0) {
    throw new DeliveryError("ExecutionHandoff requires a rollback plan before mutation");
  }
  if (handoff.acceptanceCriteria.length === 0 || handoff.verificationPlan.length === 0) {
    throw new DeliveryError("ExecutionHandoff requires acceptance criteria and a verification plan");
  }
}

function portableCycleId`,
  "handoff mutation preflight"
);

replaceOnce(
  `  if (manifest.expectedParameterDigest !== handoff.parameterDigest) {
    throw new DeliveryError("delivery manifest parameter digest does not match the persisted ExecutionHandoff");
  }

  const runId`,
  `  if (manifest.expectedParameterDigest !== handoff.parameterDigest) {
    throw new DeliveryError("delivery manifest parameter digest does not match the persisted ExecutionHandoff");
  }
  assertHandoffDeliveryPreconditions(handoff);

  const runId`,
  "run handoff preflight"
);

replaceOnce(
  `    changedFiles = await listChangedFiles(worktreePath);
    violations.push(...scopeViolations(changedFiles, handoff.allowedScope, handoff.forbiddenScope));
    violations = [...new Set(violations)];
    implementationPatchDigest = await patchDigest(worktreePath, changedFiles);`,
  `    const implementationHead = await runGit(worktreePath, ["rev-parse", "HEAD"]);
    if (implementationHead !== baseCommit) {
      violations.push(
        \`implementation command changed git HEAD from \${baseCommit} to \${implementationHead}\`
      );
    }
    changedFiles = await listChangedFiles(worktreePath);
    violations.push(...scopeViolations(changedFiles, handoff.allowedScope, handoff.forbiddenScope));
    violations = [...new Set(violations)];
    implementationPatchDigest = await patchDigest(worktreePath, changedFiles);`,
  "implementation head lock"
);

replaceOnce(
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
    beforeDigest === control.execution.patchDigest;`,
  `  const startedAt = input.now ?? new Date().toISOString();
  let beforeChecks: string[] = [];
  let beforeDigest: string | null = null;
  let beforeHead: string | null = null;
  let beforeSnapshotError: string | null = null;
  try {
    beforeHead = await runGit(control.worktreePath, ["rev-parse", "HEAD"]);
    beforeChecks = await listChangedFiles(control.worktreePath);
    beforeDigest = await patchDigest(control.worktreePath, beforeChecks);
  } catch (error) {
    beforeSnapshotError = error instanceof Error ? error.message : String(error);
  }
  const changedBeforeVerification =
    beforeSnapshotError === null &&
    beforeHead === control.execution.baseCommit &&
    sameStrings(beforeChecks, control.execution.changedFiles) &&
    beforeDigest === control.execution.patchDigest;`,
  "verification base head lock"
);

replaceOnce(
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
    afterDigest === control.execution.patchDigest;`,
  `  let afterChecks: string[] = [];
  let afterDigest: string | null = null;
  let afterHead: string | null = null;
  let afterSnapshotError: string | null = null;
  try {
    afterHead = await runGit(control.worktreePath, ["rev-parse", "HEAD"]);
    afterChecks = await listChangedFiles(control.worktreePath);
    afterDigest = await patchDigest(control.worktreePath, afterChecks);
  } catch (error) {
    afterSnapshotError = error instanceof Error ? error.message : String(error);
  }
  const patchUnchanged =
    afterSnapshotError === null &&
    afterHead === control.execution.baseCommit &&
    sameStrings(afterChecks, control.execution.changedFiles) &&
    afterDigest === control.execution.patchDigest;`,
  "post-check head lock"
);

replaceOnce(
  `      beforeSnapshotError
        ? \`cannot verify the implementation patch: \${beforeSnapshotError}\`
        : "worktree content changed after implementation and before verification"`,
  `      beforeSnapshotError
        ? \`cannot verify the implementation patch: \${beforeSnapshotError}\`
        : beforeHead !== control.execution.baseCommit
          ? "git HEAD changed after implementation and before verification"
          : "worktree content changed after implementation and before verification"`,
  "before head risk"
);

replaceOnce(
  `      afterSnapshotError
        ? \`cannot verify the post-check patch: \${afterSnapshotError}\`
        : "verification commands changed the implementation patch content"`,
  `      afterSnapshotError
        ? \`cannot verify the post-check patch: \${afterSnapshotError}\`
        : afterHead !== control.execution.baseCommit
          ? "verification commands changed git HEAD"
          : "verification commands changed the implementation patch content"`,
  "after head risk"
);

replaceOnce(
  `  if (verdict === "accepted") {
    await runGit(control.worktreePath, ["add", "--all"]);
    await runGit(control.worktreePath, [
      "-c",
      "user.name=CycleWarden",
      "-c",
      "user.email=cyclewarden@local",
      "commit",
      "-m",`,
  `  if (verdict === "accepted") {
    const disabledHooksPath = join(deliveryDirectory(input.store, implemented.cycleId), "disabled-hooks");
    await mkdir(disabledHooksPath, { recursive: true });
    await runGit(control.worktreePath, ["add", "--all"]);
    await runGit(control.worktreePath, [
      "-c",
      "user.name=CycleWarden",
      "-c",
      "user.email=cyclewarden@local",
      "-c",
      \`core.hooksPath=\${disabledHooksPath}\`,
      "-c",
      "commit.gpgSign=false",
      "commit",
      "--no-verify",
      "-m",`,
  "disable commit hooks and signing"
);

await writeFile(deliveryPath, source, "utf8");

const testPath = "packages/evolution-core/src/delivery-hardening.test.ts";
let testSource = await readFile(testPath, "utf8");
const finalMarker = "\n});\n";
const finalIndex = testSource.lastIndexOf(finalMarker);
if (finalIndex < 0) throw new Error("missing final delivery hardening describe marker");
const tests = `

  it("rejects an implementation command that creates its own git commit", async () => {
    const fixture = await setup("implementation-commit");
    const manifestPath = await writeManifest(fixture.root, {
      commandSource:
        "const fs=require('node:fs');const cp=require('node:child_process');fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/result.md','ok');cp.execFileSync('git',['add','--all']);cp.execFileSync('git',['commit','-m','agent commit'])",
    });
    const executed = await executeDelivery({
      store: fixture.store,
      cycleId: fixture.cycleId,
      projectRoot: fixture.projectRoot,
      manifestPath,
      actor: "fixture-implementer",
      trustedRepository: true,
    });
    temporaryRoots.push(dirname(executed.worktreePath));
    expect(executed.execution.status).toBe("failed");
    expect(executed.execution.scopeViolations.join(" ")).toMatch(/changed git HEAD/);
    expect(executed.cycle.stage).toBe("rejected");
  });

  it("rejects a verification command that changes git HEAD", async () => {
    const fixture = await setup("verifier-commit");
    const manifestPath = await writeManifest(fixture.root, {
      commandSource:
        "const fs=require('node:fs');fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/result.md','ok')",
      verificationSource:
        "const cp=require('node:child_process');cp.execFileSync('git',['add','--all']);cp.execFileSync('git',['commit','-m','verifier commit'])",
    });
    const executed = await executeDelivery({
      store: fixture.store,
      cycleId: fixture.cycleId,
      projectRoot: fixture.projectRoot,
      manifestPath,
      actor: "fixture-implementer",
      trustedRepository: true,
    });
    temporaryRoots.push(dirname(executed.worktreePath));
    const verified = await verifyDelivery({
      store: fixture.store,
      cycleId: fixture.cycleId,
      projectRoot: fixture.projectRoot,
      actor: "fixture-independent-verifier",
    });
    expect(verified.verification.verdict).toBe("rejected");
    expect(verified.verification.unresolvedRisks).toContain(
      "verification commands changed git HEAD"
    );
  });

  it("creates the verified commit without running repository commit hooks", async () => {
    const fixture = await setup("commit-hooks-disabled");
    const hooksPath = await run(fixture.projectRoot, "git", ["rev-parse", "--git-path", "hooks"]);
    await mkdir(hooksPath, { recursive: true });
    const hookPath = join(hooksPath, "pre-commit");
    await writeFile(hookPath, "#!/bin/sh\nexit 91\n", { encoding: "utf8", mode: 0o755 });
    const manifestPath = await writeManifest(fixture.root, {
      commandSource:
        "const fs=require('node:fs');fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/result.md','ok')",
    });
    const executed = await executeDelivery({
      store: fixture.store,
      cycleId: fixture.cycleId,
      projectRoot: fixture.projectRoot,
      manifestPath,
      actor: "fixture-implementer",
      trustedRepository: true,
    });
    temporaryRoots.push(dirname(executed.worktreePath));
    const verified = await verifyDelivery({
      store: fixture.store,
      cycleId: fixture.cycleId,
      projectRoot: fixture.projectRoot,
      actor: "fixture-independent-verifier",
    });
    expect(verified.verification.verdict).toBe("accepted");
    expect(verified.verification.commitSha).toMatch(/^[a-f0-9]{40}$/);
  });`;
testSource = testSource.slice(0, finalIndex) + tests + testSource.slice(finalIndex);
await writeFile(testPath, testSource, "utf8");
console.log("Applied delivery git-boundary, preflight and commit-hook hardening.");

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import type { DeliveryExecutionRecord, DeliveryVerificationRecord } from "./delivery.js";
import { recoverDelivery, showDeliveryRecovery } from "./delivery-recovery.js";
import { EvidenceRegistry } from "./evidence.js";
import { EvolutionStore, cycleStorageDirectoryName } from "./persistence.js";
import { createCycle, transitionCycle } from "./state-machine.js";
import type { EvolutionCycle, EvolutionStage, ExecutionHandoff } from "./types.js";

const execFileAsync = promisify(execFile);
const temporaryRoots: string[] = [];
const DIGEST = "a".repeat(64);

async function run(cwd: string, executable: string, arguments_: string[]): Promise<string> {
  const result = await execFileAsync(executable, arguments_, {
    cwd,
    maxBuffer: 4 * 1024 * 1024,
  });
  return result.stdout.trim();
}

function digestJson(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  );
});

async function createRepository(root: string) {
  const projectRoot = join(root, "project");
  await mkdir(projectRoot, { recursive: true });
  await run(projectRoot, "git", ["init", "-b", "main"]);
  await run(projectRoot, "git", ["config", "user.name", "CycleWarden Test"]);
  await run(projectRoot, "git", ["config", "user.email", "cyclewarden-test@example.invalid"]);
  await writeFile(join(projectRoot, "README.md"), "# Recovery fixture\n", "utf8");
  await run(projectRoot, "git", ["add", "README.md"]);
  await run(projectRoot, "git", ["commit", "-m", "Initial recovery fixture"]);
  return projectRoot;
}

async function createPlannedCycle(store: EvolutionStore, cycleId: string): Promise<EvolutionCycle> {
  let cycle: EvolutionCycle = createCycle({
    cycleId,
    objective: "Recover one interrupted governed delivery",
    autonomy: "A3",
    risk: "R1",
    now: "2026-07-24T00:00:00.000Z",
  });
  await store.create(cycle);
  const advance = async (
    to: EvolutionStage,
    input: Parameters<typeof transitionCycle>[2]
  ): Promise<void> => {
    const next = transitionCycle(cycle, to, input);
    cycle = await store.save(cycle, next);
  };
  await advance("observed", {
    actor: "fixture-inspector",
    reason: "Captured recovery fixture baseline",
    addArtifacts: { baseline: ["fixture:baseline"] },
  });
  await advance("modeled", {
    actor: "fixture-assessor",
    reason: "Modeled recovery fixture",
    addArtifacts: { model: ["fixture:model"] },
  });
  await advance("diagnosed", {
    actor: "fixture-researcher",
    reason: "Diagnosed interrupted delivery risk",
    addArtifacts: { diagnosis: ["fixture:diagnosis"], candidates: ["fixture:candidates"] },
  });
  await advance("researched", {
    actor: "fixture-researcher",
    reason: "Researched recovery behavior",
    addArtifacts: { research: ["fixture:research"] },
  });
  await advance("decided", {
    actor: "fixture-reviewer",
    reason: "Selected bounded recovery behavior",
    addArtifacts: { decision: ["fixture:decision"] },
  });
  const handoff: ExecutionHandoff = {
    recordId: `execution-handoff:${cycleId}`,
    cycleId,
    actor: "fixture-researcher",
    createdAt: "2026-07-24T00:00:00.000Z",
    evidenceRefs: ["fixture:research"],
    kind: "execution-handoff",
    experimentId: `experiment:${cycleId}`,
    objective: "Write one bounded recovery fixture result",
    allowedScope: ["docs/**"],
    forbiddenScope: ["secrets", "production"],
    acceptanceCriteria: ["docs/result.md contains ok"],
    verificationPlan: ["inspect docs/result.md"],
    rollbackPlan: ["delete docs/result.md"],
    parameterDigest: DIGEST,
  };
  await advance("planned", {
    actor: "fixture-researcher",
    reason: "Prepared recovery fixture handoff",
    addArtifacts: { plan: ["fixture:plan"], rollback: ["fixture:rollback"] },
    appendResearch: { executionHandoffs: [handoff] },
  });
  return cycle;
}

async function createInterruptedFixture(name: string) {
  const root = await mkdtemp(join(tmpdir(), `cyclewarden-recovery-${name}-`));
  temporaryRoots.push(root);
  const projectRoot = await createRepository(root);
  const store = new EvolutionStore(join(root, ".cyclewarden"));
  const cycleId = `recovery:${name}`;
  const planned = await createPlannedCycle(store, cycleId);
  const baseCommit = await run(projectRoot, "git", ["rev-parse", "HEAD"]);
  const branchName = `cyclewarden/${name}`;
  const worktreePath = join(root, "worktree");
  await run(projectRoot, "git", ["worktree", "add", "-b", branchName, worktreePath, baseCommit]);
  await mkdir(join(worktreePath, "docs"), { recursive: true });
  await writeFile(join(worktreePath, "docs", "result.md"), "ok", "utf8");

  const executing = transitionCycle(planned, "executing", {
    actor: "fixture-implementer",
    reason: "Started interrupted recovery fixture",
  });
  await store.save(planned, executing);

  const execution: DeliveryExecutionRecord = {
    schemaVersion: 1,
    recordType: "delivery-execution",
    runId: `delivery:${name}`,
    cycleId,
    handoffRecordId: `execution-handoff:${cycleId}`,
    handoffParameterDigest: DIGEST,
    adapter: "generic-command",
    actor: "fixture-implementer",
    backend: "trusted-local",
    startedAt: "2026-07-24T00:01:00.000Z",
    completedAt: "2026-07-24T00:02:00.000Z",
    baseCommit,
    branchName,
    worktreeId: name,
    patchDigest: "b".repeat(64),
    executable: "node",
    argumentsDigest: "c".repeat(64),
    commandStatus: "passed",
    exitCode: 0,
    stdoutDigest: "d".repeat(64),
    stderrDigest: "e".repeat(64),
    stdoutTruncated: false,
    stderrTruncated: false,
    changedFiles: ["docs/result.md"],
    scopeViolations: [],
    status: "implemented",
    limitations: ["fixture"],
  };
  const evidence = await new EvidenceRegistry(store.rootDir, projectRoot).registerJson(
    "delivery-execution",
    execution
  );
  const executionEvidenceRef = `evidence:${evidence.occurrenceId}`;
  return {
    root,
    projectRoot,
    store,
    cycleId,
    executing,
    execution,
    executionEvidenceRef,
    worktreePath,
  };
}

async function writeControl(
  fixture: Awaited<ReturnType<typeof createInterruptedFixture>>,
  verification: DeliveryVerificationRecord | null,
  verificationEvidenceRef: string | null
) {
  const payload = {
    schemaVersion: 1 as const,
    cycleId: fixture.cycleId,
    projectRoot: fixture.projectRoot,
    worktreePath: fixture.worktreePath,
    manifest: {
      schemaVersion: 1 as const,
      adapter: "generic-command" as const,
      expectedParameterDigest: DIGEST,
      command: { executable: "node", arguments: [] },
      verification: [{ id: "fixture-check", executable: "node", arguments: [] }],
    },
    execution: fixture.execution,
    executionEvidenceRef: fixture.executionEvidenceRef,
    verification,
    verificationEvidenceRef,
  };
  const directory = join(
    fixture.store.rootDir,
    "delivery",
    cycleStorageDirectoryName(fixture.cycleId)
  );
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, "control.json"),
    `${JSON.stringify({ ...payload, integrityDigest: digestJson(payload) }, null, 2)}\n`,
    "utf8"
  );
}

describe("delivery recovery reconciliation", () => {
  it("is read-only by default and applies a recorded implementation only with --apply", async () => {
    const fixture = await createInterruptedFixture("execution-recorded");
    await writeControl(fixture, null, null);

    const inspected = await recoverDelivery({
      store: fixture.store,
      cycleId: fixture.cycleId,
      projectRoot: fixture.projectRoot,
      actor: "fixture-recovery-operator",
      apply: false,
    });
    expect(inspected.recovery.decision).toBe("apply-transition");
    expect(inspected.recovery.targetStage).toBe("implemented");
    expect(inspected.recovery.applied).toBe(false);
    expect((await fixture.store.load(fixture.cycleId)).stage).toBe("executing");

    const applied = await recoverDelivery({
      store: fixture.store,
      cycleId: fixture.cycleId,
      projectRoot: fixture.projectRoot,
      actor: "fixture-recovery-operator",
      apply: true,
    });
    expect(applied.cycle.stage).toBe("implemented");
    expect(applied.recovery.applied).toBe(true);
    expect(applied.cycle.artifacts.changes).toContain(fixture.executionEvidenceRef);
    expect((await showDeliveryRecovery(fixture.store, fixture.cycleId)).recovery?.stageAfter).toBe(
      "implemented"
    );
  });

  it("completes a durable accepted verification only when the exact clean commit remains", async () => {
    const fixture = await createInterruptedFixture("verification-recorded");
    const implemented = transitionCycle(fixture.executing, "implemented", {
      actor: "fixture-implementer",
      reason: "Persisted implementation before verification crash",
      addArtifacts: { changes: [fixture.executionEvidenceRef] },
    });
    await fixture.store.save(fixture.executing, implemented);
    await run(fixture.worktreePath, "git", ["add", "--all"]);
    await run(fixture.worktreePath, "git", [
      "-c",
      "user.name=CycleWarden",
      "-c",
      "user.email=cyclewarden@local",
      "commit",
      "-m",
      "Verified fixture",
    ]);
    const commitSha = await run(fixture.worktreePath, "git", ["rev-parse", "HEAD"]);
    const verification: DeliveryVerificationRecord = {
      schemaVersion: 1,
      recordType: "delivery-verification",
      recordId: `verification:${fixture.cycleId}`,
      cycleId: fixture.cycleId,
      executionRunId: fixture.execution.runId,
      implementerActor: fixture.execution.actor,
      verifierActor: "fixture-independent-verifier",
      startedAt: "2026-07-24T00:03:00.000Z",
      completedAt: "2026-07-24T00:04:00.000Z",
      changedFiles: fixture.execution.changedFiles,
      checks: [],
      verdict: "accepted",
      unresolvedRisks: [],
      commitSha,
    };
    const verificationEvidence = await new EvidenceRegistry(
      fixture.store.rootDir,
      fixture.projectRoot
    ).registerJson("delivery-verification", verification);
    const verificationEvidenceRef = `evidence:${verificationEvidence.occurrenceId}`;
    await writeControl(fixture, verification, verificationEvidenceRef);

    const recovered = await recoverDelivery({
      store: fixture.store,
      cycleId: fixture.cycleId,
      projectRoot: fixture.projectRoot,
      actor: "fixture-recovery-operator",
      apply: true,
    });

    expect(recovered.cycle.stage).toBe("verified");
    expect(recovered.worktree.status).toBe("verified-commit-intact");
    expect(recovered.cycle.artifacts.verification).toContain(verificationEvidenceRef);
  });

  it("never infers accepted verification from an unrecorded commit", async () => {
    const fixture = await createInterruptedFixture("unrecorded-commit");
    const implemented = transitionCycle(fixture.executing, "implemented", {
      actor: "fixture-implementer",
      reason: "Implementation persisted before an interrupted verifier",
      addArtifacts: { changes: [fixture.executionEvidenceRef] },
    });
    await fixture.store.save(fixture.executing, implemented);
    await run(fixture.worktreePath, "git", ["add", "--all"]);
    await run(fixture.worktreePath, "git", [
      "-c",
      "user.name=CycleWarden",
      "-c",
      "user.email=cyclewarden@local",
      "commit",
      "-m",
      "Unrecorded verifier commit",
    ]);
    await writeControl(fixture, null, null);

    const recovered = await recoverDelivery({
      store: fixture.store,
      cycleId: fixture.cycleId,
      projectRoot: fixture.projectRoot,
      actor: "fixture-recovery-operator",
      apply: true,
    });

    expect(recovered.worktree.status).toBe("unrecorded-commit");
    expect(recovered.recovery.decision).toBe("mark-inconclusive");
    expect(recovered.cycle.stage).toBe("inconclusive");
    expect(recovered.recovery.findings.join(" ")).toMatch(/no durable verification verdict/);
  });

  it("marks an executing cycle inconclusive when no durable control exists", async () => {
    const fixture = await createInterruptedFixture("missing-control");

    const recovered = await recoverDelivery({
      store: fixture.store,
      cycleId: fixture.cycleId,
      projectRoot: fixture.projectRoot,
      actor: "fixture-recovery-operator",
      apply: true,
    });

    expect(recovered.recovery.controlStatus).toBe("missing");
    expect(recovered.cycle.stage).toBe("inconclusive");
    expect(recovered.recovery.findings.join(" ")).toMatch(/cannot be proven/);
  });

  it("keeps an intact unverified patch implemented so verification can be rerun", async () => {
    const fixture = await createInterruptedFixture("resume-verification");
    const implemented = transitionCycle(fixture.executing, "implemented", {
      actor: "fixture-implementer",
      reason: "Implementation persisted before verification started",
      addArtifacts: { changes: [fixture.executionEvidenceRef] },
    });
    await fixture.store.save(fixture.executing, implemented);
    await writeControl(fixture, null, null);

    const recovered = await recoverDelivery({
      store: fixture.store,
      cycleId: fixture.cycleId,
      projectRoot: fixture.projectRoot,
      actor: "fixture-recovery-operator",
      apply: true,
    });

    expect(recovered.recovery.decision).toBe("resume-verification");
    expect(recovered.recovery.applied).toBe(false);
    expect(recovered.cycle.stage).toBe("implemented");
    expect(recovered.recovery.nextAction).toMatch(/cyclewarden-deliver verify/);
  });
});

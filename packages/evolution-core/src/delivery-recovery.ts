import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, realpath, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { EvidenceRegistry } from "./evidence.js";
import { EvolutionStore, cycleStorageDirectoryName } from "./persistence.js";
import { transitionCycle } from "./state-machine.js";
import type { EvolutionCycle, EvolutionStage } from "./types.js";

const execFileAsync = promisify(execFile);
const GIT_MAX_BUFFER = 4 * 1024 * 1024;

export class DeliveryRecoveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryRecoveryError";
  }
}

type DeliveryExecutionStatus = "implemented" | "failed" | "inconclusive";
type DeliveryVerificationVerdict = "accepted" | "rejected" | "inconclusive";
type DeliveryPublicationStatus = "published" | "rejected" | "inconclusive";

type DeliveryControlFile = {
  schemaVersion: 1;
  integrityDigest: string;
  cycleId: string;
  projectRoot: string;
  worktreePath: string;
  execution: {
    runId: string;
    cycleId: string;
    actor: string;
    baseCommit: string;
    branchName: string;
    worktreeId: string;
    changedFiles: string[];
    patchDigest: string;
    status: DeliveryExecutionStatus;
  };
  executionEvidenceRef: string;
  verification: {
    recordId: string;
    cycleId: string;
    executionRunId: string;
    verdict: DeliveryVerificationVerdict;
    unresolvedRisks: string[];
    commitSha: string | null;
  } | null;
  verificationEvidenceRef: string | null;
  publication?: {
    status: DeliveryPublicationStatus;
    commitSha: string;
    draftPrUrl: string | null;
  } | null;
  publicationEvidenceRef?: string | null;
  [key: string]: unknown;
};

type ControlInspection =
  | { status: "valid"; control: DeliveryControlFile; findings: string[] }
  | { status: "missing"; findings: string[] }
  | { status: "invalid"; findings: string[] };

export type DeliveryWorktreeStatus =
  | "not-inspected"
  | "implementation-intact"
  | "verified-commit-intact"
  | "unrecorded-commit"
  | "missing"
  | "diverged"
  | "unavailable";

type WorktreeInspection = {
  status: DeliveryWorktreeStatus;
  head: string | null;
  branchHead: string | null;
  changedFiles: string[];
  findings: string[];
};

export type DeliveryRecoveryDecision =
  | "healthy"
  | "apply-transition"
  | "resume-verification"
  | "resume-publication"
  | "mark-inconclusive"
  | "blocked";

export type DeliveryRecoveryRecord = {
  schemaVersion: 1;
  recordType: "delivery-recovery";
  recordId: string;
  cycleId: string;
  actor: string;
  inspectedAt: string;
  applyRequested: boolean;
  applied: boolean;
  stageBefore: EvolutionStage;
  stageAfter: EvolutionStage;
  projectRoot: string;
  controlStatus: ControlInspection["status"];
  worktreeStatus: DeliveryWorktreeStatus;
  decision: DeliveryRecoveryDecision;
  targetStage: EvolutionStage | null;
  findings: string[];
  nextAction: string;
  limitations: string[];
};

type RecoverySidecar = {
  schemaVersion: 1;
  integrityDigest: string;
  cycleId: string;
  updatedAt: string;
  evidenceRef: string;
  latest: DeliveryRecoveryRecord;
};

export type RecoverDeliveryInput = {
  store: EvolutionStore;
  cycleId: string;
  projectRoot: string;
  actor: string;
  apply: boolean;
  now?: string;
};

type RecoveryPlan = {
  decision: DeliveryRecoveryDecision;
  targetStage: EvolutionStage | null;
  findings: string[];
  nextAction: string;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function digestJson(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function safeEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { CI: "true", NO_COLOR: "1" };
  for (const key of ["PATH", "HOME", "USERPROFILE", "SYSTEMROOT", "TMPDIR", "TMP", "TEMP"]) {
    const value = process.env[key];
    if (value !== undefined) environment[key] = value;
  }
  return environment;
}

async function runGit(cwd: string, arguments_: string[]): Promise<string> {
  try {
    const result = await execFileAsync("git", arguments_, {
      cwd,
      env: safeEnvironment(),
      encoding: "utf8",
      maxBuffer: GIT_MAX_BUFFER,
      timeout: 60_000,
      windowsHide: true,
    });
    return String(result.stdout ?? "").trim();
  } catch (error) {
    const stderr =
      typeof error === "object" && error !== null && "stderr" in error
        ? String(error.stderr ?? "").trim()
        : "";
    throw new DeliveryRecoveryError(stderr || (error instanceof Error ? error.message : String(error)));
  }
}

async function canonicalRepositoryRoot(projectRoot: string): Promise<string> {
  const requested = await realpath(resolve(projectRoot));
  const gitRoot = await realpath(await runGit(requested, ["rev-parse", "--show-toplevel"]));
  if (requested !== gitRoot) {
    throw new DeliveryRecoveryError(`project root must equal the git worktree root: ${gitRoot}`);
  }
  return gitRoot;
}

function deliveryDirectory(store: EvolutionStore, cycleId: string): string {
  return join(store.rootDir, "delivery", cycleStorageDirectoryName(cycleId));
}

function controlPath(store: EvolutionStore, cycleId: string): string {
  return join(deliveryDirectory(store, cycleId), "control.json");
}

function recoveryPath(store: EvolutionStore, cycleId: string): string {
  return join(deliveryDirectory(store, cycleId), "recovery.json");
}

async function atomicWriteJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, path);
}

function normalizeRepositoryPath(value: string): string {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || isAbsolute(normalized) || normalized === ".." || normalized.startsWith("../")) {
    throw new DeliveryRecoveryError(`invalid changed repository path: ${value}`);
  }
  return normalized;
}

function sameStrings(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function listChangedFiles(worktreePath: string): Promise<string[]> {
  const tracked = await runGit(worktreePath, ["diff", "--name-only", "--no-renames", "HEAD", "--"]);
  const untracked = await runGit(worktreePath, ["ls-files", "--others", "--exclude-standard"]);
  return [...new Set([...tracked.split("\n"), ...untracked.split("\n")].map((item) => item.trim()).filter(Boolean))]
    .map(normalizeRepositoryPath)
    .sort();
}

async function inspectControl(
  store: EvolutionStore,
  cycleId: string,
  projectRoot: string
): Promise<ControlInspection> {
  let parsed: DeliveryControlFile;
  try {
    parsed = JSON.parse(await readFile(controlPath(store, cycleId), "utf8")) as DeliveryControlFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { status: "missing", findings: ["delivery control sidecar is missing"] };
    }
    return {
      status: "invalid",
      findings: [`delivery control sidecar cannot be read: ${error instanceof Error ? error.message : String(error)}`],
    };
  }

  const findings: string[] = [];
  if (parsed.schemaVersion !== 1 || parsed.cycleId !== cycleId) {
    findings.push("delivery control sidecar does not match the requested cycle");
  }
  const { integrityDigest, ...payload } = parsed;
  if (!/^[a-f0-9]{64}$/i.test(integrityDigest) || integrityDigest !== digestJson(payload)) {
    findings.push("delivery control integrity digest mismatch");
  }
  if (parsed.projectRoot !== projectRoot) {
    findings.push("delivery control project root does not match the requested repository");
  }
  if (!parsed.execution || parsed.execution.cycleId !== cycleId || !parsed.executionEvidenceRef) {
    findings.push("delivery execution record is missing or does not match the cycle");
  }
  if (parsed.verification && parsed.verification.cycleId !== cycleId) {
    findings.push("delivery verification record does not match the cycle");
  }
  if (findings.length > 0) return { status: "invalid", findings };
  return { status: "valid", control: parsed, findings: [] };
}

async function inspectWorktree(controlInspection: ControlInspection): Promise<WorktreeInspection> {
  if (controlInspection.status !== "valid") {
    return {
      status: "not-inspected",
      head: null,
      branchHead: null,
      changedFiles: [],
      findings: ["worktree cannot be inspected without a valid delivery control sidecar"],
    };
  }
  const { control } = controlInspection;
  try {
    const worktreePath = await realpath(control.worktreePath);
    const worktreeRoot = await realpath(await runGit(worktreePath, ["rev-parse", "--show-toplevel"]));
    const offset = relative(worktreeRoot, worktreePath);
    if (offset === ".." || offset.startsWith(`..${sep}`) || isAbsolute(offset) || offset !== "") {
      return {
        status: "diverged",
        head: null,
        branchHead: null,
        changedFiles: [],
        findings: ["delivery worktree path is not its git worktree root"],
      };
    }
    const [head, branchHead, dirty, changedFiles] = await Promise.all([
      runGit(worktreePath, ["rev-parse", "HEAD"]),
      runGit(worktreePath, ["rev-parse", `refs/heads/${control.execution.branchName}`]),
      runGit(worktreePath, ["status", "--porcelain=v1", "--untracked-files=all"]),
      listChangedFiles(worktreePath),
    ]);
    const verificationCommit =
      control.verification?.verdict === "accepted" ? control.verification.commitSha : null;
    if (
      verificationCommit &&
      head === verificationCommit &&
      branchHead === verificationCommit &&
      dirty.length === 0
    ) {
      return {
        status: "verified-commit-intact",
        head,
        branchHead,
        changedFiles,
        findings: [],
      };
    }
    if (
      head === control.execution.baseCommit &&
      branchHead === control.execution.baseCommit &&
      sameStrings(changedFiles, control.execution.changedFiles)
    ) {
      return {
        status: "implementation-intact",
        head,
        branchHead,
        changedFiles,
        findings: [],
      };
    }
    if (!control.verification && head !== control.execution.baseCommit && branchHead === head && dirty.length === 0) {
      return {
        status: "unrecorded-commit",
        head,
        branchHead,
        changedFiles,
        findings: [
          "the isolated branch contains a clean commit that is absent from the durable verification record",
        ],
      };
    }
    return {
      status: "diverged",
      head,
      branchHead,
      changedFiles,
      findings: [
        "delivery branch or worktree content no longer matches the durable execution and verification records",
      ],
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return {
      status: code === "ENOENT" ? "missing" : "unavailable",
      head: null,
      branchHead: null,
      changedFiles: [],
      findings: [
        `delivery worktree inspection failed: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

function makePlan(
  cycle: EvolutionCycle,
  controlInspection: ControlInspection,
  worktree: WorktreeInspection
): RecoveryPlan {
  const findings = [...controlInspection.findings, ...worktree.findings];

  if (cycle.stage === "executing") {
    if (controlInspection.status !== "valid") {
      return {
        decision: "mark-inconclusive",
        targetStage: "inconclusive",
        findings: [...findings, "execution completion cannot be proven from durable state"],
        nextAction: "Preserve the isolated worktree for inspection and start a new cycle if the change is still needed.",
      };
    }
    const status = controlInspection.control.execution.status;
    if (status === "implemented" && worktree.status === "implementation-intact") {
      return {
        decision: "apply-transition",
        targetStage: "implemented",
        findings,
        nextAction: "Run independent verification with cyclewarden-deliver verify.",
      };
    }
    if (status === "failed") {
      return {
        decision: "apply-transition",
        targetStage: "rejected",
        findings,
        nextAction: "Inspect the execution evidence and prepare a corrected handoff or manifest.",
      };
    }
    if (status === "inconclusive") {
      return {
        decision: "apply-transition",
        targetStage: "inconclusive",
        findings,
        nextAction: "Inspect the execution evidence and decide whether to start a replacement cycle.",
      };
    }
    return {
      decision: "mark-inconclusive",
      targetStage: "inconclusive",
      findings: [...findings, "recorded implementation no longer matches the isolated worktree"],
      nextAction: "Preserve the worktree for inspection; do not verify or publish this run.",
    };
  }

  if (cycle.stage === "implemented") {
    if (controlInspection.status !== "valid") {
      return {
        decision: "mark-inconclusive",
        targetStage: "inconclusive",
        findings: [...findings, "verification cannot be resumed without a valid delivery control sidecar"],
        nextAction: "Preserve evidence and start a replacement cycle rather than accepting unverifiable output.",
      };
    }
    const verification = controlInspection.control.verification;
    if (!verification) {
      if (worktree.status === "implementation-intact") {
        return {
          decision: "resume-verification",
          targetStage: null,
          findings,
          nextAction: "Rerun cyclewarden-deliver verify with a verifier actor different from the implementer.",
        };
      }
      return {
        decision: "mark-inconclusive",
        targetStage: "inconclusive",
        findings: [
          ...findings,
          worktree.status === "unrecorded-commit"
            ? "a commit exists, but no durable verification verdict proves that checks passed"
            : "the implementation patch cannot be reproduced from the durable execution record",
        ],
        nextAction: "Do not accept the branch; preserve it for inspection and start a replacement cycle.",
      };
    }
    if (verification.verdict === "accepted") {
      if (
        controlInspection.control.verificationEvidenceRef &&
        verification.commitSha &&
        worktree.status === "verified-commit-intact"
      ) {
        return {
          decision: "apply-transition",
          targetStage: "verified",
          findings,
          nextAction: "Optionally publish the verified commit as a draft PR.",
        };
      }
      return {
        decision: "mark-inconclusive",
        targetStage: "inconclusive",
        findings: [...findings, "accepted verification record is not backed by the expected clean commit"],
        nextAction: "Do not publish; inspect the branch and durable evidence before starting a replacement cycle.",
      };
    }
    return {
      decision: "apply-transition",
      targetStage: verification.verdict === "rejected" ? "rejected" : "inconclusive",
      findings,
      nextAction:
        verification.verdict === "rejected"
          ? "Inspect failed checks and prepare a corrected cycle."
          : "Inspect unavailable or timed-out checks before starting a replacement cycle.",
    };
  }

  if (cycle.stage === "verified") {
    if (controlInspection.status !== "valid") {
      return {
        decision: "blocked",
        targetStage: null,
        findings: [...findings, "verified journal state exists but local delivery control cannot be trusted"],
        nextAction: "Do not publish until the control sidecar and verification evidence are restored or audited.",
      };
    }
    if (
      controlInspection.control.publication &&
      controlInspection.control.publication.status !== "published"
    ) {
      return {
        decision: "resume-publication",
        targetStage: null,
        findings,
        nextAction: "Rerun cyclewarden-deliver publish with the original explicit draft-PR options.",
      };
    }
    return {
      decision: "healthy",
      targetStage: null,
      findings,
      nextAction: controlInspection.control.publication?.status === "published"
        ? "Review the existing draft PR; CycleWarden still has no merge or deployment authority."
        : "Publication remains optional; use cyclewarden-deliver publish only when a draft PR is desired.",
    };
  }

  return {
    decision: "healthy",
    targetStage: null,
    findings,
    nextAction: `No delivery reconciliation is required while the cycle is ${cycle.stage}.`,
  };
}

function transitionArtifacts(
  stageBefore: EvolutionStage,
  targetStage: EvolutionStage,
  controlInspection: ControlInspection,
  recoveryEvidenceRef: string
) {
  const control = controlInspection.status === "valid" ? controlInspection.control : null;
  if (stageBefore === "executing") {
    return {
      changes: [
        ...(control?.executionEvidenceRef ? [control.executionEvidenceRef] : []),
        recoveryEvidenceRef,
      ],
    };
  }
  if (stageBefore === "implemented") {
    return {
      verification: [
        ...(control?.verificationEvidenceRef ? [control.verificationEvidenceRef] : []),
        recoveryEvidenceRef,
      ],
    };
  }
  throw new DeliveryRecoveryError(`recovery cannot apply ${stageBefore} -> ${targetStage}`);
}

async function persistRecoverySidecar(
  store: EvolutionStore,
  cycleId: string,
  record: DeliveryRecoveryRecord,
  evidenceRef: string
): Promise<void> {
  const payload = {
    schemaVersion: 1 as const,
    cycleId,
    updatedAt: record.inspectedAt,
    evidenceRef,
    latest: record,
  };
  const sidecar: RecoverySidecar = { ...payload, integrityDigest: digestJson(payload) };
  await atomicWriteJson(recoveryPath(store, cycleId), sidecar);
}

export async function recoverDelivery(input: RecoverDeliveryInput) {
  const actor = input.actor.trim();
  if (!actor) throw new DeliveryRecoveryError("delivery recovery actor is required");
  const projectRoot = await canonicalRepositoryRoot(input.projectRoot);
  const cycleBefore = await input.store.load(input.cycleId);
  const controlInspection = await inspectControl(input.store, input.cycleId, projectRoot);
  const worktree = await inspectWorktree(controlInspection);
  const plan = makePlan(cycleBefore, controlInspection, worktree);
  const inspectedAt = input.now ?? new Date().toISOString();
  const willApply = Boolean(input.apply && plan.targetStage);
  const stageAfter = willApply ? plan.targetStage! : cycleBefore.stage;
  const record: DeliveryRecoveryRecord = {
    schemaVersion: 1,
    recordType: "delivery-recovery",
    recordId: `recovery:${sha256(`${cycleBefore.cycleId}|${actor}|${inspectedAt}|${randomUUID()}`).slice(0, 24)}`,
    cycleId: cycleBefore.cycleId,
    actor,
    inspectedAt,
    applyRequested: input.apply,
    applied: willApply,
    stageBefore: cycleBefore.stage,
    stageAfter,
    projectRoot,
    controlStatus: controlInspection.status,
    worktreeStatus: worktree.status,
    decision: plan.decision,
    targetStage: plan.targetStage,
    findings: [...new Set(plan.findings)],
    nextAction: input.apply || !plan.targetStage
      ? plan.nextAction
      : `Inspect this plan, then rerun with --apply. ${plan.nextAction}`,
    limitations: [
      "recovery never infers a passing verification verdict from an unrecorded commit",
      "recovery does not rerun implementation commands, merge pull requests, deploy, or write production",
      "trusted-local git and filesystem inspection remains inside the current operating-system user's trust boundary",
      "publication retries remain explicit because PR title, body, remote and base options are operator-controlled",
    ],
  };
  const evidence = await new EvidenceRegistry(input.store.rootDir, projectRoot).registerJson(
    "delivery-recovery",
    record
  );
  const evidenceRef = `evidence:${evidence.occurrenceId}`;

  let cycle = cycleBefore;
  if (willApply) {
    const targetStage = plan.targetStage!;
    const next = transitionCycle(cycleBefore, targetStage, {
      actor,
      reason: `Recovered interrupted delivery: ${cycleBefore.stage} -> ${targetStage}; ${record.findings.join("; ") || plan.decision}`,
      now: inspectedAt,
      addArtifacts: transitionArtifacts(cycleBefore.stage, targetStage, controlInspection, evidenceRef),
      verificationPassed: targetStage === "verified",
    });
    cycle = await input.store.save(cycleBefore, next);
  }

  await persistRecoverySidecar(input.store, input.cycleId, record, evidenceRef);
  return {
    cycle,
    recovery: record,
    recoveryEvidenceRef: evidenceRef,
    control: controlInspection.status,
    worktree: {
      status: worktree.status,
      head: worktree.head,
      branchHead: worktree.branchHead,
      changedFiles: worktree.changedFiles,
    },
  };
}

export async function showDeliveryRecovery(store: EvolutionStore, cycleId: string) {
  let value: RecoverySidecar;
  try {
    value = JSON.parse(await readFile(recoveryPath(store, cycleId), "utf8")) as RecoverySidecar;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { recovery: null, recoveryEvidenceRef: null };
    }
    throw new DeliveryRecoveryError(
      `cannot read delivery recovery record for ${cycleId}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  const { integrityDigest, ...payload } = value;
  if (
    value.schemaVersion !== 1 ||
    value.cycleId !== cycleId ||
    !/^[a-f0-9]{64}$/i.test(integrityDigest) ||
    integrityDigest !== digestJson(payload)
  ) {
    throw new DeliveryRecoveryError("delivery recovery sidecar integrity mismatch");
  }
  return { recovery: value.latest, recoveryEvidenceRef: value.evidenceRef };
}

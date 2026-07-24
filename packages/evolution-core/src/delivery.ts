import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { lstat, mkdir, mkdtemp, readFile, readlink, realpath, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { EvidenceRegistry } from "./evidence.js";
import {
  TrustedLocalExecutionBackend,
  type ExecutionBackendResult,
} from "./execution-backend.js";
import { EvolutionStore, cycleStorageDirectoryName } from "./persistence.js";
import { authorizeAction } from "./policy.js";
import { transitionCycle } from "./state-machine.js";
import type { EvolutionCycle, ExecutionHandoff } from "./types.js";

const execFileAsync = promisify(execFile);
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_MAX_OUTPUT_BYTES = 1024 * 1024;
const MAX_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_OUTPUT_BYTES = 10 * 1024 * 1024;
const GIT_MAX_BUFFER = 4 * 1024 * 1024;
const SHELL_EXECUTABLES = new Set([
  "sh",
  "bash",
  "zsh",
  "fish",
  "cmd",
  "cmd.exe",
  "powershell",
  "powershell.exe",
  "pwsh",
  "pwsh.exe",
]);

export class DeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryError";
  }
}

export type DeliveryCommandSpec = {
  id?: string;
  executable: string;
  arguments: string[];
  relativeWorkingDirectory?: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
};

export type DeliveryManifest = {
  schemaVersion: 1;
  adapter: "generic-command" | "codex-cli";
  expectedParameterDigest: string;
  command: DeliveryCommandSpec;
  verification: DeliveryCommandSpec[];
};

export type DeliveryExecutionStatus = "implemented" | "failed" | "inconclusive";

export type DeliveryExecutionRecord = {
  schemaVersion: 1;
  recordType: "delivery-execution";
  runId: string;
  cycleId: string;
  handoffRecordId: string;
  handoffParameterDigest: string;
  adapter: DeliveryManifest["adapter"];
  actor: string;
  backend: "trusted-local";
  startedAt: string;
  completedAt: string;
  baseCommit: string;
  branchName: string;
  worktreeId: string;
  patchDigest: string;
  executable: string;
  argumentsDigest: string;
  commandStatus: ExecutionBackendResult["status"];
  exitCode: number | null;
  stdoutDigest: string;
  stderrDigest: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  changedFiles: string[];
  scopeViolations: string[];
  status: DeliveryExecutionStatus;
  limitations: string[];
};

export type DeliveryVerificationCheck = {
  id: string;
  executable: string;
  argumentsDigest: string;
  status: ExecutionBackendResult["status"];
  exitCode: number | null;
  stdoutDigest: string;
  stderrDigest: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
};

export type DeliveryVerificationRecord = {
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

type DeliveryControlFile = {
  schemaVersion: 1;
  cycleId: string;
  projectRoot: string;
  worktreePath: string;
  manifest: DeliveryManifest;
  execution: DeliveryExecutionRecord;
  executionEvidenceRef: string;
  verification: DeliveryVerificationRecord | null;
  verificationEvidenceRef: string | null;
};

export type ExecuteDeliveryInput = {
  store: EvolutionStore;
  cycleId: string;
  projectRoot: string;
  manifestPath: string;
  actor: string;
  trustedRepository: boolean;
  now?: string;
};

export type VerifyDeliveryInput = {
  store: EvolutionStore;
  cycleId: string;
  projectRoot: string;
  actor: string;
  now?: string;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function digestJson(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function safeEnvironment(): NodeJS.ProcessEnv {
  const keys = ["PATH", "HOME", "USERPROFILE", "SYSTEMROOT", "TMPDIR", "TMP", "TEMP"];
  const environment: NodeJS.ProcessEnv = { CI: "true", NO_COLOR: "1" };
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined) environment[key] = value;
  }
  return environment;
}

function positiveInteger(
  value: unknown,
  fallback: number,
  maximum: number,
  label: string
): number {
  const resolved = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(resolved) || resolved <= 0 || resolved > maximum) {
    throw new DeliveryError(`${label} must be an integer between 1 and ${maximum}`);
  }
  return resolved;
}

function assertCommandSpec(value: unknown, label: string, requireId: boolean): DeliveryCommandSpec {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DeliveryError(`${label} must be an object`);
  }
  const record = value as Record<string, unknown>;
  const executable = typeof record.executable === "string" ? record.executable.trim() : "";
  if (!executable) throw new DeliveryError(`${label}.executable is required`);
  if (SHELL_EXECUTABLES.has(basename(executable).toLowerCase())) {
    throw new DeliveryError(`${label}.executable may not invoke a command shell`);
  }
  if (!Array.isArray(record.arguments) || record.arguments.some((item) => typeof item !== "string")) {
    throw new DeliveryError(`${label}.arguments must be an array of strings`);
  }
  if (record.arguments.length > 128 || record.arguments.some((item) => item.length > 4_000)) {
    throw new DeliveryError(`${label}.arguments exceeds the bounded command limit`);
  }
  const id = typeof record.id === "string" ? record.id.trim() : undefined;
  if (requireId && (!id || !/^[A-Za-z0-9][A-Za-z0-9._-]{1,63}$/.test(id))) {
    throw new DeliveryError(`${label}.id must be a portable 2-64 character identifier`);
  }
  const workingDirectory =
    typeof record.relativeWorkingDirectory === "string"
      ? record.relativeWorkingDirectory.trim() || "."
      : ".";
  if (isAbsolute(workingDirectory)) {
    throw new DeliveryError(`${label}.relativeWorkingDirectory must be relative`);
  }
  const normalized = workingDirectory.replaceAll("\\", "/");
  if (normalized === ".." || normalized.startsWith("../") || normalized.includes("/../")) {
    throw new DeliveryError(`${label}.relativeWorkingDirectory escapes the worktree`);
  }
  return {
    ...(id ? { id } : {}),
    executable,
    arguments: [...record.arguments] as string[],
    relativeWorkingDirectory: workingDirectory,
    timeoutMs: positiveInteger(record.timeoutMs, DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS, `${label}.timeoutMs`),
    maxOutputBytes: positiveInteger(
      record.maxOutputBytes,
      DEFAULT_MAX_OUTPUT_BYTES,
      MAX_OUTPUT_BYTES,
      `${label}.maxOutputBytes`
    ),
  };
}

export async function loadDeliveryManifest(path: string): Promise<DeliveryManifest> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(resolve(path), "utf8"));
  } catch (error) {
    throw new DeliveryError(
      `cannot read delivery manifest ${resolve(path)}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new DeliveryError("delivery manifest must be an object");
  }
  const record = parsed as Record<string, unknown>;
  if (record.schemaVersion !== 1) throw new DeliveryError("delivery manifest schemaVersion must equal 1");
  if (record.adapter !== "generic-command" && record.adapter !== "codex-cli") {
    throw new DeliveryError("delivery manifest adapter must be generic-command or codex-cli");
  }
  const expectedParameterDigest =
    typeof record.expectedParameterDigest === "string" ? record.expectedParameterDigest.trim() : "";
  if (!/^[a-f0-9]{64}$/i.test(expectedParameterDigest)) {
    throw new DeliveryError("delivery manifest expectedParameterDigest must be a SHA-256 digest");
  }
  const command = assertCommandSpec(record.command, "delivery manifest command", false);
  if (record.adapter === "codex-cli" && !/^codex(?:\.exe)?$/i.test(basename(command.executable))) {
    throw new DeliveryError("codex-cli adapter requires the codex executable");
  }
  if (!Array.isArray(record.verification) || record.verification.length === 0) {
    throw new DeliveryError("delivery manifest requires at least one independent verification command");
  }
  if (record.verification.length > 8) {
    throw new DeliveryError("delivery manifest supports at most eight verification commands");
  }
  return {
    schemaVersion: 1,
    adapter: record.adapter,
    expectedParameterDigest,
    command,
    verification: record.verification.map((item, index) =>
      assertCommandSpec(item, `delivery manifest verification[${index}]`, true)
    ),
  };
}

async function runGit(cwd: string, args: string[]): Promise<string> {
  try {
    const result = await execFileAsync("git", args, {
      cwd,
      env: safeEnvironment(),
      maxBuffer: GIT_MAX_BUFFER,
      timeout: 60_000,
      windowsHide: true,
    });
    return result.stdout.trim();
  } catch (error) {
    const stderr =
      typeof error === "object" && error !== null && "stderr" in error
        ? String(error.stderr ?? "").trim()
        : "";
    throw new DeliveryError(stderr || (error instanceof Error ? error.message : String(error)));
  }
}

async function canonicalRepositoryRoot(projectRoot: string): Promise<string> {
  const requested = await realpath(resolve(projectRoot));
  const gitRoot = await realpath(await runGit(requested, ["rev-parse", "--show-toplevel"]));
  if (requested !== gitRoot) {
    throw new DeliveryError(`project root must equal the git worktree root: ${gitRoot}`);
  }
  return gitRoot;
}

async function assertCleanRepository(projectRoot: string): Promise<void> {
  const status = await runGit(projectRoot, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (status) throw new DeliveryError("delivery requires a clean repository before creating a worktree");
}

function latestHandoff(cycle: EvolutionCycle): ExecutionHandoff {
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
    if (rule.includes("*") && !rule.replaceAll("\\", "/").endsWith("/**")) {
      throw new DeliveryError(
        `unsupported scope glob: ${rule}; only exact paths, directory prefixes and directory/** are supported`
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

function portableCycleId(cycleId: string): string {
  return cycleId.replace(/[^A-Za-z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 64);
}

function normalizeRepositoryPath(value: string): string {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || isAbsolute(normalized) || normalized === ".." || normalized.startsWith("../")) {
    throw new DeliveryError(`invalid changed repository path: ${value}`);
  }
  return normalized;
}

function enforceableRule(rule: string): boolean {
  return rule.trim().length > 0 && !/\s/.test(rule);
}

function ruleMatches(path: string, rawRule: string): boolean {
  const rule = rawRule.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "");
  if (!enforceableRule(rule)) return false;
  if (rule.endsWith("/**")) {
    const prefix = rule.slice(0, -3).replace(/\/$/, "");
    return path === prefix || path.startsWith(`${prefix}/`);
  }
  if (rule.includes("*")) {
    throw new DeliveryError(`unsupported scope glob: ${rawRule}; only directory/** is supported`);
  }
  if (!rule.includes("/") && !rule.includes(".")) {
    return path === rule || path.startsWith(`${rule}/`) || path.split("/").includes(rule);
  }
  const leaf = rule.split("/").at(-1) ?? rule;
  return leaf.includes(".") ? path === rule : path === rule || path.startsWith(`${rule}/`);
}

function scopeViolations(
  changedFiles: string[],
  allowedScope: string[],
  forbiddenScope: string[]
): string[] {
  const allowedRules = allowedScope.filter(enforceableRule);
  if (allowedRules.length === 0) return ["ExecutionHandoff contains no enforceable allowed path scope"];
  const violations: string[] = [];
  for (const changedFile of changedFiles) {
    const path = normalizeRepositoryPath(changedFile);
    if (!allowedRules.some((rule) => ruleMatches(path, rule))) {
      violations.push(`${path} is outside allowedScope`);
    }
    for (const rule of forbiddenScope.filter(enforceableRule)) {
      if (ruleMatches(path, rule)) violations.push(`${path} matches forbiddenScope rule ${rule}`);
    }
  }
  return [...new Set(violations)];
}

async function listChangedFiles(worktreePath: string): Promise<string[]> {
  const tracked = await runGit(worktreePath, ["diff", "--name-only", "--no-renames", "HEAD", "--"]);
  const untracked = await runGit(worktreePath, ["ls-files", "--others", "--exclude-standard"]);
  return [...new Set([...tracked.split("\n"), ...untracked.split("\n")].map((item) => item.trim()).filter(Boolean))]
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
    if (offset === ".." || offset.startsWith(`..${sep}`) || isAbsolute(offset)) {
      throw new DeliveryError(`changed path escapes the delivery worktree: ${path}`);
    }
    let info;
    try {
      info = await lstat(absolutePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        digest.update(`deleted\0${path}\0`);
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
        targetOffset.startsWith(`..${sep}`) ||
        isAbsolute(targetOffset)
      ) {
        throw new DeliveryError(`changed symlink escapes the delivery worktree: ${path}`);
      }
      digest.update(`symlink\0${path}\0${target}\0`);
      continue;
    }
    if (!info.isFile()) {
      throw new DeliveryError(`changed path is not a regular file: ${path}`);
    }
    digest.update(`file\0${path}\0${info.mode}\0`);
    digest.update(await readFile(absolutePath));
    digest.update("\0");
  }
  return digest.digest("hex");
}

function sameStrings(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function deliveryDirectory(store: EvolutionStore, cycleId: string): string {
  return join(store.rootDir, "delivery", cycleStorageDirectoryName(cycleId));
}

function controlPath(store: EvolutionStore, cycleId: string): string {
  return join(deliveryDirectory(store, cycleId), "control.json");
}

async function atomicWriteJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, path);
}

async function loadControl(store: EvolutionStore, cycleId: string): Promise<DeliveryControlFile> {
  try {
    const value = JSON.parse(await readFile(controlPath(store, cycleId), "utf8")) as DeliveryControlFile;
    if (value.schemaVersion !== 1 || value.cycleId !== cycleId) {
      throw new DeliveryError("delivery control file does not match the requested cycle");
    }
    return value;
  } catch (error) {
    if (error instanceof DeliveryError) throw error;
    throw new DeliveryError(
      `cannot read delivery control for ${cycleId}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function containedCommandWorkingDirectory(
  worktreePath: string,
  relativeWorkingDirectory: string
): Promise<string> {
  const root = await realpath(resolve(worktreePath));
  const requested = resolve(root, relativeWorkingDirectory || ".");
  let workingDirectory: string;
  try {
    workingDirectory = await realpath(requested);
  } catch (error) {
    throw new DeliveryError(
      `command working directory does not exist: ${relativeWorkingDirectory}; ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  const offset = relative(root, workingDirectory);
  if (offset === ".." || offset.startsWith(`..${sep}`) || isAbsolute(offset)) {
    throw new DeliveryError("command working directory resolves outside the delivery worktree");
  }
  return offset || ".";
}

async function runBoundedCommand(
  worktreePath: string,
  spec: DeliveryCommandSpec
): Promise<ExecutionBackendResult> {
  const relativeWorkingDirectory = await containedCommandWorkingDirectory(
    worktreePath,
    spec.relativeWorkingDirectory ?? "."
  );
  const backend = new TrustedLocalExecutionBackend();
  await backend.assertAvailable();
  return await backend.execute({
    workspaceRoot: worktreePath,
    relativeWorkingDirectory,
    executable: spec.executable,
    arguments: spec.arguments,
    environment: safeEnvironment(),
    limits: {
      timeoutMs: spec.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxOutputBytes: spec.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES,
    },
  });
}

function executionStatus(
  result: ExecutionBackendResult,
  changedFiles: string[],
  violations: string[]
): DeliveryExecutionStatus {
  if (violations.length > 0 || result.status === "failed") return "failed";
  if (result.status === "unavailable" || result.status === "timed-out") return "inconclusive";
  if (result.status === "passed" && changedFiles.length > 0) return "implemented";
  return "inconclusive";
}

export async function executeDelivery(input: ExecuteDeliveryInput) {
  if (!input.trustedRepository) {
    throw new DeliveryError("trusted-local delivery requires explicit trusted repository acknowledgement");
  }
  const actor = input.actor.trim();
  if (!actor) throw new DeliveryError("delivery implementer actor is required");
  const projectRoot = await canonicalRepositoryRoot(input.projectRoot);
  await assertCleanRepository(projectRoot);
  const manifest = await loadDeliveryManifest(input.manifestPath);
  const planned = await input.store.load(input.cycleId);
  if (planned.stage !== "planned") {
    throw new DeliveryError(`execute requires a planned cycle; current stage is ${planned.stage}`);
  }
  if (planned.autonomy !== "A3" && planned.autonomy !== "A4") {
    throw new DeliveryError(`execute requires A3 or A4 autonomy; cycle is ${planned.autonomy}`);
  }
  const authorization = authorizeAction({
    autonomy: planned.autonomy,
    risk: planned.risk,
    action: "modify-code",
    cycleId: planned.cycleId,
    requiredScope: `cycle:${planned.cycleId}:modify-code`,
    approvals: planned.approvals,
  });
  if (!authorization.allowed) throw new DeliveryError(authorization.reason);
  const handoff = latestHandoff(planned);
  if (manifest.expectedParameterDigest !== handoff.parameterDigest) {
    throw new DeliveryError("delivery manifest parameter digest does not match the persisted ExecutionHandoff");
  }
  assertHandoffDeliveryPreconditions(handoff);

  const runId = `delivery:${sha256(`${planned.cycleId}|${randomUUID()}`).slice(0, 24)}`;
  const branchName = `cyclewarden/${portableCycleId(planned.cycleId)}-${runId.slice(-8)}`;
  const baseCommit = await runGit(projectRoot, ["rev-parse", "HEAD"]);
  const worktreeParent = await mkdtemp(join(tmpdir(), "cyclewarden-delivery-"));
  const worktreePath = join(worktreeParent, "workspace");
  await runGit(projectRoot, ["worktree", "add", "-b", branchName, worktreePath, baseCommit]);
  const worktreeId = basename(worktreeParent);
  const startedAt = input.now ?? new Date().toISOString();

  const executing = transitionCycle(planned, "executing", {
    actor,
    reason: `Started ${manifest.adapter} delivery in isolated branch ${branchName}`,
    now: startedAt,
  });
  await input.store.save(planned, executing);

  let result: ExecutionBackendResult;
  let commandBoundaryError: string | null = null;
  try {
    result = await runBoundedCommand(worktreePath, manifest.command);
  } catch (error) {
    commandBoundaryError = error instanceof Error ? error.message : String(error);
    result = {
      status: "failed",
      exitCode: null,
      signal: null,
      stdout: "",
      stderr: commandBoundaryError,
      stdoutTruncated: false,
      stderrTruncated: false,
    };
  }
  let changedFiles: string[] = [];
  let implementationPatchDigest = sha256("");
  let violations: string[] = commandBoundaryError ? [commandBoundaryError] : [];
  try {
    const implementationHead = await runGit(worktreePath, ["rev-parse", "HEAD"]);
    if (implementationHead !== baseCommit) {
      violations.push(
        `implementation command changed git HEAD from ${baseCommit} to ${implementationHead}`
      );
    }
    changedFiles = await listChangedFiles(worktreePath);
    violations.push(...scopeViolations(changedFiles, handoff.allowedScope, handoff.forbiddenScope));
    violations = [...new Set(violations)];
    implementationPatchDigest = await patchDigest(worktreePath, changedFiles);
  } catch (error) {
    violations = [error instanceof Error ? error.message : String(error)];
  }
  const completedAt = new Date().toISOString();
  const status = executionStatus(result, changedFiles, violations);
  const execution: DeliveryExecutionRecord = {
    schemaVersion: 1,
    recordType: "delivery-execution",
    runId,
    cycleId: planned.cycleId,
    handoffRecordId: handoff.recordId,
    handoffParameterDigest: handoff.parameterDigest,
    adapter: manifest.adapter,
    actor,
    backend: "trusted-local",
    startedAt,
    completedAt,
    baseCommit,
    branchName,
    worktreeId,
    patchDigest: implementationPatchDigest,
    executable: basename(manifest.command.executable),
    argumentsDigest: digestJson(manifest.command.arguments),
    commandStatus: result.status,
    exitCode: result.exitCode,
    stdoutDigest: sha256(result.stdout),
    stderrDigest: sha256(result.stderr),
    stdoutTruncated: result.stdoutTruncated,
    stderrTruncated: result.stderrTruncated,
    changedFiles,
    scopeViolations: violations,
    status,
    limitations: [
      "trusted-local delivery is not a security sandbox and is only for an explicitly trusted repository",
      "CycleWarden orchestration does not invoke merge, deploy, or production writes, but the trusted command runs with the current operating-system user's privileges",
      "only a distinct verifier can transition the CycleWarden cycle to verified; this does not constrain arbitrary side effects of the trusted command outside the worktree",
      "external product validation has not been established",
    ],
  };
  const evidence = await new EvidenceRegistry(input.store.rootDir, projectRoot).registerJson(
    "delivery-execution",
    execution
  );
  const evidenceRef = `evidence:${evidence.occurrenceId}`;
  const control: DeliveryControlFile = {
    schemaVersion: 1,
    cycleId: planned.cycleId,
    projectRoot,
    worktreePath,
    manifest,
    execution,
    executionEvidenceRef: evidenceRef,
    verification: null,
    verificationEvidenceRef: null,
  };
  await atomicWriteJson(controlPath(input.store, planned.cycleId), control);

  const nextStage = status === "implemented" ? "implemented" : status === "failed" ? "rejected" : "inconclusive";
  const next = transitionCycle(executing, nextStage, {
    actor,
    reason:
      status === "implemented"
        ? `Implementation changed ${changedFiles.length} in-scope file(s) and awaits independent verification`
        : status === "failed"
          ? `Implementation failed or escaped scope: ${violations.join("; ") || result.status}`
          : `Implementation was inconclusive: ${result.status}${changedFiles.length === 0 ? "; no changes produced" : ""}`,
    addArtifacts: { changes: [evidenceRef] },
  });
  const cycle = await input.store.save(executing, next);
  return { authorization, cycle, execution, worktreePath, controlPath: controlPath(input.store, planned.cycleId) };
}

function checkRecord(spec: DeliveryCommandSpec, result: ExecutionBackendResult): DeliveryVerificationCheck {
  return {
    id: spec.id ?? "verification",
    executable: basename(spec.executable),
    argumentsDigest: digestJson(spec.arguments),
    status: result.status,
    exitCode: result.exitCode,
    stdoutDigest: sha256(result.stdout),
    stderrDigest: sha256(result.stderr),
    stdoutTruncated: result.stdoutTruncated,
    stderrTruncated: result.stderrTruncated,
  };
}

export async function verifyDelivery(input: VerifyDeliveryInput) {
  const verifierActor = input.actor.trim();
  if (!verifierActor) throw new DeliveryError("delivery verifier actor is required");
  const projectRoot = await canonicalRepositoryRoot(input.projectRoot);
  const implemented = await input.store.load(input.cycleId);
  if (implemented.stage !== "implemented") {
    throw new DeliveryError(`verify requires an implemented cycle; current stage is ${implemented.stage}`);
  }
  const control = await loadControl(input.store, input.cycleId);
  if (control.projectRoot !== projectRoot) {
    throw new DeliveryError("delivery control project root does not match the requested repository");
  }
  if (control.execution.actor === verifierActor) {
    throw new DeliveryError("verifier actor must differ from the implementation actor");
  }
  const startedAt = input.now ?? new Date().toISOString();
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
    beforeDigest === control.execution.patchDigest;
  const checks: DeliveryVerificationCheck[] = [];
  if (changedBeforeVerification) {
    for (const spec of control.manifest.verification) {
      let result: ExecutionBackendResult;
      try {
        result = await runBoundedCommand(control.worktreePath, spec);
      } catch (error) {
        const boundaryFailure = error instanceof DeliveryError;
        result = {
          status: boundaryFailure ? "failed" : "unavailable",
          exitCode: null,
          signal: null,
          stdout: "",
          stderr: error instanceof Error ? error.message : String(error),
          stdoutTruncated: false,
          stderrTruncated: false,
        };
      }
      checks.push(checkRecord(spec, result));
    }
  }
  let afterChecks: string[] = [];
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
    afterDigest === control.execution.patchDigest;
  const unresolvedRisks: string[] = [];
  if (!changedBeforeVerification) {
    unresolvedRisks.push(
      beforeSnapshotError
        ? `cannot verify the implementation patch: ${beforeSnapshotError}`
        : beforeHead !== control.execution.baseCommit
          ? "git HEAD changed after implementation and before verification"
          : "worktree content changed after implementation and before verification"
    );
  }
  if (!patchUnchanged) {
    unresolvedRisks.push(
      afterSnapshotError
        ? `cannot verify the post-check patch: ${afterSnapshotError}`
        : afterHead !== control.execution.baseCommit
          ? "verification commands changed git HEAD"
          : "verification commands changed the implementation patch content"
    );
  }
  if (checks.length === 0) unresolvedRisks.push("no verification command was executed");
  for (const check of checks) {
    if (check.status !== "passed") unresolvedRisks.push(`${check.id} returned ${check.status}`);
  }

  let verdict: DeliveryVerificationRecord["verdict"];
  if (!changedBeforeVerification || !patchUnchanged || checks.some((check) => check.status === "failed")) {
    verdict = "rejected";
  } else if (
    checks.length === 0 ||
    checks.some((check) => check.status === "unavailable" || check.status === "timed-out")
  ) {
    verdict = "inconclusive";
  } else {
    verdict = "accepted";
  }

  let commitSha: string | null = null;
  if (verdict === "accepted") {
    const disabledHooksPath = join(deliveryDirectory(input.store, implemented.cycleId), "disabled-hooks");
    await mkdir(disabledHooksPath, { recursive: true });
    await runGit(control.worktreePath, ["add", "--all"]);
    await runGit(control.worktreePath, [
      "-c",
      "user.name=CycleWarden",
      "-c",
      "user.email=cyclewarden@local",
      "-c",
      `core.hooksPath=${disabledHooksPath}`,
      "-c",
      "commit.gpgSign=false",
      "commit",
      "--no-verify",
      "-m",
      `CycleWarden verified delivery for ${implemented.cycleId}`,
    ]);
    commitSha = await runGit(control.worktreePath, ["rev-parse", "HEAD"]);
    const dirtyAfterCommit = await runGit(control.worktreePath, ["status", "--porcelain=v1"]);
    if (dirtyAfterCommit) {
      verdict = "rejected";
      unresolvedRisks.push("worktree remained dirty after the verified commit");
      commitSha = null;
    }
  }

  const completedAt = new Date().toISOString();
  const verification: DeliveryVerificationRecord = {
    schemaVersion: 1,
    recordType: "delivery-verification",
    recordId: `verification:${sha256(`${control.execution.runId}|${verifierActor}|${completedAt}`).slice(0, 24)}`,
    cycleId: implemented.cycleId,
    executionRunId: control.execution.runId,
    implementerActor: control.execution.actor,
    verifierActor,
    startedAt,
    completedAt,
    changedFiles: control.execution.changedFiles,
    checks,
    verdict,
    unresolvedRisks: [...new Set(unresolvedRisks)],
    commitSha,
  };
  const evidence = await new EvidenceRegistry(input.store.rootDir, projectRoot).registerJson(
    "delivery-verification",
    verification
  );
  const evidenceRef = `evidence:${evidence.occurrenceId}`;
  control.verification = verification;
  control.verificationEvidenceRef = evidenceRef;
  await atomicWriteJson(controlPath(input.store, implemented.cycleId), control);

  const nextStage = verdict === "accepted" ? "verified" : verdict === "rejected" ? "rejected" : "inconclusive";
  const next = transitionCycle(implemented, nextStage, {
    actor: verifierActor,
    reason:
      verdict === "accepted"
        ? `Independent verification passed ${checks.length} command(s) and created commit ${commitSha}`
        : `Independent verification ${verdict}: ${verification.unresolvedRisks.join("; ")}`,
    addArtifacts: { verification: [evidenceRef] },
    verificationPassed: verdict === "accepted",
  });
  const cycle = await input.store.save(implemented, next);
  return { cycle, verification, branchName: control.execution.branchName, worktreePath: control.worktreePath };
}

export async function showDelivery(store: EvolutionStore, cycleId: string) {
  const control = await loadControl(store, cycleId);
  return {
    cycleId,
    execution: control.execution,
    verification: control.verification,
    branchName: control.execution.branchName,
    worktreeId: control.execution.worktreeId,
  };
}

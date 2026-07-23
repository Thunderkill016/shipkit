import { spawn } from "node:child_process";
import { access, cp, lstat, mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import type { ProjectSnapshot, RepositoryCheck } from "./repository.js";

const COPY_EXCLUDES = new Set([
  ".git",
  ".shipkit",
  ".next",
  ".turbo",
  ".cache",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "target",
  "vendor",
  ".venv",
  "venv",
]);

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_TIMEOUT_MS = 10 * 60_000;
const DEFAULT_OUTPUT_BYTES = 64 * 1024;
const MAX_OUTPUT_BYTES = 1024 * 1024;

export class CheckRunnerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckRunnerError";
  }
}

export type CheckResultStatus = "passed" | "failed" | "timed-out" | "unavailable";

export type CheckResult = {
  schemaVersion: 1;
  name: string;
  source: string;
  declaredCommand: string;
  invocation: {
    executable: string;
    arguments: string[];
    workingDirectory: string;
    shell: false;
  };
  status: CheckResultStatus;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  timeoutMs: number;
  stdout: string;
  stderr: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  isolation: {
    sourceWorkspace: "temporary-copy";
    dependencyAccess: "linked-existing-node_modules" | "none";
    dependencyInstall: false;
    networkIsolation: "not-enforced";
  };
};

export type CheckReport = {
  schemaVersion: 1;
  projectName: string;
  projectRoot: string;
  createdAt: string;
  requestedChecks: string[];
  discoveredChecks: number;
  selectedChecks: Array<{ name: string; source: string }>;
  results: CheckResult[];
  summary: {
    passed: number;
    failed: number;
    timedOut: number;
    unavailable: number;
  };
  limitations: string[];
};

type Invocation = {
  executable: string;
  args: string[];
  relativeWorkingDirectory: string;
};

type Collector = {
  append: (chunk: Buffer | string) => void;
  text: () => string;
  truncated: () => boolean;
};

function portablePath(path: string): string {
  return path.split(sep).join("/");
}

function boundedInteger(value: number | undefined, fallback: number, maximum: number): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value <= 0 || value > maximum) {
    throw new CheckRunnerError(`value must be a positive integer no greater than ${maximum}`);
  }
  return value;
}

function sanitizeOutput(value: string): string {
  return value
    .replace(/(authorization\s*:\s*bearer\s+)[^\s]+/gi, "$1[REDACTED]")
    .replace(/\b(gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,})\b/g, "[REDACTED]")
    .replace(
      /\b([A-Z][A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PRIVATE_KEY|API_KEY))\s*([=:])\s*([^\s]+)/g,
      "$1$2[REDACTED]"
    );
}

function collector(limit: number): Collector {
  const chunks: Buffer[] = [];
  let bytes = 0;
  let wasTruncated = false;
  return {
    append(chunk) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      const remaining = Math.max(0, limit - bytes);
      if (remaining > 0) chunks.push(buffer.subarray(0, remaining));
      bytes += Math.min(buffer.byteLength, remaining);
      if (buffer.byteLength > remaining) wasTruncated = true;
    },
    text() {
      return sanitizeOutput(Buffer.concat(chunks).toString("utf8"));
    },
    truncated() {
      return wasTruncated;
    },
  };
}

function selectChecks(snapshot: ProjectSnapshot, requested: string[]): RepositoryCheck[] {
  if (requested.length > 0) {
    const requestedSet = new Set(requested);
    const selected = snapshot.checks.filter((check) => requestedSet.has(check.name));
    const missing = [...requestedSet].filter(
      (name) => !snapshot.checks.some((check) => check.name === name)
    );
    if (missing.length > 0) {
      throw new CheckRunnerError(`requested checks were not discovered: ${missing.join(", ")}`);
    }
    return selected;
  }

  const preferred = ["test", "typecheck", "lint", "check", "verify", "build"];
  const selected: RepositoryCheck[] = [];
  for (const name of preferred) {
    const match = snapshot.checks.find((check) => check.name === name);
    if (match) selected.push(match);
    if (selected.length >= 3) break;
  }
  return selected;
}

function choosePackageManager(snapshot: ProjectSnapshot): "pnpm" | "npm" | "yarn" | "bun" {
  if (snapshot.packageManagers.includes("pnpm")) return "pnpm";
  if (snapshot.packageManagers.includes("npm")) return "npm";
  if (snapshot.packageManagers.includes("yarn")) return "yarn";
  if (snapshot.packageManagers.includes("bun")) return "bun";
  return "npm";
}

function invocationFor(snapshot: ProjectSnapshot, check: RepositoryCheck): Invocation {
  if (!/^[A-Za-z0-9:_-]+$/.test(check.name)) {
    throw new CheckRunnerError(`unsafe package script name: ${check.name}`);
  }
  if (!check.source.endsWith("package.json")) {
    throw new CheckRunnerError(`unsupported check source: ${check.source}`);
  }

  const manager = choosePackageManager(snapshot);
  const relativeWorkingDirectory = dirname(check.source) === "." ? "" : dirname(check.source);
  switch (manager) {
    case "pnpm":
      return { executable: "pnpm", args: ["run", check.name], relativeWorkingDirectory };
    case "yarn":
      return { executable: "yarn", args: ["run", check.name], relativeWorkingDirectory };
    case "bun":
      return { executable: "bun", args: ["run", check.name], relativeWorkingDirectory };
    default:
      return { executable: "npm", args: ["run", check.name, "--silent"], relativeWorkingDirectory };
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function createWorkspace(projectRoot: string): Promise<{
  temporaryRoot: string;
  workspaceRoot: string;
  dependencyAccess: CheckResult["isolation"]["dependencyAccess"];
}> {
  const root = resolve(projectRoot);
  const temporaryRoot = await mkdtemp(join(tmpdir(), "shipkit-check-"));
  const workspaceRoot = join(temporaryRoot, "workspace");

  await cp(root, workspaceRoot, {
    recursive: true,
    preserveTimestamps: false,
    filter: async (source) => {
      const relativePath = relative(root, source);
      if (!relativePath) return true;
      const first = relativePath.split(sep)[0];
      if (first && COPY_EXCLUDES.has(first)) return false;
      try {
        return !(await lstat(source)).isSymbolicLink();
      } catch {
        return false;
      }
    },
  });

  let dependencyAccess: CheckResult["isolation"]["dependencyAccess"] = "none";
  const originalNodeModules = join(root, "node_modules");
  if (await exists(originalNodeModules)) {
    await symlink(
      originalNodeModules,
      join(workspaceRoot, "node_modules"),
      process.platform === "win32" ? "junction" : "dir"
    );
    dependencyAccess = "linked-existing-node_modules";
  }

  return { temporaryRoot, workspaceRoot, dependencyAccess };
}

function safeEnvironment(home: string): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    WINDIR: process.env.WINDIR,
    LANG: process.env.LANG ?? "C.UTF-8",
    LC_ALL: process.env.LC_ALL,
    HOME: home,
    USERPROFILE: home,
    CI: "true",
    NO_COLOR: "1",
    npm_config_audit: "false",
    npm_config_fund: "false",
    npm_config_update_notifier: "false",
  };
  return Object.fromEntries(
    Object.entries(environment).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

async function terminateProcess(child: ReturnType<typeof spawn>): Promise<void> {
  if (!child.pid) return;
  try {
    if (process.platform !== "win32") process.kill(-child.pid, "SIGTERM");
    else child.kill("SIGTERM");
  } catch {
    return;
  }
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  try {
    if (process.platform !== "win32") process.kill(-child.pid, "SIGKILL");
    else child.kill("SIGKILL");
  } catch {
    // Process already exited.
  }
}

async function runCheck(
  snapshot: ProjectSnapshot,
  projectRoot: string,
  check: RepositoryCheck,
  timeoutMs: number,
  maxOutputBytes: number
): Promise<CheckResult> {
  const invocation = invocationFor(snapshot, check);
  const workspace = await createWorkspace(projectRoot);
  const home = join(workspace.temporaryRoot, "home");
  await mkdir(home, { recursive: true });
  const cwd = resolve(workspace.workspaceRoot, invocation.relativeWorkingDirectory);
  const startedAt = new Date();
  const stdout = collector(maxOutputBytes);
  const stderr = collector(maxOutputBytes);

  try {
    const result = await new Promise<{
      status: CheckResultStatus;
      exitCode: number | null;
      signal: NodeJS.Signals | null;
    }>((resolveResult) => {
      const child = spawn(invocation.executable, invocation.args, {
        cwd,
        env: safeEnvironment(home),
        shell: false,
        detached: process.platform !== "win32",
        stdio: ["ignore", "pipe", "pipe"],
      });
      let timedOut = false;
      let settled = false;
      const finish = (value: {
        status: CheckResultStatus;
        exitCode: number | null;
        signal: NodeJS.Signals | null;
      }) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolveResult(value);
      };
      const timer = setTimeout(() => {
        timedOut = true;
        void terminateProcess(child);
      }, timeoutMs);

      child.stdout?.on("data", stdout.append);
      child.stderr?.on("data", stderr.append);
      child.on("error", (error) => {
        stderr.append(error.message);
        finish({ status: "unavailable", exitCode: null, signal: null });
      });
      child.on("close", (exitCode, signal) => {
        finish({
          status: timedOut ? "timed-out" : exitCode === 0 ? "passed" : "failed",
          exitCode,
          signal,
        });
      });
    });

    const finishedAt = new Date();
    return {
      schemaVersion: 1,
      name: check.name,
      source: check.source,
      declaredCommand: check.command,
      invocation: {
        executable: invocation.executable,
        arguments: invocation.args,
        workingDirectory: portablePath(invocation.relativeWorkingDirectory || "."),
        shell: false,
      },
      status: result.status,
      exitCode: result.exitCode,
      signal: result.signal,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      timeoutMs,
      stdout: stdout.text(),
      stderr: stderr.text(),
      stdoutTruncated: stdout.truncated(),
      stderrTruncated: stderr.truncated(),
      isolation: {
        sourceWorkspace: "temporary-copy",
        dependencyAccess: workspace.dependencyAccess,
        dependencyInstall: false,
        networkIsolation: "not-enforced",
      },
    };
  } finally {
    await rm(workspace.temporaryRoot, { recursive: true, force: true });
  }
}

export async function runDiscoveredChecks(
  snapshot: ProjectSnapshot,
  options: {
    projectRoot?: string;
    checkNames?: string[];
    timeoutMs?: number;
    maxOutputBytes?: number;
  } = {}
): Promise<CheckReport> {
  const projectRoot = resolve(options.projectRoot ?? process.cwd());
  const requestedChecks = [...new Set((options.checkNames ?? []).map((name) => name.trim()).filter(Boolean))];
  const timeoutMs = boundedInteger(options.timeoutMs, DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS);
  const maxOutputBytes = boundedInteger(
    options.maxOutputBytes,
    DEFAULT_OUTPUT_BYTES,
    MAX_OUTPUT_BYTES
  );
  const selected = selectChecks(snapshot, requestedChecks);
  const results: CheckResult[] = [];
  for (const check of selected) {
    results.push(await runCheck(snapshot, projectRoot, check, timeoutMs, maxOutputBytes));
  }

  return {
    schemaVersion: 1,
    projectName: snapshot.projectName,
    projectRoot,
    createdAt: new Date().toISOString(),
    requestedChecks,
    discoveredChecks: snapshot.checks.length,
    selectedChecks: selected.map(({ name, source }) => ({ name, source })),
    results,
    summary: {
      passed: results.filter((result) => result.status === "passed").length,
      failed: results.filter((result) => result.status === "failed").length,
      timedOut: results.filter((result) => result.status === "timed-out").length,
      unavailable: results.filter((result) => result.status === "unavailable").length,
    },
    limitations: [
      "Checks run from repository-declared package scripts in a temporary source copy.",
      "Dependencies are never installed; an existing root node_modules directory may be linked read-only by convention but filesystem write protection is not yet enforced.",
      "Network isolation is not yet enforced; run untrusted repositories inside an external sandbox.",
    ],
  };
}

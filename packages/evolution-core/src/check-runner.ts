import { cp, lstat, mkdir, mkdtemp, readdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import {
  DockerExecutionBackend,
  TrustedLocalExecutionBackend,
  UNTRUSTED_CHECK_BASELINE_CAPABILITIES,
  assertExecutionCapabilities,
  type ExecutionBackend,
  type ExecutionCapability,
} from "./execution-backend.js";
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

const SECRET_SOURCE_NAMES = new Set([
  ".npmrc",
  ".netrc",
  ".pypirc",
  ".git-credentials",
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
    backend: string;
    trust: "trusted-local" | "untrusted";
    capabilities: ExecutionCapability[];
    sourceWorkspace: "temporary-copy";
    dependencyAccess: "linked-existing-node_modules" | "none";
    dependencyInstall: false;
    networkIsolation: "blocked" | "not-enforced";
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

function excludedFromSourceCopy(relativePath: string): boolean {
  const parts = relativePath.split(sep);
  if (parts.some((part) => COPY_EXCLUDES.has(part) || part === ".ssh" || part === ".aws")) {
    return true;
  }
  const name = parts.at(-1) ?? "";
  if (SECRET_SOURCE_NAMES.has(name)) return true;
  if (name === ".env") return true;
  if (name.startsWith(".env.") && !name.endsWith(".example") && !name.endsWith(".sample")) {
    return true;
  }
  return false;
}

async function linkExistingNodeModules(root: string, workspaceRoot: string): Promise<number> {
  const queue = [root];
  let linked = 0;

  while (queue.length > 0) {
    const directory = queue.shift();
    if (!directory) break;
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const source = join(directory, entry.name);
      const relativePath = relative(root, source);
      if (entry.name === "node_modules") {
        const destination = join(workspaceRoot, relativePath);
        await mkdir(dirname(destination), { recursive: true });
        await symlink(
          source,
          destination,
          process.platform === "win32" ? "junction" : "dir"
        );
        linked += 1;
        continue;
      }
      if (!entry.isDirectory() || COPY_EXCLUDES.has(entry.name)) continue;
      queue.push(source);
    }
  }

  return linked;
}

async function createWorkspace(
  projectRoot: string,
  backend: ExecutionBackend
): Promise<{
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
      if (excludedFromSourceCopy(relativePath)) return false;
      try {
        return !(await lstat(source)).isSymbolicLink();
      } catch {
        return false;
      }
    },
  });

  if (backend.trust === "untrusted") {
    return { temporaryRoot, workspaceRoot, dependencyAccess: "none" };
  }

  const linkedDependencies = await linkExistingNodeModules(root, workspaceRoot);
  return {
    temporaryRoot,
    workspaceRoot,
    dependencyAccess: linkedDependencies > 0 ? "linked-existing-node_modules" : "none",
  };
}

function safeEnvironment(home: string, backend: ExecutionBackend): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    LANG: process.env.LANG ?? "C.UTF-8",
    LC_ALL: process.env.LC_ALL,
    HOME: backend.trust === "untrusted" ? "/tmp/home" : home,
    USERPROFILE: backend.trust === "untrusted" ? "/tmp/home" : home,
    CI: "true",
    NO_COLOR: "1",
    npm_config_audit: "false",
    npm_config_fund: "false",
    npm_config_update_notifier: "false",
  };
  if (backend.trust === "trusted-local") {
    environment.PATH = process.env.PATH;
    environment.SystemRoot = process.env.SystemRoot;
    environment.WINDIR = process.env.WINDIR;
  }
  return Object.fromEntries(
    Object.entries(environment).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

async function runCheck(
  snapshot: ProjectSnapshot,
  projectRoot: string,
  check: RepositoryCheck,
  timeoutMs: number,
  maxOutputBytes: number,
  backend: ExecutionBackend
): Promise<CheckResult> {
  const invocation = invocationFor(snapshot, check);
  const workspace = await createWorkspace(projectRoot, backend);
  const home = join(workspace.temporaryRoot, "home");
  await mkdir(home, { recursive: true });
  const startedAt = new Date();

  try {
    const result = await backend.execute({
      workspaceRoot: workspace.workspaceRoot,
      relativeWorkingDirectory: invocation.relativeWorkingDirectory,
      executable: invocation.executable,
      arguments: invocation.args,
      environment: safeEnvironment(home, backend),
      limits: { timeoutMs, maxOutputBytes },
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
      stdout: result.stdout,
      stderr: result.stderr,
      stdoutTruncated: result.stdoutTruncated,
      stderrTruncated: result.stderrTruncated,
      isolation: {
        backend: backend.id,
        trust: backend.trust,
        capabilities: [...backend.capabilities],
        sourceWorkspace: "temporary-copy",
        dependencyAccess: workspace.dependencyAccess,
        dependencyInstall: false,
        networkIsolation: backend.capabilities.includes("network-deny") ? "blocked" : "not-enforced",
      },
    };
  } finally {
    await rm(workspace.temporaryRoot, { recursive: true, force: true });
  }
}

export type RunDiscoveredChecksOptions = {
  projectRoot?: string;
  checkNames?: string[];
  timeoutMs?: number;
  maxOutputBytes?: number;
  backend?: ExecutionBackend;
  requiredCapabilities?: readonly ExecutionCapability[];
};

export async function runDiscoveredChecks(
  snapshot: ProjectSnapshot,
  options: RunDiscoveredChecksOptions = {}
): Promise<CheckReport> {
  const projectRoot = resolve(options.projectRoot ?? process.cwd());
  const requestedChecks = [
    ...new Set((options.checkNames ?? []).map((name) => name.trim()).filter(Boolean)),
  ];
  const timeoutMs = boundedInteger(options.timeoutMs, DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS);
  const maxOutputBytes = boundedInteger(
    options.maxOutputBytes,
    DEFAULT_OUTPUT_BYTES,
    MAX_OUTPUT_BYTES
  );
  const backend = options.backend ?? new TrustedLocalExecutionBackend();
  const requiredCapabilities =
    options.requiredCapabilities ??
    (backend.trust === "untrusted" ? UNTRUSTED_CHECK_BASELINE_CAPABILITIES : []);
  assertExecutionCapabilities(backend, requiredCapabilities);
  await backend.assertAvailable();

  const selected = selectChecks(snapshot, requestedChecks);
  const results: CheckResult[] = [];
  for (const check of selected) {
    results.push(await runCheck(snapshot, projectRoot, check, timeoutMs, maxOutputBytes, backend));
  }

  const limitations =
    backend.trust === "untrusted"
      ? [
          "Checks run from repository-declared package scripts in a temporary source copy inside the selected untrusted execution backend.",
          "Host node_modules directories are not linked into untrusted workspaces, and common credential files are excluded from the source copy; checks that require dependencies must use an isolated dependency strategy supplied by the backend image or a future package cache.",
          ...(backend.capabilities.includes("disk-limit")
            ? []
            : [
                "The current backend does not prove a hard writable-workspace disk quota; request disk-limit explicitly to fail closed until a backend supports it.",
              ]),
        ]
      : [
          "Checks run from repository-declared package scripts in a temporary source copy.",
          "The trusted-local backend may link existing node_modules directories and is not a security sandbox.",
          "Network, filesystem and process isolation are not enforced; use an untrusted backend for untrusted repositories.",
        ];

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
    limitations,
  };
}

export function createCheckExecutionBackend(
  kind: "trusted-local" | "docker",
  options: { dockerImage?: string } = {}
): ExecutionBackend {
  return kind === "docker"
    ? new DockerExecutionBackend({ image: options.dockerImage })
    : new TrustedLocalExecutionBackend();
}

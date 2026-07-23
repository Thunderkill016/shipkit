import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { isAbsolute, relative, resolve, sep } from "node:path";

export const EXECUTION_CAPABILITIES = [
  "filesystem-containment",
  "process-tree-containment",
  "dependency-isolation",
  "secret-isolation",
  "network-deny",
  "cpu-limit",
  "memory-limit",
  "disk-limit",
  "process-limit",
  "timeout",
  "output-limit",
  "cleanup",
] as const;

export type ExecutionCapability = (typeof EXECUTION_CAPABILITIES)[number];
export type ExecutionTrust = "trusted-local" | "untrusted";
export type ExecutionResultStatus = "passed" | "failed" | "timed-out" | "unavailable";

export const UNTRUSTED_CHECK_BASELINE_CAPABILITIES = [
  "filesystem-containment",
  "process-tree-containment",
  "dependency-isolation",
  "secret-isolation",
  "network-deny",
  "cpu-limit",
  "memory-limit",
  "process-limit",
  "timeout",
  "output-limit",
  "cleanup",
] as const satisfies readonly ExecutionCapability[];

const DEFAULT_CPUS = 1;
const DEFAULT_MEMORY_MB = 512;
const DEFAULT_PROCESS_LIMIT = 64;
const DEFAULT_TMPFS_MB = 64;

export class ExecutionBackendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionBackendError";
  }
}

export type ExecutionLimits = {
  timeoutMs: number;
  maxOutputBytes: number;
  cpus?: number;
  memoryMb?: number;
  processLimit?: number;
  tmpfsMb?: number;
};

export type ExecutionRequest = {
  workspaceRoot: string;
  relativeWorkingDirectory: string;
  executable: string;
  arguments: string[];
  environment: NodeJS.ProcessEnv;
  limits: ExecutionLimits;
};

export type ExecutionBackendResult = {
  status: ExecutionResultStatus;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
};

export interface ExecutionBackend {
  readonly id: string;
  readonly trust: ExecutionTrust;
  readonly capabilities: readonly ExecutionCapability[];
  assertAvailable(): Promise<void>;
  execute(request: ExecutionRequest): Promise<ExecutionBackendResult>;
}

type Collector = {
  append: (chunk: Buffer | string) => void;
  text: () => string;
  truncated: () => boolean;
};

type SpawnLike = typeof spawn;

type ProcessRunOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs: number;
  maxOutputBytes: number;
  detached?: boolean;
  spawnProcess?: SpawnLike;
  afterTimeout?: () => Promise<void>;
};

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

function positiveNumber(value: number | undefined, fallback: number, label: string): number {
  const resolved = value ?? fallback;
  if (!Number.isFinite(resolved) || resolved <= 0) {
    throw new ExecutionBackendError(`${label} must be a positive number`);
  }
  return resolved;
}

function positiveInteger(value: number | undefined, fallback: number, label: string): number {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved <= 0) {
    throw new ExecutionBackendError(`${label} must be a positive integer`);
  }
  return resolved;
}

function containedWorkingDirectory(workspaceRoot: string, relativeWorkingDirectory: string): string {
  if (isAbsolute(relativeWorkingDirectory)) {
    throw new ExecutionBackendError("working directory must be relative to the sandbox workspace");
  }
  const root = resolve(workspaceRoot);
  const workingDirectory = resolve(root, relativeWorkingDirectory || ".");
  const offset = relative(root, workingDirectory);
  if (offset === ".." || offset.startsWith(`..${sep}`) || isAbsolute(offset)) {
    throw new ExecutionBackendError("working directory escapes the sandbox workspace");
  }
  return workingDirectory;
}

async function terminateProcess(
  child: ReturnType<SpawnLike>,
  detached: boolean
): Promise<void> {
  if (!child.pid) return;
  try {
    if (process.platform !== "win32" && detached) process.kill(-child.pid, "SIGTERM");
    else child.kill("SIGTERM");
  } catch {
    return;
  }
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  try {
    if (process.platform !== "win32" && detached) process.kill(-child.pid, "SIGKILL");
    else child.kill("SIGKILL");
  } catch {
    // Process already exited.
  }
}

async function runProcess(
  executable: string,
  args: string[],
  options: ProcessRunOptions
): Promise<ExecutionBackendResult> {
  const stdout = collector(options.maxOutputBytes);
  const stderr = collector(options.maxOutputBytes);
  const launch = options.spawnProcess ?? spawn;
  const detached = options.detached ?? process.platform !== "win32";

  return await new Promise<ExecutionBackendResult>((resolveResult) => {
    const child = launch(executable, args, {
      cwd: options.cwd,
      env: options.env,
      shell: false,
      detached,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let timedOut = false;
    let settled = false;
    const finish = (
      value: Omit<
        ExecutionBackendResult,
        "stdout" | "stderr" | "stdoutTruncated" | "stderrTruncated"
      >
    ) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolveResult({
        ...value,
        stdout: stdout.text(),
        stderr: stderr.text(),
        stdoutTruncated: stdout.truncated(),
        stderrTruncated: stderr.truncated(),
      });
    };
    const timer = setTimeout(() => {
      timedOut = true;
      void terminateProcess(child, detached);
    }, options.timeoutMs);

    child.stdout?.on("data", stdout.append);
    child.stderr?.on("data", stderr.append);
    child.on("error", (error) => {
      stderr.append(error.message);
      finish({ status: "unavailable", exitCode: null, signal: null });
    });
    child.on("close", (exitCode, signal) => {
      void (async () => {
        if (timedOut && options.afterTimeout) {
          try {
            await options.afterTimeout();
          } catch (error) {
            stderr.append(error instanceof Error ? error.message : String(error));
          }
        }
        finish({
          status: timedOut ? "timed-out" : exitCode === 0 ? "passed" : "failed",
          exitCode,
          signal,
        });
      })();
    });
  });
}

export function assertExecutionCapabilities(
  backend: ExecutionBackend,
  requiredCapabilities: readonly ExecutionCapability[]
): void {
  const available = new Set(backend.capabilities);
  const missing = requiredCapabilities.filter((capability) => !available.has(capability));
  if (missing.length > 0) {
    throw new ExecutionBackendError(
      `execution backend ${backend.id} cannot satisfy required capabilities: ${missing.join(", ")}`
    );
  }
}

export class TrustedLocalExecutionBackend implements ExecutionBackend {
  readonly id = "trusted-local";
  readonly trust = "trusted-local" as const;
  readonly capabilities = ["secret-isolation", "timeout", "output-limit", "cleanup"] as const;

  async assertAvailable(): Promise<void> {
    // The current Node.js process is the trusted-local runtime.
  }

  async execute(request: ExecutionRequest): Promise<ExecutionBackendResult> {
    const cwd = containedWorkingDirectory(request.workspaceRoot, request.relativeWorkingDirectory);
    return await runProcess(request.executable, request.arguments, {
      cwd,
      env: request.environment,
      timeoutMs: request.limits.timeoutMs,
      maxOutputBytes: request.limits.maxOutputBytes,
    });
  }
}

const DOCKER_ENV_ALLOWLIST = new Set([
  "CI",
  "NO_COLOR",
  "LANG",
  "LC_ALL",
  "HOME",
  "USERPROFILE",
  "npm_config_audit",
  "npm_config_fund",
  "npm_config_update_notifier",
]);

export type DockerExecutionBackendOptions = {
  image?: string;
  executable?: string;
  probe?: () => Promise<boolean>;
  spawnProcess?: SpawnLike;
};

function immutableDockerImage(image: string): boolean {
  return /^sha256:[a-f0-9]{64}$/i.test(image) || /@sha256:[a-f0-9]{64}$/i.test(image);
}

export type DockerRunInput = {
  containerName: string;
  image: string;
  workspaceRoot: string;
  relativeWorkingDirectory: string;
  executable: string;
  arguments: string[];
  environment: NodeJS.ProcessEnv;
  limits: ExecutionLimits;
};

function portablePath(path: string): string {
  return path.split(sep).join("/");
}

export function buildDockerRunArguments(input: DockerRunInput): string[] {
  if (!immutableDockerImage(input.image)) {
    throw new ExecutionBackendError("docker execution requires an immutable image digest");
  }
  const workspaceRoot = resolve(input.workspaceRoot);
  if (workspaceRoot.includes(",")) {
    throw new ExecutionBackendError("sandbox workspace path cannot contain a comma");
  }
  const workingDirectory = containedWorkingDirectory(workspaceRoot, input.relativeWorkingDirectory);
  const relativeWorkingDirectory = portablePath(relative(workspaceRoot, workingDirectory));
  const cpus = positiveNumber(input.limits.cpus, DEFAULT_CPUS, "cpus");
  const memoryMb = positiveInteger(input.limits.memoryMb, DEFAULT_MEMORY_MB, "memoryMb");
  const processLimit = positiveInteger(
    input.limits.processLimit,
    DEFAULT_PROCESS_LIMIT,
    "processLimit"
  );
  const tmpfsMb = positiveInteger(input.limits.tmpfsMb, DEFAULT_TMPFS_MB, "tmpfsMb");
  const containerWorkingDirectory = relativeWorkingDirectory
    ? `/workspace/${relativeWorkingDirectory}`
    : "/workspace";

  const args = [
    "run",
    "--rm",
    "--name",
    input.containerName,
    "--pull",
    "never",
    "--network",
    "none",
    "--read-only",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--pids-limit",
    String(processLimit),
    "--memory",
    `${memoryMb}m`,
    "--cpus",
    String(cpus),
    "--ulimit",
    "nofile=1024:1024",
    "--tmpfs",
    `/tmp:rw,noexec,nosuid,nodev,size=${tmpfsMb}m`,
    "--workdir",
    containerWorkingDirectory,
    "--mount",
    `type=bind,source=${workspaceRoot},target=/workspace,rw`,
  ];

  if (
    process.platform !== "win32" &&
    typeof process.getuid === "function" &&
    typeof process.getgid === "function"
  ) {
    args.push("--user", `${process.getuid()}:${process.getgid()}`);
  }

  const environment = {
    ...input.environment,
    HOME: "/tmp/home",
    USERPROFILE: "/tmp/home",
  };
  for (const [key, value] of Object.entries(environment)) {
    if (!DOCKER_ENV_ALLOWLIST.has(key) || typeof value !== "string") continue;
    args.push("--env", `${key}=${value}`);
  }

  args.push(input.image, input.executable, ...input.arguments);
  return args;
}

export class DockerExecutionBackend implements ExecutionBackend {
  readonly id = "docker";
  readonly trust = "untrusted" as const;
  readonly capabilities = UNTRUSTED_CHECK_BASELINE_CAPABILITIES;
  readonly image: string;
  readonly executable: string;
  private readonly probe?: () => Promise<boolean>;
  private readonly spawnProcess?: SpawnLike;
  private verified = false;

  constructor(options: DockerExecutionBackendOptions = {}) {
    const image = options.image?.trim();
    if (!image || !immutableDockerImage(image)) {
      throw new ExecutionBackendError(
        "docker execution backend requires an explicit immutable image digest"
      );
    }
    this.image = image;
    this.executable = options.executable?.trim() || "docker";
    this.probe = options.probe;
    this.spawnProcess = options.spawnProcess;
  }

  async assertAvailable(): Promise<void> {
    if (this.verified) return;
    if (this.probe) {
      if (await this.probe()) {
        this.verified = true;
        return;
      }
      throw new ExecutionBackendError(
        "docker execution backend is unavailable; refusing to run untrusted checks without the requested isolation"
      );
    }

    const daemon = await runProcess(
      this.executable,
      ["version", "--format", "{{.Server.Version}}"],
      {
        timeoutMs: 5_000,
        maxOutputBytes: 4_096,
        detached: false,
        spawnProcess: this.spawnProcess,
      }
    );
    if (daemon.status !== "passed") {
      throw new ExecutionBackendError(
        "docker execution backend is unavailable; refusing to run untrusted checks without the requested isolation"
      );
    }

    const image = await runProcess(
      this.executable,
      ["image", "inspect", "--format", "{{.Id}}", this.image],
      {
        timeoutMs: 5_000,
        maxOutputBytes: 4_096,
        detached: false,
        spawnProcess: this.spawnProcess,
      }
    );
    if (image.status !== "passed") {
      throw new ExecutionBackendError(
        `sandbox image ${this.image} is not available locally; refusing an implicit image pull`
      );
    }
    this.verified = true;
  }

  async execute(request: ExecutionRequest): Promise<ExecutionBackendResult> {
    await this.assertAvailable();
    const containerName = `shipkit-check-${randomUUID()}`;
    const args = buildDockerRunArguments({
      containerName,
      image: this.image,
      workspaceRoot: request.workspaceRoot,
      relativeWorkingDirectory: request.relativeWorkingDirectory,
      executable: request.executable,
      arguments: request.arguments,
      environment: request.environment,
      limits: request.limits,
    });

    return await runProcess(this.executable, args, {
      timeoutMs: request.limits.timeoutMs,
      maxOutputBytes: request.limits.maxOutputBytes,
      detached: false,
      spawnProcess: this.spawnProcess,
      afterTimeout: async () => {
        await runProcess(this.executable, ["rm", "-f", containerName], {
          timeoutMs: 5_000,
          maxOutputBytes: 4_096,
          detached: false,
          spawnProcess: this.spawnProcess,
        });
      },
    });
  }
}

export function createExecutionBackend(
  kind: "trusted-local" | "docker",
  options: { dockerImage?: string } = {}
): ExecutionBackend {
  return kind === "docker"
    ? new DockerExecutionBackend({ image: options.dockerImage })
    : new TrustedLocalExecutionBackend();
}

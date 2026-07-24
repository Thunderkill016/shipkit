import { access, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CheckRunnerError, runDiscoveredChecks } from "./check-runner.js";
import {
  DockerExecutionBackend,
  ExecutionBackendError,
  UNTRUSTED_CHECK_BASELINE_CAPABILITIES,
  type ExecutionBackend,
  type ExecutionRequest,
} from "./execution-backend.js";
import { inspectRepository } from "./repository.js";

const temporaryRoots: string[] = [];
const IMMUTABLE_IMAGE = `sha256:${"a".repeat(64)}`;

async function projectWithScript(script: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "cyclewarden-check-project-"));
  temporaryRoots.push(root);
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "src", "index.js"), "export const value = 1;\n", "utf8");
  await writeFile(
    join(root, "package.json"),
    `${JSON.stringify({ name: "external-check-fixture", scripts: { test: script } }, null, 2)}\n`,
    "utf8"
  );
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("safe check runner", () => {
  it("runs a discovered package script in a trusted-local temporary source workspace", async () => {
    const projectRoot = await projectWithScript(
      `node -e "require('node:fs').writeFileSync('generated.txt','temporary'); console.log('API_TOKEN=supersecret')"`
    );
    const snapshot = await inspectRepository(projectRoot);
    const report = await runDiscoveredChecks(snapshot, {
      projectRoot,
      checkNames: ["test"],
      timeoutMs: 10_000,
    });

    expect(report.summary).toMatchObject({ passed: 1, failed: 0, timedOut: 0 });
    expect(report.results[0]).toMatchObject({
      name: "test",
      status: "passed",
      isolation: {
        backend: "trusted-local",
        trust: "trusted-local",
        sourceWorkspace: "temporary-copy",
        dependencyInstall: false,
        networkIsolation: "not-enforced",
      },
    });
    expect(report.results[0]?.stdout).toContain("API_TOKEN=[REDACTED]");
    await expect(access(join(projectRoot, "generated.txt"))).rejects.toThrow();
  });

  it("terminates a check that exceeds its timeout", async () => {
    const projectRoot = await projectWithScript(`node -e "setTimeout(() => {}, 10000)"`);
    const snapshot = await inspectRepository(projectRoot);
    const report = await runDiscoveredChecks(snapshot, {
      projectRoot,
      checkNames: ["test"],
      timeoutMs: 100,
    });

    expect(report.summary.timedOut).toBe(1);
    expect(report.results[0]?.status).toBe("timed-out");
  });

  it("rejects a requested command that was not discovered from repository metadata", async () => {
    const projectRoot = await projectWithScript(`node -e "process.exit(0)"`);
    const snapshot = await inspectRepository(projectRoot);

    await expect(
      runDiscoveredChecks(snapshot, { projectRoot, checkNames: ["deploy"] })
    ).rejects.toBeInstanceOf(CheckRunnerError);
  });

  it("fails closed before execution when the Docker sandbox is unavailable", async () => {
    const projectRoot = await projectWithScript(`node -e "process.exit(0)"`);
    const snapshot = await inspectRepository(projectRoot);

    await expect(
      runDiscoveredChecks(snapshot, {
        projectRoot,
        checkNames: ["test"],
        backend: new DockerExecutionBackend({
          image: IMMUTABLE_IMAGE,
          probe: async () => false,
        }),
      })
    ).rejects.toThrow(/refusing to run untrusted checks/);
  });

  it("does not link host dependencies, credentials or symlink escapes into an untrusted workspace", async () => {
    const projectRoot = await projectWithScript(`node -e "process.exit(0)"`);
    await mkdir(join(projectRoot, "node_modules", "host-only"), { recursive: true });
    await writeFile(join(projectRoot, "node_modules", "host-only", "sentinel"), "host", "utf8");
    await writeFile(join(projectRoot, ".env"), "API_TOKEN=host-secret\n", "utf8");
    if (process.platform !== "win32") {
      await symlink("/etc/passwd", join(projectRoot, "host-escape"));
    }
    const snapshot = await inspectRepository(projectRoot);

    const backend: ExecutionBackend = {
      id: "fixture-untrusted",
      trust: "untrusted",
      capabilities: UNTRUSTED_CHECK_BASELINE_CAPABILITIES,
      async assertAvailable() {},
      async execute(request: ExecutionRequest) {
        await expect(access(join(request.workspaceRoot, "node_modules"))).rejects.toThrow();
        await expect(access(join(request.workspaceRoot, ".env"))).rejects.toThrow();
        if (process.platform !== "win32") {
          await expect(access(join(request.workspaceRoot, "host-escape"))).rejects.toThrow();
        }
        return {
          status: "passed",
          exitCode: 0,
          signal: null,
          stdout: "",
          stderr: "",
          stdoutTruncated: false,
          stderrTruncated: false,
        };
      },
    };

    const report = await runDiscoveredChecks(snapshot, {
      projectRoot,
      checkNames: ["test"],
      backend,
    });
    expect(report.results[0]?.isolation).toMatchObject({
      trust: "untrusted",
      dependencyAccess: "none",
      networkIsolation: "blocked",
    });
  });

  it("rejects a capability request that the selected backend cannot prove", async () => {
    const projectRoot = await projectWithScript(`node -e "process.exit(0)"`);
    const snapshot = await inspectRepository(projectRoot);

    await expect(
      runDiscoveredChecks(snapshot, {
        projectRoot,
        requiredCapabilities: ["filesystem-containment"],
      })
    ).rejects.toBeInstanceOf(ExecutionBackendError);
  });
});

import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CheckRunnerError, runDiscoveredChecks } from "./check-runner.js";
import { inspectRepository } from "./repository.js";

const temporaryRoots: string[] = [];

async function projectWithScript(script: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "shipkit-check-project-"));
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
  it("runs a discovered package script in a temporary source workspace", async () => {
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
      isolation: { sourceWorkspace: "temporary-copy", dependencyInstall: false },
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
});

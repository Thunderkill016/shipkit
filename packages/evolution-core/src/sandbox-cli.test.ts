import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runSandboxCli } from "./sandbox-cli.js";

const temporaryRoots: string[] = [];

function collector() {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout: (message: string) => {
        stdout += message;
      },
      stderr: (message: string) => {
        stderr += message;
      },
    },
    output: () => ({ stdout, stderr }),
  };
}

async function fixtureProject(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "shipkit-sandbox-cli-"));
  temporaryRoots.push(root);
  await writeFile(
    join(root, "package.json"),
    `${JSON.stringify(
      {
        name: "sandbox-cli-fixture",
        scripts: { test: `node -e "process.stdout.write('sandbox-ok')"` },
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("shipkit-sandbox-check CLI", () => {
  it("requires an explicit backend", async () => {
    await expect(runSandboxCli(["--project-root", await fixtureProject()], collector().io)).rejects.toThrow(
      /--backend is required/
    );
  });

  it("requires explicit acknowledgement for trusted-local execution", async () => {
    await expect(
      runSandboxCli(
        ["--project-root", await fixtureProject(), "--backend", "trusted-local", "--check", "test"],
        collector().io
      )
    ).rejects.toThrow(/acknowledge-trusted-repository/);
  });

  it("requires an immutable image for Docker execution", async () => {
    await expect(
      runSandboxCli(
        ["--project-root", await fixtureProject(), "--backend", "docker", "--check", "test"],
        collector().io
      )
    ).rejects.toThrow(/--docker-image is required/);
  });

  it("runs a trusted repository only after explicit acknowledgement", async () => {
    const output = collector();
    await expect(
      runSandboxCli(
        [
          "--project-root",
          await fixtureProject(),
          "--backend",
          "trusted-local",
          "--acknowledge-trusted-repository",
          "--check",
          "test",
        ],
        output.io
      )
    ).resolves.toBe(0);

    expect(JSON.parse(output.output().stdout)).toMatchObject({
      backend: { id: "trusted-local", trust: "trusted-local" },
      report: {
        summary: { passed: 1, failed: 0, timedOut: 0, unavailable: 0 },
        results: [
          {
            status: "passed",
            stdout: "sandbox-ok",
            isolation: { backend: "trusted-local", trust: "trusted-local" },
          },
        ],
      },
    });
  });
});

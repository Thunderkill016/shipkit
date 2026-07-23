import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runEvolutionCli } from "./cli.js";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

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

async function createProject(): Promise<{ root: string; projectRoot: string; storeRoot: string }> {
  const root = await mkdtemp(join(tmpdir(), "shipkit-assess-cli-"));
  temporaryRoots.push(root);
  const projectRoot = join(root, "external-product");
  const storeRoot = join(root, ".shipkit");
  await mkdir(join(projectRoot, "src"), { recursive: true });
  await mkdir(join(projectRoot, ".github", "workflows"), { recursive: true });
  await writeFile(join(projectRoot, "src", "index.js"), "export const value = 1;\n", "utf8");
  await writeFile(join(projectRoot, "PRODUCT.md"), "# External product\n", "utf8");
  await writeFile(join(projectRoot, ".github", "workflows", "ci.yml"), "name: CI\n", "utf8");
  await writeFile(
    join(projectRoot, "package.json"),
    `${JSON.stringify(
      {
        name: "external-product",
        scripts: {
          test: `node -e "require('node:fs').writeFileSync('generated.txt','temporary'); console.log('ok')"`,
        },
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  return { root, projectRoot, storeRoot };
}

describe("assess CLI", () => {
  it("runs isolated checks, stores evidence, creates a scorecard, and models the cycle", async () => {
    const { projectRoot, storeRoot } = await createProject();
    const silent = collector();
    await runEvolutionCli(
      [
        "start",
        "--root",
        storeRoot,
        "--project-root",
        projectRoot,
        "--id",
        "external-product:cycle-001",
        "--objective",
        "Research and develop the external product from evidence",
        "--autonomy",
        "A2",
      ],
      silent.io
    );
    await runEvolutionCli(
      [
        "inspect",
        "external-product:cycle-001",
        "--root",
        storeRoot,
        "--project-root",
        projectRoot,
      ],
      silent.io
    );

    const assessed = collector();
    await expect(
      runEvolutionCli(
        [
          "assess",
          "external-product:cycle-001",
          "--root",
          storeRoot,
          "--project-root",
          projectRoot,
          "--check",
          "test",
          "--timeout-ms",
          "10000",
        ],
        assessed.io
      )
    ).resolves.toBe(0);

    const output = JSON.parse(assessed.output().stdout);
    expect(output.cycle.stage).toBe("modeled");
    expect(output.checkReport.summary).toMatchObject({ passed: 1, failed: 0, timedOut: 0 });
    expect(output.scorecard.readiness).toBe("ready-for-research");
    expect(output.evidence.checks.id).toMatch(/^sha256:/);
    expect(output.evidence.scorecard.id).toMatch(/^sha256:/);
    await expect(access(join(projectRoot, "generated.txt"))).rejects.toThrow();
  });

  it("does not allow an A0 cycle to execute repository checks", async () => {
    const { projectRoot, storeRoot } = await createProject();
    const silent = collector();
    await runEvolutionCli(
      [
        "start",
        "--root",
        storeRoot,
        "--project-root",
        projectRoot,
        "--id",
        "external-product:cycle-002",
        "--objective",
        "Observe the external project without executing checks",
        "--autonomy",
        "A0",
      ],
      silent.io
    );
    await runEvolutionCli(
      [
        "inspect",
        "external-product:cycle-002",
        "--root",
        storeRoot,
        "--project-root",
        projectRoot,
      ],
      silent.io
    );

    await expect(
      runEvolutionCli(
        [
          "assess",
          "external-product:cycle-002",
          "--root",
          storeRoot,
          "--project-root",
          projectRoot,
          "--check",
          "test",
        ],
        collector().io
      )
    ).rejects.toThrow(/requires A1/);
  });
});

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

async function createProject() {
  const root = await mkdtemp(join(tmpdir(), "shipkit-repository-research-cli-"));
  temporaryRoots.push(root);
  const projectRoot = join(root, "research-product");
  const storeRoot = join(root, ".shipkit");
  await mkdir(join(projectRoot, "src"), { recursive: true });
  await mkdir(join(projectRoot, ".github", "workflows"), { recursive: true });
  await writeFile(join(projectRoot, "src", "index.js"), "export const ready = true;\n", "utf8");
  await writeFile(
    join(projectRoot, "PRODUCT.md"),
    "# Research product\n\nChoose evidence-backed work before feature expansion.\n",
    "utf8"
  );
  await writeFile(join(projectRoot, "ROADMAP.md"), "# Roadmap\n\n- Verify repository readiness.\n", "utf8");
  await writeFile(join(projectRoot, ".github", "workflows", "ci.yml"), "name: CI\n", "utf8");
  await writeFile(
    join(projectRoot, "package.json"),
    `${JSON.stringify(
      {
        name: "research-product",
        scripts: {
          test: `node -e "require('node:fs').writeFileSync('generated.txt','temporary'); console.log('ok')"`,
        },
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  return { projectRoot, storeRoot };
}

describe("research-repository CLI", () => {
  it("runs a reviewed repository research cycle and reloads the durable result", async () => {
    const { projectRoot, storeRoot } = await createProject();
    const cycleId = "research-product:cycle-001";
    const silent = collector();

    await runEvolutionCli(
      [
        "start",
        "--root",
        storeRoot,
        "--project-root",
        projectRoot,
        "--id",
        cycleId,
        "--objective",
        "Choose the next evidence-backed product experiment",
        "--autonomy",
        "A2",
      ],
      silent.io
    );
    await runEvolutionCli(
      ["inspect", cycleId, "--root", storeRoot, "--project-root", projectRoot],
      silent.io
    );
    await runEvolutionCli(
      [
        "assess",
        cycleId,
        "--root",
        storeRoot,
        "--project-root",
        projectRoot,
        "--check",
        "test",
        "--timeout-ms",
        "10000",
      ],
      silent.io
    );

    const researched = collector();
    await expect(
      runEvolutionCli(
        [
          "research-repository",
          cycleId,
          "--root",
          storeRoot,
          "--project-root",
          projectRoot,
          "--check",
          "test",
          "--timeout-ms",
          "10000",
          "--actor",
          "repository-researcher",
          "--reviewer",
          "independent-research-reviewer",
        ],
        researched.io
      )
    ).resolves.toBe(0);

    const output = JSON.parse(researched.output().stdout);
    expect(output.outcome).toBe("completed");
    expect(output.cycle.stage).toBe("planned");
    expect(output.run).toMatchObject({
      adapter: "repository-single-worker",
      outcome: "completed",
      usage: { queries: 5, sources: 3, costUsd: 0 },
    });
    expect(output.evaluation).toMatchObject({
      actor: "independent-research-reviewer",
      verdict: "pass",
      unsupportedClaimIds: [],
    });
    expect(output.evaluation.checks.every((check: { passed: boolean }) => check.passed)).toBe(true);
    expect(output.evaluation.checks.map((check: { id: string }) => check.id)).toEqual(
      expect.arrayContaining([
        "separate-reviewer",
        "budget-compliance",
        "source-support",
        "user-evidence",
        "opportunity-portfolio",
        "decision-preservation",
        "scope-separation",
        "contradiction-visibility",
        "stop-reason",
      ])
    );
    expect(output.records.opportunities).toHaveLength(3);
    expect(output.records.claims.some((claim: { claimType: string }) => claim.claimType === "user-problem")).toBe(false);
    expect(output.executionHandoff.parameterDigest).toMatch(/^[a-f0-9]{64}$/);
    await expect(access(join(projectRoot, "generated.txt"))).rejects.toThrow();

    const shown = collector();
    await runEvolutionCli(["research-show", cycleId, "--root", storeRoot], shown.io);
    const persisted = JSON.parse(shown.output().stdout);
    expect(persisted.stage).toBe("planned");
    expect(persisted.research.runs).toHaveLength(1);
    expect(persisted.research.evaluations.at(-1)).toMatchObject({ verdict: "pass" });
    expect(persisted.research.executionHandoffs).toHaveLength(1);
  });

  it("persists an explicit inconclusive result when the CLI budget is too small", async () => {
    const { projectRoot, storeRoot } = await createProject();
    const cycleId = "research-product:cycle-002";
    const silent = collector();

    await runEvolutionCli(
      [
        "start",
        "--root",
        storeRoot,
        "--project-root",
        projectRoot,
        "--id",
        cycleId,
        "--objective",
        "Choose the next bounded repository experiment",
        "--autonomy",
        "A2",
      ],
      silent.io
    );
    await runEvolutionCli(
      ["inspect", cycleId, "--root", storeRoot, "--project-root", projectRoot],
      silent.io
    );
    await runEvolutionCli(
      [
        "assess",
        cycleId,
        "--root",
        storeRoot,
        "--project-root",
        projectRoot,
        "--check",
        "test",
        "--timeout-ms",
        "10000",
      ],
      silent.io
    );

    const researched = collector();
    await runEvolutionCli(
      [
        "research-repository",
        cycleId,
        "--root",
        storeRoot,
        "--project-root",
        projectRoot,
        "--check",
        "test",
        "--timeout-ms",
        "10000",
        "--max-queries",
        "2",
        "--actor",
        "repository-researcher",
        "--reviewer",
        "independent-research-reviewer",
      ],
      researched.io
    );

    const output = JSON.parse(researched.output().stdout);
    expect(output.outcome).toBe("inconclusive");
    expect(output.cycle.stage).toBe("inconclusive");
    expect(output.run.outcome).toBe("inconclusive");
    expect(output.evaluation.verdict).toBe("inconclusive");
    expect(output.reason).toMatch(/coverage map/);
  });
});

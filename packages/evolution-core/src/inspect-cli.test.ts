import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runEvolutionCli } from "./cli.js";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function outputCollector() {
  let stdout = "";
  return {
    io: {
      stdout: (message: string) => {
        stdout += message;
      },
      stderr: () => {},
    },
    json: () => JSON.parse(stdout),
  };
}

describe("cyclewarden-evolve inspect", () => {
  it("turns a repository scan into hashed blob evidence and an observed cycle occurrence", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "cyclewarden-inspect-"));
    temporaryRoots.push(projectRoot);
    await mkdir(join(projectRoot, "src"), { recursive: true });
    await writeFile(
      join(projectRoot, "package.json"),
      JSON.stringify({
        name: "outside-product",
        scripts: { test: "node --test", build: "tsc" },
      }),
      "utf8"
    );
    await writeFile(join(projectRoot, "src", "index.ts"), "export const value = 1;\n", "utf8");
    await writeFile(join(projectRoot, "README.md"), "# Outside product\n", "utf8");

    const storeRoot = join(projectRoot, ".cyclewarden");
    await runEvolutionCli(
      [
        "start",
        "--root",
        storeRoot,
        "--project-root",
        projectRoot,
        "--id",
        "outside-product:cycle-001",
        "--objective",
        "Research and develop the outside product from repository evidence",
      ],
      outputCollector().io
    );

    const inspected = outputCollector();
    await expect(
      runEvolutionCli(
        [
          "inspect",
          "outside-product:cycle-001",
          "--root",
          storeRoot,
          "--project-root",
          projectRoot,
        ],
        inspected.io
      )
    ).resolves.toBe(0);

    const result = inspected.json();
    expect(result.evidence.id).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(result.evidence.occurrenceId).toMatch(/^occurrence:/);
    expect(result.snapshot).toMatchObject({
      projectName: expect.any(String),
      checks: expect.arrayContaining([
        expect.objectContaining({ name: "test" }),
        expect.objectContaining({ name: "build" }),
      ]),
    });
    expect(result.cycle).toMatchObject({
      cycleId: "outside-product:cycle-001",
      stage: "observed",
      artifacts: {
        baseline: [expect.stringMatching(/^evidence:occurrence:/)],
      },
    });
  });
});
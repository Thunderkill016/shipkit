import { mkdtemp, rm } from "node:fs/promises";
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

describe("cyclewarden-evolve CLI", () => {
  it("initializes a store, starts a cycle, and reports status", async () => {
    const root = await mkdtemp(join(tmpdir(), "cyclewarden-cli-"));
    temporaryRoots.push(root);
    const storeRoot = join(root, ".cyclewarden");

    const init = collector();
    await expect(
      runEvolutionCli(["init", "--root", storeRoot], init.io)
    ).resolves.toBe(0);
    expect(JSON.parse(init.output().stdout)).toMatchObject({ initialized: true });

    const start = collector();
    await expect(
      runEvolutionCli(
        [
          "start",
          "--root",
          storeRoot,
          "--id",
          "sample-product:cycle-001",
          "--objective",
          "Research and improve the product activation journey",
          "--autonomy",
          "A2",
          "--risk",
          "R1",
        ],
        start.io
      )
    ).resolves.toBe(0);
    expect(JSON.parse(start.output().stdout)).toMatchObject({
      cycleId: "sample-product:cycle-001",
      stage: "created",
    });

    const status = collector();
    await expect(
      runEvolutionCli(["status", "--root", storeRoot], status.io)
    ).resolves.toBe(0);
    expect(JSON.parse(status.output().stdout).cycles).toEqual([
      expect.objectContaining({ cycleId: "sample-product:cycle-001" }),
    ]);
  });

  it("advances a persisted cycle only with the required evidence", async () => {
    const root = await mkdtemp(join(tmpdir(), "cyclewarden-cli-"));
    temporaryRoots.push(root);
    const storeRoot = join(root, ".cyclewarden");
    const silent = collector();

    await runEvolutionCli(
      [
        "start",
        "--root",
        storeRoot,
        "--id",
        "sample-product:cycle-002",
        "--objective",
        "Discover product opportunities from repository evidence",
      ],
      silent.io
    );

    const advanced = collector();
    await expect(
      runEvolutionCli(
        [
          "advance",
          "sample-product:cycle-002",
          "--root",
          storeRoot,
          "--to",
          "observed",
          "--actor",
          "repository-observer",
          "--reason",
          "Captured the initial product and repository baseline",
          "--artifact",
          "baseline=evidence/baseline.json",
        ],
        advanced.io
      )
    ).resolves.toBe(0);
    expect(JSON.parse(advanced.output().stdout)).toMatchObject({ stage: "observed" });

    await expect(
      runEvolutionCli(
        [
          "advance",
          "sample-product:cycle-002",
          "--root",
          storeRoot,
          "--to",
          "diagnosed",
          "--actor",
          "repository-observer",
          "--reason",
          "Tried to skip project modeling",
          "--artifact",
          "diagnosis=evidence/diagnosis.json",
        ],
        collector().io
      )
    ).rejects.toThrow(/invalid transition/);
  });
});

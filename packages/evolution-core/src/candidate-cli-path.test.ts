import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveCandidateInputFile } from "./candidate-cli.js";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("candidate research input path confinement", () => {
  it("accepts a real JSON file inside project-root", async () => {
    const root = await mkdtemp(join(tmpdir(), "shipkit-candidate-path-"));
    temporaryRoots.push(root);
    const project = join(root, "project");
    await mkdir(project);
    const manifest = join(project, "candidate.json");
    await writeFile(manifest, "{}\n", "utf8");

    await expect(resolveCandidateInputFile(project, "candidate.json", "candidate manifest")).resolves.toBe(
      manifest
    );
  });

  it("rejects traversal outside project-root", async () => {
    const root = await mkdtemp(join(tmpdir(), "shipkit-candidate-path-"));
    temporaryRoots.push(root);
    const project = join(root, "project");
    await mkdir(project);
    await writeFile(join(root, "outside.json"), "{}\n", "utf8");

    await expect(
      resolveCandidateInputFile(project, "../outside.json", "candidate manifest")
    ).rejects.toThrow("must resolve inside project-root");
  });

  it("rejects a symlink inside project-root that resolves outside", async () => {
    const root = await mkdtemp(join(tmpdir(), "shipkit-candidate-path-"));
    temporaryRoots.push(root);
    const project = join(root, "project");
    await mkdir(project);
    const outside = join(root, "outside.json");
    await writeFile(outside, "{}\n", "utf8");
    await symlink(outside, join(project, "linked.json"));

    await expect(
      resolveCandidateInputFile(project, "linked.json", "candidate manifest")
    ).rejects.toThrow("must resolve inside project-root");
  });
});

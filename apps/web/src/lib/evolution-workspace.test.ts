import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, realpath, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, parse } from "node:path";

vi.mock("server-only", () => ({}));

import {
  assertEvolutionProjectRoot,
  resolveEvolutionProjectRoot,
} from "./evolution-workspace";

const originalEnv = { ...process.env };
const roots: string[] = [];

afterEach(async () => {
  process.env = { ...originalEnv };
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Evolution workspace project-root boundary", () => {
  it("keeps the configured absolute path out of the client-facing label", async () => {
    const root = await mkdtemp(join(tmpdir(), "cyclewarden-workspace-label-"));
    roots.push(root);
    process.env.CYCLEWARDEN_PROJECT_ROOT = root;

    const label = resolveEvolutionProjectRoot();
    expect(label).toBe("server-configured trusted repository");
    expect(label).not.toContain(root);
  });

  it("returns the canonical real path for a configured directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "cyclewarden-workspace-root-"));
    roots.push(root);
    process.env.CYCLEWARDEN_PROJECT_ROOT = root;

    await expect(assertEvolutionProjectRoot()).resolves.toBe(await realpath(root));
  });

  it("rejects a symlink that resolves to the filesystem root", async () => {
    const root = await mkdtemp(join(tmpdir(), "cyclewarden-workspace-link-"));
    roots.push(root);
    const rootLink = join(root, "root-link");
    await symlink(parse(root).root, rootLink, "dir");
    process.env.CYCLEWARDEN_PROJECT_ROOT = rootLink;

    await expect(assertEvolutionProjectRoot()).rejects.toThrow(
      "CYCLEWARDEN_PROJECT_ROOT may not target a filesystem root"
    );
  });
});

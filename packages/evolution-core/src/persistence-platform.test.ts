import { mkdtemp, open, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("persistence platform contract", () => {
  it("supports directory fsync on the declared Linux CI platform", async () => {
    if (process.platform !== "linux") return;

    const root = await mkdtemp(join(tmpdir(), "shipkit-directory-sync-"));
    temporaryRoots.push(root);
    const handle = await open(root, "r");
    try {
      await expect(handle.sync()).resolves.toBeUndefined();
    } finally {
      await handle.close();
    }
  });
});

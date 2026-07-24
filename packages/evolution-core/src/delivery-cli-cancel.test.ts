import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runDeliveryCli } from "./delivery-cli.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("delivery cancel CLI", () => {
  it("requires the exact operation ID before inspecting or applying cancellation", async () => {
    const root = await mkdtemp(join(tmpdir(), "cyclewarden-cancel-cli-"));
    roots.push(root);
    await expect(
      runDeliveryCli(["cancel", "cycle:fixture", "--root", join(root, ".cyclewarden")], {
        stdout: () => undefined,
        stderr: () => undefined,
      })
    ).rejects.toThrow("--operation-id is required");
  });
});

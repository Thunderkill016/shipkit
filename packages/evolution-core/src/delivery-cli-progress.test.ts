import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runDeliveryCli } from "./delivery-cli.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("delivery progress CLI", () => {
  it("inspects progress without requiring a delivery control file", async () => {
    const root = await mkdtemp(join(tmpdir(), "cyclewarden-progress-cli-"));
    roots.push(root);
    const output: string[] = [];
    const code = await runDeliveryCli(
      ["progress", "cycle:fixture", "--root", join(root, ".cyclewarden")],
      {
        stdout: (message) => output.push(message),
        stderr: () => undefined,
      }
    );

    expect(code).toBe(0);
    expect(JSON.parse(output.join(""))).toMatchObject({
      deliveryProgress: {
        controlStatus: "missing",
        events: [],
      },
    });
  });
});

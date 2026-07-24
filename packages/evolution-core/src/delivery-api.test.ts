import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  executeDelivery,
  publishDelivery,
  verifyDelivery,
} from "./index.js";
import { inspectDeliveryOperation } from "./delivery-operation.js";
import { EvolutionStore } from "./persistence.js";

const temporaryRoots: string[] = [];

async function fixture(name: string) {
  const root = await mkdtemp(join(tmpdir(), `cyclewarden-public-delivery-${name}-`));
  temporaryRoots.push(root);
  const projectRoot = join(root, "project");
  await mkdir(projectRoot, { recursive: true });
  return {
    root,
    projectRoot,
    store: new EvolutionStore(join(root, ".cyclewarden")),
    cycleId: `public-delivery:${name}`,
  };
}

function expectFailedTerminalLease(
  store: EvolutionStore,
  cycleId: string,
  operation: "execute" | "verify" | "publish",
  actor: string
): void {
  const inspection = inspectDeliveryOperation(store, cycleId);
  expect(inspection.controlStatus).toBe("valid");
  expect(inspection.disposition).toBe("healthy");
  expect(inspection.lockPresent).toBe(false);
  expect(inspection.record?.operation).toBe(operation);
  expect(inspection.record?.actor).toBe(actor);
  expect(inspection.record?.status).toBe("failed");
  expect(inspection.record?.errorDigest).toMatch(/^[a-f0-9]{64}$/);
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  );
});

describe("lease-protected public delivery API", () => {
  it("checkpoints direct executeDelivery calls before delivery preconditions", async () => {
    const current = await fixture("execute");
    const actor = "public-api-implementer";

    await expect(
      executeDelivery({
        store: current.store,
        cycleId: current.cycleId,
        projectRoot: current.projectRoot,
        manifestPath: join(current.root, "missing-delivery.json"),
        actor,
        trustedRepository: false,
      })
    ).rejects.toThrow(/trusted repository acknowledgement/);

    expectFailedTerminalLease(current.store, current.cycleId, "execute", actor);
  });

  it("checkpoints direct verifyDelivery calls before repository validation", async () => {
    const current = await fixture("verify");
    const actor = "public-api-verifier";

    await expect(
      verifyDelivery({
        store: current.store,
        cycleId: current.cycleId,
        projectRoot: current.projectRoot,
        actor,
      })
    ).rejects.toThrow();

    expectFailedTerminalLease(current.store, current.cycleId, "verify", actor);
  });

  it("checkpoints direct publishDelivery calls before publication opt-in validation", async () => {
    const current = await fixture("publish");
    const actor = "public-api-publisher";

    await expect(
      publishDelivery({
        store: current.store,
        cycleId: current.cycleId,
        projectRoot: current.projectRoot,
        actor,
        draftPr: false,
      })
    ).rejects.toThrow(/explicit --draft-pr opt-in/);

    expectFailedTerminalLease(current.store, current.cycleId, "publish", actor);
  });
});

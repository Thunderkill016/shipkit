#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const deliveryPath = "packages/evolution-core/src/delivery.ts";
let source = await readFile(deliveryPath, "utf8");

function replaceOnce(before, after, label) {
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`missing replacement marker: ${label}`);
  if (source.indexOf(before, index + before.length) >= 0) {
    throw new Error(`replacement marker is not unique: ${label}`);
  }
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

replaceOnce(
  `type DeliveryControlFile = {
  schemaVersion: 1;
  cycleId: string;`,
  `type DeliveryControlFile = {
  schemaVersion: 1;
  integrityDigest: string;
  cycleId: string;`,
  "control integrity field"
);

replaceOnce(
  `async function loadControl(store: EvolutionStore, cycleId: string): Promise<DeliveryControlFile> {
  try {
    const value = JSON.parse(await readFile(controlPath(store, cycleId), "utf8")) as DeliveryControlFile;
    if (value.schemaVersion !== 1 || value.cycleId !== cycleId) {
      throw new DeliveryError("delivery control file does not match the requested cycle");
    }
    return value;
  } catch (error) {`,
  `async function writeControl(
  store: EvolutionStore,
  control: Omit<DeliveryControlFile, "integrityDigest"> | DeliveryControlFile
): Promise<DeliveryControlFile> {
  const { integrityDigest: _discarded, ...payload } = control as DeliveryControlFile;
  const value: DeliveryControlFile = {
    ...payload,
    integrityDigest: digestJson(payload),
  };
  await atomicWriteJson(controlPath(store, value.cycleId), value);
  return value;
}

async function loadControl(store: EvolutionStore, cycleId: string): Promise<DeliveryControlFile> {
  try {
    const value = JSON.parse(await readFile(controlPath(store, cycleId), "utf8")) as DeliveryControlFile;
    if (value.schemaVersion !== 1 || value.cycleId !== cycleId) {
      throw new DeliveryError("delivery control file does not match the requested cycle");
    }
    const { integrityDigest, ...payload } = value;
    if (!/^[a-f0-9]{64}$/i.test(integrityDigest) || integrityDigest !== digestJson(payload)) {
      throw new DeliveryError("delivery control integrity digest mismatch");
    }
    if (value.execution.cycleId !== cycleId) {
      throw new DeliveryError("delivery execution record does not match the requested cycle");
    }
    return value;
  } catch (error) {`,
  "control write and integrity verification"
);

replaceOnce(
  `  const control: DeliveryControlFile = {
    schemaVersion: 1,
    cycleId: planned.cycleId,`,
  `  const control: Omit<DeliveryControlFile, "integrityDigest"> = {
    schemaVersion: 1,
    cycleId: planned.cycleId,`,
  "unsigned initial control"
);

replaceOnce(
  `  await atomicWriteJson(controlPath(input.store, planned.cycleId), control);`,
  `  await writeControl(input.store, control);`,
  "write signed initial control"
);

replaceOnce(
  `  const control = await loadControl(input.store, input.cycleId);
  if (control.projectRoot !== projectRoot) {`,
  `  const control = await loadControl(input.store, input.cycleId);
  if (!implemented.artifacts.changes.includes(control.executionEvidenceRef)) {
    throw new DeliveryError("delivery execution evidence is not linked from the implemented cycle");
  }
  const handoff = latestHandoff(implemented);
  if (
    control.execution.handoffRecordId !== handoff.recordId ||
    control.execution.handoffParameterDigest !== handoff.parameterDigest ||
    control.manifest.expectedParameterDigest !== handoff.parameterDigest
  ) {
    throw new DeliveryError("delivery control no longer matches the persisted ExecutionHandoff");
  }
  if (control.execution.status !== "implemented") {
    throw new DeliveryError("delivery control does not contain an implemented execution");
  }
  if (control.projectRoot !== projectRoot) {`,
  "cross-check control against cycle and handoff"
);

replaceOnce(
  `  control.verification = verification;
  control.verificationEvidenceRef = evidenceRef;
  await atomicWriteJson(controlPath(input.store, implemented.cycleId), control);`,
  `  control.verification = verification;
  control.verificationEvidenceRef = evidenceRef;
  await writeControl(input.store, control);`,
  "rewrite signed verified control"
);

await writeFile(deliveryPath, source, "utf8");

const testPath = "packages/evolution-core/src/delivery-hardening.test.ts";
let testSource = await readFile(testPath, "utf8");
testSource = testSource.replace(
  `import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";`,
  `import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";`
);
const finalMarker = "\n});\n";
const finalIndex = testSource.lastIndexOf(finalMarker);
if (finalIndex < 0) throw new Error("missing final delivery hardening describe marker");
const test = `

  it("rejects a tampered delivery control manifest before verification", async () => {
    const fixture = await setup("control-tamper");
    const manifestPath = await writeManifest(fixture.root, {
      commandSource:
        "const fs=require('node:fs');fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/result.md','ok')",
    });
    const executed = await executeDelivery({
      store: fixture.store,
      cycleId: fixture.cycleId,
      projectRoot: fixture.projectRoot,
      manifestPath,
      actor: "fixture-implementer",
      trustedRepository: true,
    });
    temporaryRoots.push(dirname(executed.worktreePath));
    const control = JSON.parse(await readFile(executed.controlPath, "utf8"));
    control.manifest.verification[0].arguments = ["-e", "process.exit(0)"];
    await writeFile(executed.controlPath, \`${JSON.stringify(control, null, 2)}\\n\`, "utf8");
    await expect(
      verifyDelivery({
        store: fixture.store,
        cycleId: fixture.cycleId,
        projectRoot: fixture.projectRoot,
        actor: "fixture-independent-verifier",
      })
    ).rejects.toThrow(/integrity digest mismatch/);
    expect((await fixture.store.load(fixture.cycleId)).stage).toBe("implemented");
  });`;
testSource = testSource.slice(0, finalIndex) + test + testSource.slice(finalIndex);
await writeFile(testPath, testSource, "utf8");

for (const path of ["docs/evolution/GOVERNED_DELIVERY.md", "docs/ai/PROJECT_MODEL.md"]) {
  let content = await readFile(path, "utf8");
  if (path.endsWith("GOVERNED_DELIVERY.md")) {
    content = content.replace(
      "The first slice also has no crash-safe delivery resume: an unexpected process termination after the cycle enters `executing` may require manual recovery.",
      "The delivery control sidecar is atomically written with an integrity digest and is cross-checked against the cycle, execution evidence and handoff before verification. It is not part of the synchronized cycle journal: loss of that local sidecar blocks verification. The first slice also has no crash-safe delivery resume, so an unexpected process termination after the cycle enters `executing` may require manual recovery."
    );
  } else {
    content = content.replace(
      "- crash-safe resume or rollback for a cycle stranded at `executing`;",
      "- the integrity-checked delivery control sidecar is outside the synchronized cycle journal; loss blocks verification;\n- crash-safe resume or rollback for a cycle stranded at `executing`;"
    );
  }
  await writeFile(path, content, "utf8");
}

const capabilitiesPath = "docs/CAPABILITIES.json";
const registry = JSON.parse(await readFile(capabilitiesPath, "utf8"));
const delivery = registry.capabilities.find((item) => item.id === "governed-local-delivery-beta");
if (!delivery) throw new Error("missing governed local delivery capability");
if (!delivery.checks.includes("Unit test: delivery control manifest tamper is rejected by its integrity digest")) {
  delivery.checks.push("Unit test: delivery control manifest tamper is rejected by its integrity digest");
}
if (!delivery.limitations.includes("The integrity-checked delivery control sidecar is outside the synchronized cycle journal; loss blocks verification")) {
  delivery.limitations.push(
    "The integrity-checked delivery control sidecar is outside the synchronized cycle journal; loss blocks verification"
  );
}
await writeFile(capabilitiesPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
console.log("Applied delivery control integrity and tamper hardening.");

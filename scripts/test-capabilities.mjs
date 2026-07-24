import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = await mkdtemp(join(tmpdir(), "cyclewarden-capabilities-"));

function runCheck(expectSuccess, expectedText = "") {
  const result = spawnSync(process.execPath, ["scripts/check-capabilities.mjs"], {
    cwd: sandbox,
    encoding: "utf8",
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n");

  if (expectSuccess && result.status !== 0) {
    throw new Error(`Expected capability check to pass:\n${output}`);
  }
  if (!expectSuccess && result.status === 0) {
    throw new Error("Expected capability check to fail.");
  }
  if (expectedText && !output.includes(expectedText)) {
    throw new Error(`Expected output to include "${expectedText}":\n${output}`);
  }
}

try {
  await mkdir(join(sandbox, "scripts"), { recursive: true });
  await mkdir(join(sandbox, "docs"), { recursive: true });

  await cp(
    join(root, "scripts/check-capabilities.mjs"),
    join(sandbox, "scripts/check-capabilities.mjs")
  );

  const original = JSON.parse(
    await readFile(join(root, "docs/CAPABILITIES.json"), "utf8")
  );
  await writeFile(
    join(sandbox, "package.json"),
    JSON.stringify({ name: original.project }, null, 2)
  );

  for (const capability of original.capabilities) {
    for (const evidencePath of capability.evidence) {
      const target = join(sandbox, evidencePath);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, "evidence\n");
    }
  }

  const registryPath = join(sandbox, "docs/CAPABILITIES.json");
  await writeFile(registryPath, JSON.stringify(original, null, 2));
  runCheck(true);

  const missingEvidence = structuredClone(original);
  missingEvidence.capabilities[0].evidence = ["missing/evidence.ts"];
  await writeFile(registryPath, JSON.stringify(missingEvidence, null, 2));
  runCheck(false, "evidence does not exist");

  const duplicateId = structuredClone(original);
  duplicateId.capabilities[1].id = duplicateId.capabilities[0].id;
  await writeFile(registryPath, JSON.stringify(duplicateId, null, 2));
  runCheck(false, "duplicates");

  const invalidStatus = structuredClone(original);
  invalidStatus.capabilities[0].verificationStatus = "probably";
  await writeFile(registryPath, JSON.stringify(invalidStatus, null, 2));
  runCheck(false, "verificationStatus is not allowed");

  const wrongProject = structuredClone(original);
  wrongProject.project = "other-project";
  await writeFile(registryPath, JSON.stringify(wrongProject, null, 2));
  runCheck(false, "must match package.json name");

  const missingPrimaryProduct = structuredClone(original);
  delete missingPrimaryProduct.primaryProduct;
  await writeFile(registryPath, JSON.stringify(missingPrimaryProduct, null, 2));
  runCheck(false, "primaryProduct must name");

  console.log("Capability registry tests OK: valid and negative cases behaved correctly.");
} finally {
  await rm(sandbox, { recursive: true, force: true });
}

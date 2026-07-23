import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = resolve(root, "docs/CAPABILITIES.json");

const allowedStatuses = new Set(["implemented", "partial", "planned", "deprecated"]);
const allowedVerificationStatuses = new Set([
  "passing",
  "failing",
  "unstable",
  "not-run",
  "not-applicable",
]);
const allowedCategories = new Set([
  "product",
  "auth",
  "data",
  "integration",
  "platform",
  "dx",
  "research",
  "evolution-core",
  "policy",
  "persistence",
  "evidence",
  "perception",
  "verification",
  "reference-product",
]);

const errors = [];
let registry;
let packageJson;

try {
  registry = JSON.parse(await readFile(registryPath, "utf8"));
  packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
} catch (error) {
  console.error(
    `Capability registry could not be parsed: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
  process.exit(1);
}

if (registry.schemaVersion !== 1) errors.push("schemaVersion must equal 1");
if (typeof registry.project !== "string" || !registry.project.trim()) {
  errors.push("project must be a non-empty string");
}
if (packageJson?.name !== registry.project) {
  errors.push(
    `project "${registry.project}" must match package.json name "${packageJson?.name ?? "missing"}"`
  );
}
if (typeof registry.primaryProduct !== "string" || registry.primaryProduct.trim().length < 3) {
  errors.push("primaryProduct must name the repository's primary product");
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(registry.lastVerified ?? "")) {
  errors.push("lastVerified must use YYYY-MM-DD");
}
if (
  typeof registry.verificationScope !== "string" ||
  !registry.verificationScope.trim()
) {
  errors.push("verificationScope must explain what was and was not verified");
}
if (!Array.isArray(registry.capabilities) || registry.capabilities.length === 0) {
  errors.push("capabilities must be a non-empty array");
}

const seen = new Set();
for (const [index, capability] of (registry.capabilities ?? []).entries()) {
  const prefix = `capabilities[${index}]`;

  if (
    typeof capability.id !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(capability.id)
  ) {
    errors.push(`${prefix}.id must be lowercase kebab-case`);
  } else if (seen.has(capability.id)) {
    errors.push(`${prefix}.id duplicates "${capability.id}"`);
  } else {
    seen.add(capability.id);
  }

  if (!allowedCategories.has(capability.category)) {
    errors.push(`${prefix}.category is not allowed`);
  }
  if (!allowedStatuses.has(capability.status)) {
    errors.push(`${prefix}.status is not allowed`);
  }
  if (!allowedVerificationStatuses.has(capability.verificationStatus)) {
    errors.push(`${prefix}.verificationStatus is not allowed`);
  }
  if (typeof capability.summary !== "string" || capability.summary.trim().length < 20) {
    errors.push(`${prefix}.summary must describe the capability`);
  }
  if (!Array.isArray(capability.evidence)) {
    errors.push(`${prefix}.evidence must be an array`);
    continue;
  }
  if (
    (capability.status === "implemented" || capability.status === "partial") &&
    capability.evidence.length === 0
  ) {
    errors.push(`${prefix}.evidence is required for ${capability.status} claims`);
  }
  if (!Array.isArray(capability.checks) || capability.checks.length === 0) {
    errors.push(`${prefix}.checks must record verification or its absence`);
  }
  if (capability.limitations !== undefined && !Array.isArray(capability.limitations)) {
    errors.push(`${prefix}.limitations must be an array when present`);
  }

  for (const evidencePath of capability.evidence) {
    if (
      typeof evidencePath !== "string" ||
      evidencePath.startsWith("/") ||
      evidencePath.includes("..")
    ) {
      errors.push(`${prefix}.evidence contains an unsafe path`);
      continue;
    }
    try {
      await access(resolve(root, evidencePath));
    } catch {
      errors.push(`${prefix}.evidence does not exist: ${evidencePath}`);
    }
  }

  const serialized = JSON.stringify(capability);
  if (/\b(TODO|TBD|FIXME)\b|<[^>]+>/.test(serialized)) {
    errors.push(`${prefix} contains an unresolved placeholder`);
  }
}

if (errors.length) {
  console.error("Capability registry validation failed.");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Capability registry OK: ${registry.capabilities.length} claims for ${registry.project} (${registry.primaryProduct}).`
);
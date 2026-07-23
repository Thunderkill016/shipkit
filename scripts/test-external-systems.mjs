import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateExternalSystems } from "./external-systems-validation.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const original = JSON.parse(
  await readFile(joinRoot("docs/evolution/EXTERNAL_SYSTEMS.json"), "utf8")
);

function joinRoot(relativePath) {
  return resolve(root, relativePath);
}

function expectValid(registry) {
  const result = validateExternalSystems(registry, {
    effectiveDate: "2026-07-23",
  });
  if (result.errors.length) {
    throw new Error(`Expected registry to pass:\n${result.errors.join("\n")}`);
  }
}

function expectInvalid(registry, expectedText, effectiveDate = "2026-07-23") {
  const result = validateExternalSystems(registry, {
    effectiveDate,
  });
  if (!result.errors.some((error) => error.includes(expectedText))) {
    throw new Error(
      `Expected an error containing "${expectedText}":\n${result.errors.join("\n")}`
    );
  }
}

expectValid(original);

const floatingRevision = structuredClone(original);
floatingRevision.systems[0].sources[0].revision = "latest";
expectInvalid(floatingRevision, "revision must pin");

const duplicateSource = structuredClone(original);
duplicateSource.systems[1].sources[0] = structuredClone(
  duplicateSource.systems[0].sources[0]
);
expectInvalid(duplicateSource, "duplicates source revision");

const expired = structuredClone(original);
expectInvalid(expired, "external-system review expired", "2026-10-24");

const missingContradictions = structuredClone(original);
missingContradictions.contradictions =
  missingContradictions.contradictions.slice(0, 2);
expectInvalid(missingContradictions, "at least three material counter-signals");

const repeatedContradictionEvidence = structuredClone(original);
repeatedContradictionEvidence.contradictions[0].evidence = [
  "openhands",
  "openhands",
];
expectInvalid(
  repeatedContradictionEvidence,
  "evidence must reference at least two compared systems"
);

const narrowCoverage = structuredClone(original);
narrowCoverage.systems = narrowCoverage.systems.filter(
  (system) => system.group === "coding-agent"
);
narrowCoverage.contradictions = [];
expectInvalid(narrowCoverage, "at least 12 current primary-source comparisons");

console.log(
  "External-system registry tests OK: freshness, revision, coverage, and contradiction gates behaved correctly."
);

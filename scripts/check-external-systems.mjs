import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateExternalSystems } from "./external-systems-validation.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(root, "docs/evolution/EXTERNAL_SYSTEMS.json");

let registry;
try {
  registry = JSON.parse(await readFile(registryPath, "utf8"));
} catch (error) {
  console.error(
    `External-system registry could not be parsed: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
  process.exit(1);
}

const result = validateExternalSystems(registry, {
  effectiveDate:
    process.env.SHIPKIT_REVIEW_DATE ?? new Date().toISOString().slice(0, 10),
});

if (result.errors.length) {
  console.error("External-system registry validation failed.");
  for (const error of result.errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `External-system registry OK: ${result.systemCount} systems, ${result.sourceCount} primary sources, ${result.groupCount} groups, review by ${registry.reviewBy}.`
);

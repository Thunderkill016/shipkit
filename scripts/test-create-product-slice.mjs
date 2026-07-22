import { cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = await mkdtemp(join(tmpdir(), "shipkit-slice-"));

function run(args, expectSuccess = true) {
  const result = spawnSync(process.execPath, ["scripts/create-product-slice.mjs", ...args], {
    cwd: sandbox,
    encoding: "utf8",
  });
  if (expectSuccess && result.status !== 0) {
    throw new Error([result.stdout, result.stderr].filter(Boolean).join("\n"));
  }
  if (!expectSuccess && result.status === 0) {
    throw new Error("Expected duplicate slice creation to fail");
  }
}

try {
  await mkdir(join(sandbox, "scripts"), { recursive: true });
  await mkdir(join(sandbox, "product"), { recursive: true });
  await cp(join(root, "scripts/create-product-slice.mjs"), join(sandbox, "scripts/create-product-slice.mjs"));
  await cp(join(root, "product/slices.json"), join(sandbox, "product/slices.json"));

  run(["--id=ideas", "--title=Idea Inbox"]);
  const registry = JSON.parse(await readFile(join(sandbox, "product/slices.json"), "utf8"));
  const slice = registry.slices.find((item) => item.id === "ideas");
  if (!slice || slice.fields.length !== 3 || slice.fields[2].type !== "select") {
    throw new Error("Generated slice did not contain the expected executable contract");
  }

  run(["--id=ideas", "--title=Duplicate"], false);
  console.log("Product Slice CLI OK: creates a valid slice and rejects duplicates.");
} finally {
  await rm(sandbox, { recursive: true, force: true });
}

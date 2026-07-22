import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = await mkdtemp(join(tmpdir(), "shipkit-create-"));
const name = "generated-product";
const generated = join(sandbox, name);

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: process.env,
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`${command} ${args.join(" ")} failed:\n${output}`);
  }

  return result;
}

try {
  run(process.execPath, [join(root, "scripts/create-shipkit.mjs"), name], sandbox);

  const required = [
    "AGENTS.md",
    "AI_WORKFLOW.md",
    "IDEA.md",
    "docs/CAPABILITIES.json",
    "docs/ai/PROJECT_MODEL.md",
    "docs/ai/AUTONOMOUS_IMPROVEMENT.md",
    "docs/ai/DISCOVERY_RESEARCH.md",
    "prompts/00-improve-project.md",
    ".agents/skills/improve-project/SKILL.md",
    ".github/ISSUE_TEMPLATE/improvement.yml",
    "scripts/check-capabilities.mjs",
    "scripts/create-product-slice.mjs",
    "product/slices.json",
  ];

  for (const file of required) await access(join(generated, file));

  const pkg = JSON.parse(await readFile(join(generated, "package.json"), "utf8"));
  if (pkg.name !== name) {
    throw new Error(`Expected generated package name ${name}, received ${pkg.name}`);
  }

  const model = await readFile(join(generated, "docs/ai/PROJECT_MODEL.md"), "utf8");
  if (!model.includes(`Project model — ${name}`) || !model.includes("not audited")) {
    throw new Error("Generated project model was not seeded correctly.");
  }

  const registry = JSON.parse(
    await readFile(join(generated, "docs/CAPABILITIES.json"), "utf8")
  );
  if (registry.project !== name || registry.inheritedFrom !== "shipkit") {
    throw new Error("Generated capability registry identity was not rewritten.");
  }
  if (
    !registry.capabilities.every(
      (capability) => capability.verificationStatus === "not-run"
    )
  ) {
    throw new Error("Generated capability verification state was not reset.");
  }

  const slices = JSON.parse(await readFile(join(generated, "product/slices.json"), "utf8"));
  if (!Array.isArray(slices.slices) || slices.slices.length === 0) {
    throw new Error("Generated project did not inherit the Product Slice Engine contract.");
  }

  run(process.execPath, [join(generated, "scripts/check-ai-workflow.mjs")], generated);
  run(process.execPath, [join(generated, "scripts/test-create-product-slice.mjs")], generated);

  console.log(
    "Shipkit generator OK: workflow, capability registry, project model, and Product Slice Engine copied correctly."
  );
} finally {
  await rm(sandbox, { recursive: true, force: true });
}

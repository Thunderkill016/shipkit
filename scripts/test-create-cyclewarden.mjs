import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(join(fileURLToPath(import.meta.url), "../.."));
const sandbox = await mkdtemp(join(tmpdir(), "cyclewarden-create-"));
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
  run(process.execPath, [join(root, "scripts/create-cyclewarden.mjs"), name], sandbox);

  const required = [
    "AGENTS.md",
    "AI_WORKFLOW.md",
    "IDEA.md",
    "README.md",
    "ROADMAP.md",
    "docs/CAPABILITIES.json",
    "docs/ai/PROJECT_MODEL.md",
    "docs/ai/AUTONOMOUS_IMPROVEMENT.md",
    "docs/ai/DISCOVERY_RESEARCH.md",
    "prompts/00-improve-project.md",
    ".agents/skills/improve-project/SKILL.md",
    ".github/ISSUE_TEMPLATE/improvement.yml",
    "scripts/check-capabilities.mjs",
  ];

  for (const file of required) await access(join(generated, file));

  const pkg = JSON.parse(await readFile(join(generated, "package.json"), "utf8"));
  if (pkg.name !== name || !pkg.description.includes(name)) {
    throw new Error("Generated package identity was not rewritten.");
  }

  const idea = await readFile(join(generated, "IDEA.md"), "utf8");
  if (!idea.includes(`Product idea — ${name}`) || idea.includes("product source of truth\n\nCycleWarden Evolution Engine")) {
    throw new Error("Generated IDEA.md still carries the source repository product identity.");
  }

  const readme = await readFile(join(generated, "README.md"), "utf8");
  if (!readme.startsWith(`# ${name}`) || !readme.includes("generated from CycleWarden")) {
    throw new Error("Generated README was not rewritten for the generated product.");
  }

  const roadmap = await readFile(join(generated, "ROADMAP.md"), "utf8");
  if (!roadmap.includes(`# ${name} roadmap`) || roadmap.includes("Primary product: **CycleWarden Evolution Engine**")) {
    throw new Error("Generated roadmap still carries CycleWarden's primary roadmap identity.");
  }

  const model = await readFile(join(generated, "docs/ai/PROJECT_MODEL.md"), "utf8");
  if (!model.includes(`Project model — ${name}`) || !model.includes("not audited")) {
    throw new Error("Generated project model was not seeded correctly.");
  }

  const registry = JSON.parse(
    await readFile(join(generated, "docs/CAPABILITIES.json"), "utf8")
  );
  if (
    registry.project !== name ||
    registry.primaryProduct !== name ||
    registry.inheritedFrom !== "cyclewarden"
  ) {
    throw new Error("Generated capability registry identity was not rewritten.");
  }
  if (
    !registry.capabilities.every(
      (capability) => capability.verificationStatus === "not-run"
    )
  ) {
    throw new Error("Generated capability verification state was not reset.");
  }
  if (registry.capabilities.some((capability) => capability.id === "evolution-state-machine")) {
    throw new Error("Generated product inherited source-repository capability claims verbatim.");
  }

  run(process.execPath, [join(generated, "scripts/check-ai-workflow.mjs")], generated);

  console.log(
    "CycleWarden generator OK: generated product identity, workflow, capabilities, and project model are independent."
  );
} finally {
  await rm(sandbox, { recursive: true, force: true });
}

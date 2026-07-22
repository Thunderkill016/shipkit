import { readFile, access } from "node:fs/promises";

const required = [
  "AGENTS.md",
  "AI_WORKFLOW.md",
  "IDEA.md",
  "ARCHITECTURE.md",
  "docs/ai/OPERATING_MODEL.md",
  "docs/ai/TASK_LIFECYCLE.md",
  "docs/ai/CONTEXT_ENGINEERING.md",
  "docs/ai/VERIFICATION.md",
  "docs/ai/SAFETY.md",
  "docs/ai/LEARNING_MODE.md",
  "docs/ai/templates/IMPLEMENTATION_PLAN.md",
  "prompts/01-audit.md",
  "prompts/02-plan.md",
  "prompts/03-implement.md",
  "prompts/04-review.md",
  ".github/copilot-instructions.md",
  ".github/pull_request_template.md",
];

const missing = [];
for (const file of required) {
  try {
    await access(file);
  } catch {
    missing.push(file);
  }
}

const activeDocs = [
  "AGENTS.md",
  "AI_WORKFLOW.md",
  ".github/copilot-instructions.md",
];

const placeholderPattern = /\b(TODO|TBD|FIXME)\b|<name>|YYYY-MM-DD/;
const unresolved = [];

for (const file of activeDocs) {
  const content = await readFile(file, "utf8");
  if (placeholderPattern.test(content)) unresolved.push(file);
}

if (missing.length || unresolved.length) {
  console.error("AI workflow validation failed.");

  if (missing.length) {
    console.error("\nMissing required files:");
    for (const file of missing) console.error(`- ${file}`);
  }

  if (unresolved.length) {
    console.error("\nUnresolved placeholders in active documents:");
    for (const file of unresolved) console.error(`- ${file}`);
  }

  process.exit(1);
}

console.log(`AI workflow OK: ${required.length} required files present.`);

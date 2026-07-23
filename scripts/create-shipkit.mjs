#!/usr/bin/env node
/**
 * create-shipkit <name>
 * Usage: pnpm create -- my-product
 */
import fs from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const name = process.argv[2];

if (!name || name.startsWith("-")) {
  console.log(`
✦ create-shipkit

Usage:
  pnpm create -- <name>

Copies the Shipkit foundation, AI workflow, research system, and GitHub
templates into a new folder, then seeds IDEA.md and PROJECT_MODEL.md.
`);
  process.exit(name ? 1 : 0);
}

if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
  console.error("Invalid name. Use letters, numbers, ., -, _");
  process.exit(1);
}

const dest = resolve(process.cwd(), name);
if (fs.existsSync(dest)) {
  console.error(`Exists: ${dest}`);
  process.exit(1);
}

const skip = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "coverage",
  ".turbo",
  "test-results",
]);

function copyDirSync(src, out) {
  fs.mkdirSync(out, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    if (skip.has(entry)) continue;
    const from = join(src, entry);

    // `pnpm create -- my-app` is commonly run from the Shipkit root. The
    // destination then becomes a child of the source repository and must not
    // be copied into itself recursively.
    if (resolve(from) === dest) continue;

    const to = join(out, entry);
    if (fs.statSync(from).isDirectory()) copyDirSync(from, to);
    else fs.copyFileSync(from, to);
  }
}

copyDirSync(root, dest);

const idea = `# Product idea — ${name}

> Fill this before coding. Agents read this first.

## Working title

${name}

## One sentence

TODO: what does this product do?

## Who is it for?

TODO

## Problem

TODO

## Solution (MVP)

1. Landing
2. Auth
3. Core action: TODO
4. Deploy

## Out of scope

- Payments (until needed)
- Multi-tenant orgs

## MVP checklist

- [ ] Replace landing copy with brand
- [ ] Core feature #1
- [ ] Core feature #2
- [ ] Production checklist

## Data

| Entity | Fields | Who can access |
|--------|--------|----------------|
| profiles | id, email | owner |

## Notes for agents

Read AGENTS.md and AI_WORKFLOW.md before coding.
Use prompts/00-improve-project.md for an evidence-backed project audit.
Use prompts/00-discover-opportunity.md before building an uncertain idea.
For non-trivial delivery, start from a GitHub Issue and save a plan under
docs/ai/plans/. Implement one verified vertical slice at a time.
`;

const projectModel = `# Project model — ${name}

Status: not audited  
Last verified: never  
Coverage: no repository investigation recorded

This file becomes the compact evidence-backed map of the product and codebase.
An agent must refresh it using docs/ai/templates/PROJECT_MODEL.md before claiming
whole-project understanding or starting an open-ended improvement cycle.

## Product

See IDEA.md. Product claims are not yet verified against implementation.

## Repository coverage

No journeys, modules, trust boundaries, tests, deployments, or blind spots have
been mapped yet.

## Next action

Run prompts/00-improve-project.md at autonomy level A0, A1, or A2 before asking
an agent to autonomously improve this project.
`;

fs.writeFileSync(join(dest, "IDEA.md"), idea);
fs.writeFileSync(join(dest, "docs/ai/PROJECT_MODEL.md"), projectModel);

try {
  const pkgPath = join(dest, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.name = name;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
} catch {
  /* ignore */
}

try {
  const registryPath = join(dest, "docs/CAPABILITIES.json");
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  registry.project = name;
  registry.inheritedFrom = "shipkit";
  registry.lastVerified = new Date().toISOString().slice(0, 10);
  registry.verificationScope =
    "Scaffold evidence paths were copied from Shipkit; generated-product behavior has not been verified.";
  registry.capabilities = registry.capabilities.map((capability) => ({
    ...capability,
    verificationStatus: "not-run",
    checks: ["Run project-specific verification after setup"],
  }));
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");
} catch (error) {
  console.error(
    `Could not rewrite docs/CAPABILITIES.json: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
  process.exit(1);
}

console.log(`
✦ Created ${name}

  cd ${name}
  pnpm install

  # 1. Define the product
  # edit IDEA.md

  # 2. Validate the workflow and inherited capability evidence
  pnpm check:ai

  # 3. Ask AI to model and audit the project before broad changes
  # use prompts/00-improve-project.md with A0, A1, or A2

  # 4. Configure and run
  cp .env.example apps/web/.env.local
  pnpm doctor
  pnpm dev

Use a GitHub Issue as the delivery prompt. Run pnpm verify before every PR.
Use research evidence, not novelty, before building a breakthrough idea.
Happy verified shipping.
`);

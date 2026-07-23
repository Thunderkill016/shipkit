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

Copies the Starter Kit foundation and embedded Evolution Engine tooling into a new
folder, then gives the generated project its own README, IDEA.md, ROADMAP.md,
PROJECT_MODEL.md, package identity, and capability registry.
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
  ".shipkit",
  "dist",
  "coverage",
  ".turbo",
  "test-results",
  "artifacts",
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

const starterTemplate = fs.readFileSync(join(root, "templates/STARTER_IDEA.md"), "utf8");
const idea = starterTemplate
  .replace("# Product idea (copy into a generated starter project)", `# Product idea — ${name}`)
  .replace("My product", name);

const readme = `# ${name}

A product project generated from Shipkit's Starter Kit foundation.

## Define the product first

Edit [IDEA.md](./IDEA.md) before asking an agent to build broad features. The generated
project owns its product direction; Shipkit Evolution Engine is included as optional local
audit tooling and is not the product being built.

## Run locally

\`\`\`bash
pnpm install

# UI/demo path
pnpm ready
pnpm dev

# Portable PostgreSQL path
pnpm ready -- --preset=portable-pg
pnpm db:up
pnpm db:migrate
pnpm dev
\`\`\`

Open http://localhost:3000.

## Product workflow

1. Define users, problem, outcome and MVP in \`IDEA.md\`.
2. Run \`pnpm check:ai\` to validate repository workflow records.
3. Run \`pnpm evolve -- init\` and a read-only A0-A2 audit when useful.
4. Implement one bounded vertical slice.
5. Run \`pnpm verify\` before a pull request.

## Included foundation

- Next.js app with landing, authentication and protected app shell;
- portable PostgreSQL or Supabase paths;
- security, mail, storage and optional billing adapters;
- Vitest and Playwright checks;
- repository-first AI workflow;
- embedded Shipkit Evolution Engine CLI for local inspection and governed audits.

Passing checks proves technical compatibility, not product value. Validate the user problem
and measure the intended outcome.
`;

const roadmap = `# ${name} roadmap

> Product source of truth: [IDEA.md](./IDEA.md)  
> Capability evidence: [docs/CAPABILITIES.json](./docs/CAPABILITIES.json)

## Gate 0 — define and validate the problem

- [ ] identify the primary user and recent real behaviour;
- [ ] record frequency, severity and current workaround;
- [ ] define the desired measurable outcome;
- [ ] reject or revise weak assumptions before expensive implementation.

## Gate 1 — first vertical slice

- [ ] one core user action works end to end;
- [ ] authentication and data boundaries are explicit where required;
- [ ] deterministic checks cover the critical path;
- [ ] a real user can complete the core action.

## Gate 2 — product outcome proof

- [ ] measure the intended user or business outcome;
- [ ] record contradictory evidence and failure cases;
- [ ] keep, iterate or rollback based on evidence;
- [ ] avoid adding infrastructure that does not change a current decision.

## Operating rules

1. Product evidence before feature count.
2. One complete path before several partial paths.
3. Passing tests is not proof of demand.
4. Agents may propose work but do not own product truth or production authority.
5. Use Shipkit Evolution Engine in A0-A2 mode for read-only inspection and research until higher autonomy is explicitly justified.
`;

const projectModel = `# Project model — ${name}

Status: not audited  
Last verified: never  
Coverage: no project-specific repository investigation recorded

This file becomes the compact evidence-backed map of the generated product and codebase.
An agent must refresh it before claiming whole-project understanding or starting open-ended
improvement work.

## Product

See \`IDEA.md\`. Product claims are not yet verified against user evidence or implementation.

## Repository foundation

The repository was generated from Shipkit and contains a Next.js Starter Kit plus embedded
Evolution Engine audit tooling. Inherited code presence is not verification of this product.

## Unknowns

- target-user evidence;
- critical journey and domain entities;
- project-specific trust boundaries;
- production configuration;
- product outcome metrics;
- current technical and product risks.

## Next action

Define \`IDEA.md\`, then run a bounded A0-A2 repository audit before broad implementation.
`;

fs.writeFileSync(join(dest, "IDEA.md"), idea);
fs.writeFileSync(join(dest, "README.md"), readme);
fs.writeFileSync(join(dest, "ROADMAP.md"), roadmap);
fs.writeFileSync(join(dest, "docs/ai/PROJECT_MODEL.md"), projectModel);

try {
  const pkgPath = join(dest, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.name = name;
  pkg.description = `${name} — generated product project with Shipkit Starter Kit and Evolution Engine audit tooling.`;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
} catch (error) {
  console.error(
    `Could not rewrite package.json: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
}

try {
  const registryPath = join(dest, "docs/CAPABILITIES.json");
  const generatedRegistry = {
    schemaVersion: 1,
    project: name,
    primaryProduct: name,
    inheritedFrom: "shipkit",
    lastVerified: new Date().toISOString().slice(0, 10),
    verificationScope:
      "Foundation files were copied from Shipkit. Generated-product behavior, configuration, user value and production operation have not been verified.",
    capabilities: [
      {
        id: "starter-foundation",
        category: "reference-product",
        status: "partial",
        verificationStatus: "not-run",
        summary:
          "Next.js product foundation with authentication, data, security and delivery adapters copied for project-specific validation.",
        evidence: [
          "apps/web",
          "packages/auth",
          "packages/db",
          "packages/security",
          "IDEA.md",
        ],
        checks: ["Run project-specific unit, build and browser verification after setup"],
        limitations: [
          "Copied code presence is not verification",
          "Product-specific journeys and outcomes are not defined yet",
        ],
      },
      {
        id: "evolution-audit-tooling",
        category: "evolution-core",
        status: "partial",
        verificationStatus: "not-run",
        summary:
          "Embedded Shipkit Evolution Engine tooling is available for local read-only repository inspection and governed audit cycles.",
        evidence: [
          "packages/evolution-core",
          "docs/evolution/ARCHITECTURE.md",
          "docs/evolution/DATA_GOVERNANCE.md",
        ],
        checks: ["Run pnpm test and a project-specific A0-A2 audit before relying on the tooling"],
        limitations: [
          "Untrusted repository checks still require an external sandbox",
          "A2 Research Audit implementation is incomplete",
        ],
      },
    ],
  };
  fs.writeFileSync(registryPath, JSON.stringify(generatedRegistry, null, 2) + "\n");
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

  # 2. Validate repository records
  pnpm check:ai

  # 3. Inspect before broad changes
  pnpm evolve -- init
  # run an A0-A2 audit; do not grant production authority

  # 4. Configure and run
  pnpm ready
  pnpm dev

Use a GitHub Issue as the delivery prompt. Run pnpm verify before every PR.
Use user and research evidence, not novelty alone, before building uncertain features.
`);
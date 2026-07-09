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

Copies the Shipkit foundation into a new folder and seeds IDEA.md.
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

Read AGENTS.md. Implement vertical slices under apps/web/src/app/app/.
`;

fs.writeFileSync(join(dest, "IDEA.md"), idea);

try {
  const pkgPath = join(dest, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.name = name;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
} catch {
  /* ignore */
}

console.log(`
✦ Created ${name}

  cd ${name}
  pnpm install
  # edit IDEA.md
  cp .env.example apps/web/.env.local
  pnpm doctor
  pnpm dev

Happy vibe shipping.
`);

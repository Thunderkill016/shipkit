#!/usr/bin/env node
/**
 * Apply packages/db/sql/*.sql in order against DATABASE_URL (portable-pg / CI).
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const dir = join(root, "packages/db/sql");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql") && !f.includes("rls"))
  .sort();

const sql = postgres(url, { max: 1 });

console.log("✦ shipkit db:migrate\n");
for (const f of files) {
  const body = readFileSync(join(dir, f), "utf8");
  process.stdout.write(`  → ${f} ... `);
  try {
    await sql.unsafe(body);
    console.log("ok");
  } catch (e) {
    console.log("fail");
    console.error(e);
    await sql.end();
    process.exit(1);
  }
}
await sql.end();
console.log("\n  Done.");

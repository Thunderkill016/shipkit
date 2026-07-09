#!/usr/bin/env node
/**
 * shipkit doctor — env / preset health without starting Next.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const env = {
  ...process.env,
  ...loadEnvFile(resolve(root, ".env")),
  ...loadEnvFile(resolve(root, ".env.local")),
  ...loadEnvFile(resolve(root, "apps/web/.env.local")),
};

const hasSupabase = Boolean(
  env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const hasDb = Boolean(env.DATABASE_URL);

console.log("✦ shipkit doctor\n");
console.log(`  Supabase URL+anon : ${hasSupabase ? "ok" : "missing"}`);
console.log(`  DATABASE_URL      : ${hasDb ? "ok" : "missing"}`);
console.log(
  `  Suggested preset  : ${
    hasSupabase ? "supabase-full" : hasDb ? "portable-pg" : "none — copy .env.example"
  }`
);

if (!hasSupabase && !hasDb) {
  console.log("\n  Action: cp .env.example apps/web/.env.local and fill keys.");
  console.log("          Or: pnpm db:up  then set DATABASE_URL (portable-pg).");
  process.exitCode = 1;
} else {
  console.log("\n  Ready for pnpm dev");
}

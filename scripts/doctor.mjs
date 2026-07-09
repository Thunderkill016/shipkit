#!/usr/bin/env node
/**
 * shipkit doctor — env / preset / adapter health
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
const hasBetterSecret = Boolean(env.BETTER_AUTH_SECRET);
const forced = (env.AUTH_ADAPTER || "").toLowerCase();

let adapter = "none";
if (forced === "supabase" || forced === "better-auth") adapter = forced;
else if (hasDb && hasBetterSecret) adapter = "better-auth";
else if (hasSupabase) adapter = "supabase";

console.log("✦ shipkit doctor\n");
console.log(`  AUTH_ADAPTER force : ${forced || "(auto)"}`);
console.log(`  Resolved adapter   : ${adapter}`);
console.log(`  Supabase URL+anon  : ${hasSupabase ? "ok" : "—"}`);
console.log(`  DATABASE_URL       : ${hasDb ? "ok" : "—"}`);
console.log(`  BETTER_AUTH_SECRET : ${hasBetterSecret ? "ok" : "—"}`);
console.log(`  NEXT_PUBLIC_APP_URL: ${env.NEXT_PUBLIC_APP_URL || "—"}`);
console.log(`  IDEA.md            : ${existsSync(resolve(root, "IDEA.md")) ? "ok" : "missing"}`);
console.log(
  `  Agent skills       : ${existsSync(resolve(root, ".agents/skills")) ? "ok" : "—"}`
);

// OAuth social providers (Better Auth only)
const hasGoogle = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
const hasGitHub = Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
console.log(`  OAuth Google       : ${hasGoogle ? "ok" : "— (optional)"}`);
console.log(`  OAuth GitHub       : ${hasGitHub ? "ok" : "— (optional)"}`);

// Mail + storage ports
console.log(`  RESEND_API_KEY     : ${env.RESEND_API_KEY ? "ok" : "— (optional, console stub active)"}`);
console.log(`  S3_BUCKET          : ${env.S3_BUCKET ? "ok" : "— (optional)"}`);


const issues = [];
if (adapter === "none") {
  issues.push(
    "No auth backend. Pick one:\n" +
      "    • supabase-full: NEXT_PUBLIC_SUPABASE_URL + ANON_KEY\n" +
      "    • portable-pg:   pnpm db:up + DATABASE_URL + BETTER_AUTH_SECRET (32+ chars)"
  );
}
if (forced === "better-auth" && (!hasDb || !hasBetterSecret)) {
  issues.push("AUTH_ADAPTER=better-auth requires DATABASE_URL and BETTER_AUTH_SECRET");
}
if (forced === "supabase" && !hasSupabase) {
  issues.push("AUTH_ADAPTER=supabase requires Supabase URL + anon key");
}
if (hasBetterSecret && hasBetterSecret && (env.BETTER_AUTH_SECRET || "").length < 32) {
  issues.push("BETTER_AUTH_SECRET should be at least 32 characters");
}

if (issues.length) {
  console.log("\n  Issues:");
  for (const i of issues) console.log(`  • ${i}`);
  console.log("\n  See presets/ and docs/VIBE.md");
  process.exitCode = 1;
} else {
  console.log("\n  Ready → pnpm dev");
  console.log("  Next  → edit IDEA.md, then vibe features under /app");
}

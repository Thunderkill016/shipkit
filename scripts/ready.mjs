#!/usr/bin/env node
/**
 * pnpm ready — shortest path to a usable local CycleWarden
 *
 *   pnpm ready
 *   pnpm ready -- --preset=portable-pg
 *   pnpm ready -- --preset=supabase-full
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envLocal = resolve(root, "apps/web/.env.local");
const args = process.argv.slice(2);
const presetArg = args.find((a) => a.startsWith("--preset="));
const preset = presetArg?.split("=")[1];

function runNode(script, extra = []) {
  return spawnSync(process.execPath, [resolve(root, script), ...extra], {
    stdio: "inherit",
    cwd: root,
  });
}

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

if (!existsSync(envLocal) || preset) {
  const p = preset || "demo";
  console.log(`\n✦ setup --preset=${p}\n`);
  const r = runNode("scripts/setup.mjs", [`--preset=${p}`, "--force"]);
  if (r.status !== 0) process.exit(r.status ?? 1);
}

runNode("scripts/doctor.mjs");

const e = loadEnv(envLocal);
const portable =
  e.AUTH_ADAPTER === "better-auth" ||
  (Boolean(e.DATABASE_URL) && Boolean(e.BETTER_AUTH_SECRET));
const supabase =
  e.NEXT_PUBLIC_SUPABASE_URL &&
  !String(e.NEXT_PUBLIC_SUPABASE_URL).includes("YOUR_PROJECT");

console.log(`
┌─────────────────────────────────────────────┐
│  ✦ cyclewarden — đủ xài (local)                 │
└─────────────────────────────────────────────┘
`);

if (portable) {
  console.log(`  Path: portable-pg

  pnpm db:up && pnpm db:migrate && pnpm dev
  → http://localhost:3000/login  (đăng ký)
  → /app/notes  /  /app/profile  /  /app/billing
`);
} else if (supabase) {
  console.log(`  Path: supabase-full

  pnpm dev
  → http://localhost:3000/login
  (SQL lần đầu: packages/db/sql/0001 + 0002 + 0004 + 0005)
`);
} else {
  console.log(`  Path: demo UI

  pnpm dev
  → http://localhost:3000

  Auth thật:
    pnpm ready -- --preset=portable-pg
    # hoặc --preset=supabase-full
`);
}

console.log(`  IDEA.md · docs/TTFP.md · docs/DEPLOY.md
`);

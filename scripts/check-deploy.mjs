#!/usr/bin/env node
/**
 * cyclewarden check:deploy — production readiness (no deploy, just gates)
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
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = {
  ...process.env,
  ...loadEnvFile(resolve(root, "apps/web/.env.local")),
  ...loadEnvFile(resolve(root, "apps/web/.env.production.local")),
};

const appUrl = env.NEXT_PUBLIC_APP_URL || "";
const isLocal = /localhost|127\.0\.0\.1/.test(appUrl);
const hasAuth =
  (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  (env.DATABASE_URL && env.BETTER_AUTH_SECRET);

const gates = [
  {
    ok: Boolean(appUrl) && !isLocal,
    label: "NEXT_PUBLIC_APP_URL is production HTTPS domain",
    fix: "Set https://your-domain.com (not localhost)",
  },
  {
    ok: hasAuth,
    label: "Auth backend configured",
    fix: "Supabase keys or DATABASE_URL + BETTER_AUTH_SECRET",
  },
  {
    ok: !env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length >= 32,
    label: "BETTER_AUTH_SECRET strong enough",
    fix: "openssl rand -hex 32",
  },
  {
    ok:
      !env.DATABASE_URL ||
      Boolean(env.BETTER_AUTH_URL && !/localhost|127\.0\.0\.1/.test(env.BETTER_AUTH_URL)),
    label: "BETTER_AUTH_URL matches production (if portable)",
    fix: "BETTER_AUTH_URL=https://your-domain.com",
  },
  {
    ok: existsSync(resolve(root, "vercel.json")),
    label: "vercel.json present",
    fix: "Keep vercel.json at repo root",
  },
  {
    ok: existsSync(resolve(root, "docker-compose.prod.yml")),
    label: "docker-compose.prod.yml present",
    fix: "See docs/DEPLOY.md",
  },
];

console.log("\n✦ cyclewarden check:deploy\n");
let failed = 0;
for (const g of gates) {
  console.log(`  ${g.ok ? "✓" : "✗"}  ${g.label}`);
  if (!g.ok) {
    console.log(`       → ${g.fix}`);
    failed++;
  }
}

if (failed) {
  console.log(`\n  ${failed} gate(s) failed. Fix before production deploy.\n  See docs/DEPLOY.md · docs/PRODUCTION_CHECKLIST.md\n`);
  process.exit(1);
}

console.log(`
  All deploy gates passed (config-level).
  Still do: build green, auth redirect URLs, RLS SQL on Supabase.
  Vercel: connect GitHub → set env → deploy (vercel.json ready).
`);

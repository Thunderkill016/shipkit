#!/usr/bin/env node
/**
 * cyclewarden doctor v3 — checklist UX (ShipFast-style clarity)
 * Flags: --json
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const asJson = process.argv.includes("--json");

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

const envPath = resolve(root, "apps/web/.env.local");
const env = {
  ...process.env,
  ...loadEnvFile(resolve(root, ".env")),
  ...loadEnvFile(resolve(root, ".env.local")),
  ...loadEnvFile(envPath),
};

const hasSupabase = Boolean(
  env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const hasDb = Boolean(env.DATABASE_URL);
const hasBetterSecret = Boolean(env.BETTER_AUTH_SECRET);
const secretLen = (env.BETTER_AUTH_SECRET || "").length;
const forced = (env.AUTH_ADAPTER || "").toLowerCase();
const hasAppUrl = Boolean(env.NEXT_PUBLIC_APP_URL);
const hasGoogle = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
const hasGitHub = Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
const hasResend = Boolean(env.RESEND_API_KEY);
const hasS3 = Boolean(env.S3_BUCKET);
const hasStripe = Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_ID);
const hasSentry = Boolean(env.SENTRY_DSN);
const hasIdea = existsSync(resolve(root, "IDEA.md"));
const hasEnvFile = existsSync(envPath);

let adapter = "none";
if (forced === "supabase" || forced === "better-auth") adapter = forced;
else if (hasDb && hasBetterSecret) adapter = "better-auth";
else if (hasSupabase) adapter = "supabase";

const checks = [
  {
    id: "env_file",
    ok: hasEnvFile,
    required: false,
    label: "apps/web/.env.local",
    fix: "pnpm setup -- --preset=demo  (or copy .env.example)",
  },
  {
    id: "app_url",
    ok: hasAppUrl,
    required: true,
    label: "NEXT_PUBLIC_APP_URL",
    fix: "Set NEXT_PUBLIC_APP_URL=http://localhost:3000",
  },
  {
    id: "auth",
    ok: adapter !== "none",
    // Demo mode is valid for UI review; auth becomes required for product/sign-in
    required: false,
    label: `Auth adapter (${adapter === "none" ? "none · demo UI only" : adapter})`,
    fix: "supabase-full keys OR portable-pg DATABASE_URL + BETTER_AUTH_SECRET",
  },
  {
    id: "ba_secret_len",
    ok: !hasBetterSecret || secretLen >= 32,
    required: hasBetterSecret || adapter === "better-auth",
    label: "BETTER_AUTH_SECRET length ≥ 32",
    fix: "openssl rand -hex 32",
  },
  {
    id: "idea",
    ok: hasIdea,
    required: true,
    label: "IDEA.md present",
    fix: "Keep IDEA.md at repo root",
  },
  {
    id: "oauth_google",
    ok: hasGoogle,
    required: false,
    label: "OAuth Google",
    fix: "GOOGLE_CLIENT_ID + SECRET (optional)",
  },
  {
    id: "oauth_github",
    ok: hasGitHub,
    required: false,
    label: "OAuth GitHub",
    fix: "GITHUB_CLIENT_ID + SECRET (optional)",
  },
  {
    id: "mail",
    ok: hasResend,
    required: false,
    label: "Resend mail",
    fix: "RESEND_API_KEY (else console mailer)",
  },
  {
    id: "stripe",
    ok: hasStripe,
    required: false,
    label: "Stripe billing",
    fix: "STRIPE_SECRET_KEY + STRIPE_PRICE_ID",
  },
  {
    id: "s3",
    ok: hasS3,
    required: false,
    label: "S3 storage",
    fix: "S3_BUCKET + credentials (else local uploads)",
  },
  {
    id: "sentry",
    ok: hasSentry,
    required: false,
    label: "Sentry DSN",
    fix: "SENTRY_DSN (optional observability)",
  },
];

const requiredFailed = checks.filter((c) => c.required && !c.ok);
const optionalOk = checks.filter((c) => !c.required && c.ok).length;
const optionalTotal = checks.filter((c) => !c.required).length;
const score = Math.round(
  ((checks.filter((c) => c.ok).length) / checks.length) * 100
);

const report = {
  adapter,
  score,
  requiredOk: requiredFailed.length === 0,
  envFile: envPath,
  checks: checks.map((c) => ({
    id: c.id,
    ok: c.ok,
    required: c.required,
    label: c.label,
  })),
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(requiredFailed.length ? 1 : 0);
}

const ok = (v) => (v ? "✓" : "✗");
const dim = (v) => (v ? "✓" : "·");

console.log(`
┌─────────────────────────────────────────┐
│  ✦ cyclewarden doctor                       │
│  score ${String(score).padStart(3)}/100 · adapter: ${adapter.padEnd(12)} │
└─────────────────────────────────────────┘
`);

console.log("  Required");
for (const c of checks.filter((x) => x.required)) {
  console.log(`    ${ok(c.ok)}  ${c.label}`);
  if (!c.ok) console.log(`       → ${c.fix}`);
}

console.log("\n  Optional");
for (const c of checks.filter((x) => !x.required)) {
  console.log(`    ${dim(c.ok)}  ${c.label}`);
}

console.log(`\n  Optional filled: ${optionalOk}/${optionalTotal}`);

const hardIssues = [];
if (forced === "better-auth" && (!hasDb || !hasBetterSecret)) {
  hardIssues.push("AUTH_ADAPTER=better-auth requires DATABASE_URL and BETTER_AUTH_SECRET");
}
if (forced === "supabase" && !hasSupabase) {
  hardIssues.push("AUTH_ADAPTER=supabase requires Supabase URL + anon key");
}
if (hasBetterSecret && secretLen < 32) {
  hardIssues.push("BETTER_AUTH_SECRET should be at least 32 characters");
}

if (requiredFailed.length || hardIssues.length) {
  if (hardIssues.length) {
    console.log("\n  Blocking:");
    for (const i of hardIssues) console.log(`  • ${i}`);
  }
  console.log(`
  ── Next steps ──────────────────────────
  1. pnpm setup -- --preset=portable-pg
     or  pnpm setup -- --preset=supabase-full
  2. Fill secrets in apps/web/.env.local
  3. pnpm db:up && pnpm db:migrate   # portable only
  4. pnpm doctor && pnpm dev

  Docs: presets/ · docs/TTFP.md · docs/DEPLOY.md
`);
  process.exitCode = 1;
} else if (adapter === "none") {
  console.log(`
  ── Demo ready ────────────────────────────
  ✓  pnpm dev          → UI only (no real sign-in)
  →  Real auth: pnpm setup -- --preset=portable-pg
               or --preset=supabase-full
`);
} else {
  console.log(`
  ── Ready ───────────────────────────────
  ✓  pnpm dev          → http://localhost:3000
  ✓  edit IDEA.md      → vibe your product
  ✓  pnpm check:deploy → production env checklist

  Deploy: docs/DEPLOY.md · vercel.json included
`);
}

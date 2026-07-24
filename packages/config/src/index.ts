import { z } from "zod";

/** Supported presets — see /presets */
export type CycleWardenPreset = "supabase-full" | "portable-pg";

export type AuthAdapterId = "supabase" | "better-auth";
export type DeployTarget = "vercel" | "docker";

export interface KitConfig {
  preset: CycleWardenPreset;
  auth: AuthAdapterId;
  deploy: DeployTarget[];
}

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // App
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  // Supabase (preset: supabase-full)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  // Portable Postgres (preset: portable-pg)
  DATABASE_URL: z.string().min(1).optional(),
  // Rate limit (optional)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

export type CycleWardenEnv = z.infer<typeof envSchema>;

export function parseEnv(raw: NodeJS.ProcessEnv = process.env): {
  env: CycleWardenEnv;
  issues: string[];
} {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    return {
      env: {} as CycleWardenEnv,
      issues: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }
  const env = result.data;
  const issues: string[] = [];

  const hasSupabase = Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasDatabaseUrl = Boolean(env.DATABASE_URL);

  if (!hasSupabase && !hasDatabaseUrl) {
    issues.push(
      "No data/auth backend configured. Set Supabase URL+anon key (supabase-full) and/or DATABASE_URL (portable-pg)."
    );
  }

  return { env, issues };
}

export const defaultKitConfig: KitConfig = {
  preset: "supabase-full",
  auth: "supabase",
  deploy: ["vercel", "docker"],
};

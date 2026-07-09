import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

/**
 * Portable Postgres client (Better Auth + domain tables).
 * Only constructed when DATABASE_URL is set.
 */
export function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const client = postgres(url, { max: 5, prepare: false });
  return drizzle(client);
}

export type Db = NonNullable<ReturnType<typeof createDb>>;

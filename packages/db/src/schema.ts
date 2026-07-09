import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Canonical profile row — maps to Supabase `profiles` or plain Postgres.
 * App adapters must enforce: user can only read/write own row.
 */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email"),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

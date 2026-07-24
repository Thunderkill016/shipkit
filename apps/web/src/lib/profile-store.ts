import { createDb } from "./db";
import { profiles } from "@cyclewarden/db";
import { eq } from "drizzle-orm";

export interface UserProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

const g = globalThis as unknown as { __cyclewardenProfiles?: Map<string, UserProfile> };

function getDemoMap(): Map<string, UserProfile> {
  if (!g.__cyclewardenProfiles) g.__cyclewardenProfiles = new Map();
  return g.__cyclewardenProfiles;
}

/**
 * Gets a user profile by ID.
 * Queries the profiles table in the database if configured; otherwise, falls back to in-memory store.
 */
export async function getProfile(userId: string, email: string | null): Promise<UserProfile> {
  const db = createDb();
  if (db) {
    try {
      const row = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
      if (row[0]) {
        return {
          id: row[0].id,
          email: row[0].email,
          displayName: row[0].displayName,
          avatarUrl: row[0].avatarUrl,
        };
      }
    } catch {
      // Fallback if table does not exist or schema is not synced yet
    }
  }

  // Demo memory fallback
  const map = getDemoMap();
  let p = map.get(userId);
  if (!p) {
    p = {
      id: userId,
      email,
      displayName: email ? email.split("@")[0] ?? "User" : "User",
      avatarUrl: null,
    };
    map.set(userId, p);
  }
  return p;
}

/**
 * Updates a user profile.
 * Writes to the database if configured; otherwise, falls back to in-memory store.
 */
export async function updateProfile(
  userId: string,
  data: { displayName?: string; avatarUrl?: string | null }
): Promise<UserProfile> {
  const db = createDb();
  if (db) {
    try {
      await db
        .insert(profiles)
        .values({
          id: userId,
          displayName: data.displayName ?? null,
          avatarUrl: data.avatarUrl ?? null,
        })
        .onConflictDoUpdate({
          target: profiles.id,
          set: {
            displayName: data.displayName !== undefined ? data.displayName : undefined,
            avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : undefined,
            updatedAt: new Date(),
          },
        });

      const row = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
      if (row[0]) {
        return {
          id: row[0].id,
          email: row[0].email,
          displayName: row[0].displayName,
          avatarUrl: row[0].avatarUrl,
        };
      }
    } catch (e) {
      console.error("Failed to write to profiles table, falling back to memory:", e);
    }
  }

  // Demo memory fallback
  const map = getDemoMap();
  const p = map.get(userId) ?? { id: userId, email: null, displayName: null, avatarUrl: null };
  if (data.displayName !== undefined) p.displayName = data.displayName;
  if (data.avatarUrl !== undefined) p.avatarUrl = data.avatarUrl;
  map.set(userId, p);
  return p;
}

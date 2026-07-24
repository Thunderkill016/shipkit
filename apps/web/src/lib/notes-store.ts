/**
 * Notes domain store — Postgres when DATABASE_URL works, else in-memory demo.
 * Isolation: always scoped by userId (never list all users' notes).
 */

import { notes } from "@cyclewarden/db";
import { and, desc, eq } from "drizzle-orm";
import { createDb } from "./db";

export type Note = {
  id: string;
  userId: string;
  title: string;
  body: string;
  createdAt: string;
};

const g = globalThis as unknown as { __cyclewardenNotes?: Note[] };

function bucket(): Note[] {
  if (!g.__cyclewardenNotes) g.__cyclewardenNotes = [];
  return g.__cyclewardenNotes;
}

/** Demo / anonymous shell uses this owner id when no session. */
export const DEMO_USER_ID = "demo";

export async function listNotes(userId: string): Promise<Note[]> {
  const db = createDb();
  if (db) {
    try {
      const rows = await db
        .select()
        .from(notes)
        .where(eq(notes.userId, userId))
        .orderBy(desc(notes.createdAt));
      return rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        title: r.title,
        body: r.body,
        createdAt: r.createdAt.toISOString(),
      }));
    } catch {
      // table missing — fall through to memory
    }
  }

  return [...bucket()]
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addNote(
  userId: string,
  title: string,
  body: string
): Promise<Note> {
  const db = createDb();
  if (db) {
    try {
      const [row] = await db
        .insert(notes)
        .values({ userId, title, body })
        .returning();
      if (row) {
        return {
          id: row.id,
          userId: row.userId,
          title: row.title,
          body: row.body,
          createdAt: row.createdAt.toISOString(),
        };
      }
    } catch {
      // fall through
    }
  }

  const note: Note = {
    id: crypto.randomUUID(),
    userId,
    title,
    body,
    createdAt: new Date().toISOString(),
  };
  bucket().unshift(note);
  return note;
}

export async function deleteNote(userId: string, id: string): Promise<boolean> {
  const db = createDb();
  if (db) {
    try {
      const deleted = await db
        .delete(notes)
        .where(and(eq(notes.id, id), eq(notes.userId, userId)))
        .returning({ id: notes.id });
      return deleted.length > 0;
    } catch {
      // fall through
    }
  }

  const b = bucket();
  const i = b.findIndex((n) => n.id === id && n.userId === userId);
  if (i === -1) return false;
  b.splice(i, 1);
  return true;
}

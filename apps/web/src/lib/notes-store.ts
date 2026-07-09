/**
 * Demo domain store — in-memory so the notes example works without DB.
 * Replace with @shipkit/db + SQL when you go production (see skill add-entity).
 */

export type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

const g = globalThis as unknown as { __shipkitNotes?: Note[] };

function bucket(): Note[] {
  if (!g.__shipkitNotes) g.__shipkitNotes = [];
  return g.__shipkitNotes;
}

export function listNotes(): Note[] {
  return [...bucket()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addNote(title: string, body: string): Note {
  const note: Note = {
    id: crypto.randomUUID(),
    title,
    body,
    createdAt: new Date().toISOString(),
  };
  bucket().unshift(note);
  return note;
}

export function deleteNote(id: string): boolean {
  const b = bucket();
  const i = b.findIndex((n) => n.id === id);
  if (i === -1) return false;
  b.splice(i, 1);
  return true;
}

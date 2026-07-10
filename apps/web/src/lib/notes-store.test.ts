import { describe, expect, it, beforeEach } from "vitest";
import { addNote, deleteNote, listNotes } from "./notes-store";

describe("notes-store isolation (memory path)", () => {
  beforeEach(async () => {
    // clear by deleting listed notes per user
    for (const uid of ["user-a", "user-b"]) {
      const list = await listNotes(uid);
      for (const n of list) await deleteNote(uid, n.id);
    }
  });

  it("scopes notes by userId", async () => {
    await addNote("user-a", "A1", "body");
    await addNote("user-b", "B1", "body");
    const a = await listNotes("user-a");
    const b = await listNotes("user-b");
    expect(a.every((n) => n.userId === "user-a")).toBe(true);
    expect(b.every((n) => n.userId === "user-b")).toBe(true);
    expect(a.some((n) => n.title === "B1")).toBe(false);
  });

  it("delete requires matching owner", async () => {
    const n = await addNote("user-a", "secret", "");
    expect(await deleteNote("user-b", n.id)).toBe(false);
    expect(await deleteNote("user-a", n.id)).toBe(true);
  });
});

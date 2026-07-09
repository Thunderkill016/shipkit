"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { addNote, deleteNote } from "@/lib/notes-store";

const NoteSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(120),
  body: z.string().trim().max(5000).default(""),
});

export type NoteActionState = { error: string | null; ok?: boolean };

export async function createNoteAction(
  _prev: NoteActionState,
  formData: FormData
): Promise<NoteActionState> {
  const parsed = NoteSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid note" };
  }
  addNote(parsed.data.title, parsed.data.body);
  revalidatePath("/app/notes");
  return { error: null, ok: true };
}

export async function deleteNoteAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id) deleteNote(id);
  revalidatePath("/app/notes");
}

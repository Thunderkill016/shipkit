"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { addNote, deleteNote, DEMO_USER_ID } from "@/lib/notes-store";
import { getAuth } from "@/lib/auth";

const NoteSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(120),
  body: z.string().trim().max(5000).default(""),
});

export type NoteActionState = { error: string | null; ok?: boolean };

async function ownerId(): Promise<string> {
  const user = await getAuth().getUser();
  return user?.id ?? DEMO_USER_ID;
}

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
  const uid = await ownerId();
  await addNote(uid, parsed.data.title, parsed.data.body);
  revalidatePath("/app/notes");
  return { error: null, ok: true };
}

export async function deleteNoteAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const uid = await ownerId();
  await deleteNote(uid, id);
  revalidatePath("/app/notes");
}

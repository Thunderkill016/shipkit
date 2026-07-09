import Link from "next/link";
import { listNotes } from "@/lib/notes-store";
import { NoteForm } from "./note-form";
import { deleteNoteAction } from "@/app/actions/notes";

export const metadata = {
  title: "Notes example",
};

export default function NotesPage() {
  const notes = listNotes();

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-6 py-10">
      <header className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <p className="text-xs text-accent">Example domain feature</p>
          <h1 className="text-xl font-semibold">Notes</h1>
        </div>
        <Link href="/app" className="text-sm text-muted hover:text-foreground">
          ← App
        </Link>
      </header>

      <p className="mt-4 text-sm text-muted">
        Pattern for vibe coding: Zod validation + server actions + UI. Data is{" "}
        <strong className="text-foreground">in-memory</strong> (resets on server restart). Swap to
        Postgres via <code className="text-foreground">add-entity</code> skill when ready.
      </p>

      <div className="mt-8">
        <NoteForm />
      </div>

      <ul className="mt-8 space-y-3">
        {notes.length === 0 && (
          <li className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted">
            No notes yet — add one above.
          </li>
        )}
        {notes.map((n) => (
          <li key={n.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{n.title}</p>
                {n.body && <p className="mt-1 text-sm text-muted whitespace-pre-wrap">{n.body}</p>}
                <p className="mt-2 font-mono text-xs text-muted">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              <form action={deleteNoteAction}>
                <input type="hidden" name="id" value={n.id} />
                <button
                  type="submit"
                  className="text-xs text-muted hover:text-red-400"
                >
                  Delete
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

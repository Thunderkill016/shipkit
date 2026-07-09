"use client";

import { useActionState } from "react";
import { createNoteAction, type NoteActionState } from "@/app/actions/notes";

const initial: NoteActionState = { error: null };

export function NoteForm() {
  const [state, action, pending] = useActionState(createNoteAction, initial);

  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <label className="text-xs text-muted">
        Title
        <input
          name="title"
          required
          maxLength={120}
          placeholder="Shipkit is cool"
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </label>
      <label className="text-xs text-muted">
        Body
        <textarea
          name="body"
          rows={3}
          maxLength={5000}
          placeholder="Optional details…"
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </label>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.ok && !state.error && (
        <p className="text-sm text-accent">Saved.</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-accent py-2 text-sm font-semibold text-background disabled:opacity-60"
      >
        {pending ? "Saving…" : "Add note"}
      </button>
    </form>
  );
}

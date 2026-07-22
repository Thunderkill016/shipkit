"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createProductRecordAction,
  type ProductSliceActionState,
} from "@/app/actions/product-slices";
import type { ProductSliceDefinition } from "@/lib/product-slices";

const initialState: ProductSliceActionState = { error: null };

export function ProductSliceForm({ slice }: { slice: ProductSliceDefinition }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    createProductRecordAction.bind(null, slice.id),
    initialState
  );

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="space-y-4 rounded-xl border border-border bg-card p-5">
      {slice.fields.map((field) => (
        <div key={field.id}>
          <label htmlFor={field.id} className="mb-1.5 block text-sm font-medium text-foreground">
            {field.label}
            {field.required && <span className="ml-1 text-accent">*</span>}
          </label>

          {field.type === "textarea" ? (
            <textarea
              id={field.id}
              name={field.id}
              required={field.required}
              maxLength={field.maxLength}
              placeholder={field.placeholder}
              defaultValue={field.defaultValue}
              rows={5}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-accent"
            />
          ) : field.type === "select" ? (
            <select
              id={field.id}
              name={field.id}
              required={field.required}
              defaultValue={field.defaultValue ?? ""}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-accent"
            >
              {!field.required && <option value="">None</option>}
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={field.id}
              name={field.id}
              type="text"
              required={field.required}
              maxLength={field.maxLength}
              placeholder={field.placeholder}
              defaultValue={field.defaultValue}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-accent"
            />
          )}

          {field.help && <p className="mt-1 text-xs text-muted">{field.help}</p>}
        </div>
      ))}

      {state.error && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Saving…" : slice.submitLabel}
      </button>
    </form>
  );
}

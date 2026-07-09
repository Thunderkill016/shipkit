"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
      <p className="text-sm text-red-400">Something went wrong</p>
      <h1 className="mt-2 text-2xl font-semibold">Error</h1>
      <p className="mt-2 text-sm text-muted">
        {process.env.NODE_ENV === "development"
          ? error.message
          : "Please try again. If it keeps happening, check server logs."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-xl border border-border px-4 py-2 text-sm hover:border-accent"
      >
        Try again
      </button>
    </div>
  );
}

export default function NotesLoading() {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-6 py-10">
      <header className="flex items-center justify-between border-b border-border pb-6">
        <div className="space-y-2">
          <div className="h-3 w-36 animate-pulse rounded bg-border" />
          <div className="h-6 w-20 animate-pulse rounded bg-border" />
        </div>
      </header>
      <div className="mt-8 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 h-20 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

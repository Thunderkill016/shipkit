export default function AppLoading() {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-6 py-10">
      <header className="flex items-center justify-between border-b border-border pb-6">
        <div className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-border" />
          <div className="h-6 w-16 animate-pulse rounded bg-border" />
        </div>
      </header>
      <div className="mt-8 space-y-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="h-4 w-32 animate-pulse rounded bg-border" />
          <div className="mt-3 h-5 w-48 animate-pulse rounded bg-border" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 h-24 animate-pulse" />
          <div className="rounded-xl border border-border bg-card p-5 h-24 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

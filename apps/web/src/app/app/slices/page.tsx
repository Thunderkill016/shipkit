import Link from "next/link";
import { getProductSlices } from "@/lib/product-slices";

export const metadata = {
  title: "Product Slice Engine",
};

export default function ProductSlicesPage() {
  const slices = getProductSlices();

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <header className="flex items-start justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="text-xs text-accent">Executable product contracts</p>
          <h1 className="mt-1 text-2xl font-semibold">Product Slice Engine</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            Define a workflow in <code className="text-foreground">product/slices.json</code> and Shipkit renders validated, owner-scoped product behavior without a paid AI call.
          </p>
        </div>
        <Link href="/app" className="shrink-0 text-sm text-muted hover:text-foreground">
          ← App
        </Link>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {slices.map((slice) => (
          <Link
            key={slice.id}
            href={`/app/slices/${slice.id}`}
            className="group rounded-xl border border-border bg-card p-5 transition hover:border-accent"
          >
            <p className="font-medium transition group-hover:text-accent">{slice.title} →</p>
            <p className="mt-2 text-sm text-muted">{slice.description}</p>
            <p className="mt-4 font-mono text-xs text-muted">
              {slice.fields.length} fields · {slice.id}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-border p-5 text-sm text-muted">
        Add another workflow with{" "}
        <code className="text-foreground">
          pnpm slice:new -- --id=ideas --title=&quot;Idea Inbox&quot;
        </code>
      </div>
    </div>
  );
}

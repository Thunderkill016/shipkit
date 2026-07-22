import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deleteProductRecordAction } from "@/app/actions/product-slices";
import { getAuth, getAuthAdapterName } from "@/lib/auth";
import { DEMO_USER_ID } from "@/lib/notes-store";
import { listProductRecords } from "@/lib/product-records-store";
import { getProductSlice } from "@/lib/product-slices";
import { ProductSliceForm } from "../slice-form";

export default async function ProductSlicePage({
  params,
}: {
  params: Promise<{ sliceId: string }>;
}) {
  const { sliceId } = await params;
  const slice = getProductSlice(sliceId);
  if (!slice) notFound();

  const user = await getAuth().getUser();
  const adapter = getAuthAdapterName();
  if (!user && adapter !== "none") redirect("/login");

  const owner = user?.id ?? DEMO_USER_ID;
  const records = await listProductRecords(owner, slice.id);
  const deleteAction = deleteProductRecordAction.bind(null, slice.id);
  const databaseConfigured = Boolean(process.env.DATABASE_URL);

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <header className="flex items-start justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="text-xs text-accent">Product Slice · {slice.id}</p>
          <h1 className="mt-1 text-2xl font-semibold">{slice.title}</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">{slice.description}</p>
        </div>
        <Link href="/app/slices" className="shrink-0 text-sm text-muted hover:text-foreground">
          ← Slices
        </Link>
      </header>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
        <span className="rounded-full border border-border px-2 py-1">
          {databaseConfigured ? "Postgres" : "explicit demo memory"}
        </span>
        <span className="rounded-full border border-border px-2 py-1">
          owner: {user?.email ?? owner}
        </span>
        <span className="rounded-full border border-border px-2 py-1">
          server-validated
        </span>
      </div>

      <div className="mt-8">
        <ProductSliceForm slice={slice} />
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Signals</h2>
          <span className="text-xs text-muted">{records.length} records</span>
        </div>

        <ul className="mt-4 space-y-3">
          {records.length === 0 && (
            <li className="rounded-xl border border-dashed border-border px-4 py-8 text-sm text-muted">
              {slice.emptyState}
            </li>
          )}

          {records.map((record) => (
            <li key={record.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-5">
                <dl className="grid flex-1 gap-3 sm:grid-cols-2">
                  {slice.fields.map((field) => {
                    const rawValue = record.data[field.id] ?? "";
                    if (!rawValue) return null;
                    const displayValue =
                      field.type === "select"
                        ? field.options.find((option) => option.value === rawValue)?.label ?? rawValue
                        : rawValue;

                    return (
                      <div key={field.id} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                        <dt className="text-xs text-muted">{field.label}</dt>
                        <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                          {displayValue}
                        </dd>
                      </div>
                    );
                  })}
                </dl>

                <form action={deleteAction}>
                  <input type="hidden" name="id" value={record.id} />
                  <button type="submit" className="text-xs text-muted transition hover:text-red-400">
                    Delete
                  </button>
                </form>
              </div>
              <p className="mt-4 font-mono text-xs text-muted">
                {new Date(record.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

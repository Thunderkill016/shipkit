import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
      <p className="text-sm text-accent">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted">That route does not exist in this product yet.</p>
      <Link href="/" className="mt-6 text-sm text-accent hover:underline">
        ← Back home
      </Link>
    </div>
  );
}

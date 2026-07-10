"use client";

import { useState } from "react";
import { startCheckoutAction } from "@/app/actions/billing";

export function CheckoutButton() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
        onClick={async () => {
          setPending(true);
          setError(null);
          const res = await startCheckoutAction();
          if (res.url) {
            window.location.href = res.url;
            return;
          }
          if (res.error) setError(res.error);
          setPending(false);
        }}
      >
        {pending ? "Redirecting…" : "Upgrade with Stripe"}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}

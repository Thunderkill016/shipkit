"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  runDeliveryWorkspaceAction,
  type DeliveryActionState,
} from "@/app/actions/delivery";

const initialState: DeliveryActionState = { error: null };

function Feedback({ state }: { state: DeliveryActionState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm leading-relaxed text-red-300">
        {state.error}
      </p>
    );
  }
  if (state.ok && state.message) {
    return (
      <p role="status" className="text-sm leading-relaxed text-accent">
        {state.message}
      </p>
    );
  }
  return null;
}

function useRefreshAfterSuccess(state: DeliveryActionState) {
  const router = useRouter();
  useEffect(() => {
    if (!state.ok || !state.cycleId) return;
    router.push(`/app/evolution/delivery?cycle=${encodeURIComponent(state.cycleId)}`);
    router.refresh();
  }, [router, state.cycleId, state.message, state.ok, state.operation]);
}

function useLiveRefresh(active: boolean) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = window.setInterval(refresh, 5_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [active, router]);
}

export function DeliveryOperatorControls({
  cycleId,
  enabled,
  accessReason,
  operationDisposition,
  operationCancellable,
}: {
  cycleId: string;
  enabled: boolean;
  accessReason: string;
  operationDisposition: string;
  operationCancellable: boolean;
}) {
  const [inspectState, inspectAction, inspectPending] = useActionState(
    runDeliveryWorkspaceAction,
    initialState
  );
  const [cancelState, cancelAction, cancelPending] = useActionState(
    runDeliveryWorkspaceAction,
    initialState
  );
  const [applyState, applyAction, applyPending] = useActionState(
    runDeliveryWorkspaceAction,
    initialState
  );
  useRefreshAfterSuccess(inspectState);
  useRefreshAfterSuccess(cancelState);
  useRefreshAfterSuccess(applyState);
  useLiveRefresh(operationDisposition === "active");

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Operator actions
          </p>
          <h2 className="mt-2 text-lg font-semibold text-foreground">
            Inspect first, mutate explicitly
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Active delivery state refreshes every five seconds. Every mutation still runs through the
            official delivery CLI and rechecks the exact lease before changing state or signalling a
            process.
          </p>
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">
          lease: {operationDisposition}
        </span>
      </div>

      {!enabled && (
        <div className="mt-5 rounded-xl border border-amber-700/50 bg-amber-950/30 p-4">
          <p className="text-sm font-medium text-amber-100">Operator actions are locked</p>
          <p className="mt-2 text-sm leading-relaxed text-amber-100/80">{accessReason}</p>
        </div>
      )}

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <form action={inspectAction} className="space-y-4 rounded-xl border border-border bg-background p-4">
          <input type="hidden" name="cycleId" value={cycleId} />
          <p className="font-medium text-foreground">Read-only inspection</p>
          <p className="text-sm leading-relaxed text-muted">
            Recheck process identity and compare durable delivery records with the cycle journal,
            branch and worktree.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <button
              type="submit"
              name="operation"
              value="inspect-operation"
              disabled={!enabled || inspectPending}
              className="min-h-11 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              Inspect lease
            </button>
            <button
              type="submit"
              name="operation"
              value="inspect-recovery"
              disabled={!enabled || inspectPending}
              className="min-h-11 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              Inspect reconciliation
            </button>
          </div>
          <Feedback state={inspectState} />
        </form>

        <form action={cancelAction} className="space-y-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <input type="hidden" name="cycleId" value={cycleId} />
          <input type="hidden" name="operation" value="request-cancellation" />
          <p className="font-medium text-foreground">Graceful cancellation</p>
          <p className="text-sm leading-relaxed text-muted">
            Record a durable cancellation intent and send SIGTERM only to the exact active child
            process group. No SIGKILL escalation is available.
          </p>
          <label className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 text-sm leading-relaxed text-muted">
            <input
              type="checkbox"
              required
              name="confirmApply"
              value="confirmed"
              disabled={!enabled || cancelPending}
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
            />
            <span>I reviewed the live operation and authorize graceful cancellation.</span>
          </label>
          <button
            type="submit"
            disabled={
              !enabled ||
              cancelPending ||
              operationDisposition !== "active" ||
              !operationCancellable
            }
            className="min-h-11 w-full rounded-xl border border-amber-500/60 px-3 py-2 text-sm font-medium text-amber-200 transition-colors hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {cancelPending ? "Requesting cancellation…" : "Request graceful cancellation"}
          </button>
          {!operationCancellable && operationDisposition === "active" && (
            <p className="text-xs leading-relaxed text-muted">
              Cancellation is unavailable until the engine records a validated local child process.
            </p>
          )}
          <Feedback state={cancelState} />
        </form>

        <form action={applyAction} className="space-y-4 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <input type="hidden" name="cycleId" value={cycleId} />
          <p className="font-medium text-foreground">Explicit recovery apply</p>
          <p className="text-sm leading-relaxed text-muted">
            Apply only after reviewing the current inspection. The CLI fails closed if the lease or
            durable records changed since inspection.
          </p>
          <label className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 text-sm leading-relaxed text-muted">
            <input
              type="checkbox"
              required
              name="confirmApply"
              value="confirmed"
              disabled={!enabled || applyPending}
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
            />
            <span>I reviewed the current evidence and explicitly authorize this recovery action.</span>
          </label>
          <div className="grid gap-2">
            <button
              type="submit"
              name="operation"
              value="clear-stale-operation"
              disabled={!enabled || applyPending || operationDisposition !== "stale"}
              className="min-h-11 rounded-xl border border-red-500/50 px-3 py-2 text-sm font-medium text-red-200 transition-colors hover:border-red-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear proven stale lease
            </button>
            <button
              type="submit"
              name="operation"
              value="apply-recovery"
              disabled={!enabled || applyPending}
              className="min-h-11 rounded-xl border border-accent/60 bg-accent/10 px-3 py-2 text-sm font-medium text-accent transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply reconciliation
            </button>
          </div>
          <Feedback state={applyState} />
        </form>
      </div>
    </section>
  );
}

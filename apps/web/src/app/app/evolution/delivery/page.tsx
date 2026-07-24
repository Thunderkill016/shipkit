import Link from "next/link";
import type { ReactNode } from "react";
import { DeliveryOperatorControls } from "./delivery-operator-controls";
import { getEvolutionMutationAccess } from "@/lib/evolution-access";
import { loadDeliveryWorkspace } from "@/lib/delivery-workspace";
import { loadEvolutionWorkspace } from "@/lib/evolution-workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  searchParams: Promise<{ cycle?: string }>;
};

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted">
      {children}
    </span>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-sm leading-relaxed text-muted">{children}</p>;
}

export default async function DeliveryWorkspacePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const evolution = await loadEvolutionWorkspace(params.cycle);
  const selected = evolution.selected;
  const [delivery, mutationAccess] = await Promise.all([
    selected ? loadDeliveryWorkspace(selected.cycleId) : Promise.resolve({ state: null, error: null }),
    getEvolutionMutationAccess(),
  ]);
  const state = delivery.state;

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Evolution workspace · governed delivery
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">Delivery operations</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            Inspect implementation, independent verification, draft publication, process ownership
            and fail-closed recovery from the same durable state used by the CLI.
          </p>
        </div>
        <Link
          href={
            selected
              ? `/app/evolution?cycle=${encodeURIComponent(selected.cycleId)}`
              : "/app/evolution"
          }
          className="rounded-xl border border-border px-4 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-foreground"
        >
          Back to cycle
        </Link>
      </header>

      {evolution.error && (
        <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-300">
          Could not load CycleWarden state: {evolution.error}
        </div>
      )}

      {!selected ? (
        <section className="mt-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-medium text-foreground">No cycle selected</h2>
          <EmptyState>Select or create a cycle in the Evolution Workspace first.</EmptyState>
        </section>
      ) : (
        <main className="mt-8 space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs text-accent">{selected.cycleId}</p>
                <h2 className="mt-2 text-xl font-semibold text-foreground">{selected.objective}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>cycle: {selected.stage}</Badge>
                <Badge>lease: {state?.operation.disposition ?? "unavailable"}</Badge>
                <Badge>control: {state?.operation.controlStatus ?? "unavailable"}</Badge>
              </div>
            </div>
          </section>

          {delivery.error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-300">
              Could not inspect delivery state: {delivery.error}
            </div>
          )}

          {state && (
            <>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border bg-card p-5">
                  <p className="text-xs uppercase tracking-wider text-muted">Execution</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {state.execution?.status ?? "not started"}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {state.execution
                      ? `${state.execution.changedFiles.length} changed file(s)`
                      : "No durable execution record"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                  <p className="text-xs uppercase tracking-wider text-muted">Verification</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {state.verification?.verdict ?? "not started"}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {state.verification
                      ? `${state.verification.checks.length} check(s)`
                      : "No independent verdict"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                  <p className="text-xs uppercase tracking-wider text-muted">Publication</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {state.publication?.status ?? "not started"}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {state.publication?.draftPrUrl ? "Draft PR recorded" : "No draft PR recorded"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                  <p className="text-xs uppercase tracking-wider text-muted">Operation lease</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {state.operation.disposition}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    owner {state.operation.ownerState} · child {state.operation.childState}
                  </p>
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-medium text-foreground">Implementation record</h3>
                    {state.execution && <Badge>{state.execution.commandStatus}</Badge>}
                  </div>
                  {state.execution ? (
                    <div className="mt-4 space-y-3 text-sm text-muted">
                      <p>
                        Actor: <span className="text-foreground">{state.execution.actor}</span>
                      </p>
                      <p>
                        Branch: <span className="text-foreground">{state.branchName ?? "unknown"}</span>
                      </p>
                      <p>Completed: {state.execution.completedAt}</p>
                      <p>Changed files: {state.execution.changedFiles.join(" · ") || "none"}</p>
                      {state.execution.scopeViolations.length > 0 && (
                        <p className="text-red-300">
                          Scope violations: {state.execution.scopeViolations.join(" · ")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <EmptyState>
                      The selected cycle has no durable implementation record. Web execution remains
                      intentionally unavailable.
                    </EmptyState>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-medium text-foreground">Independent verification</h3>
                    {state.verification && <Badge>{state.verification.verdict}</Badge>}
                  </div>
                  {state.verification ? (
                    <div className="mt-4 space-y-3 text-sm text-muted">
                      <p>
                        Verifier: <span className="text-foreground">{state.verification.verifierActor}</span>
                      </p>
                      <p>Commit: {state.verification.commitSha ?? "none"}</p>
                      <ul className="space-y-1">
                        {state.verification.checks.map((check) => (
                          <li key={check.id}>
                            {check.id}: <span className="text-foreground">{check.status}</span>
                          </li>
                        ))}
                      </ul>
                      {state.verification.unresolvedRisks.length > 0 && (
                        <p className="text-amber-200">
                          Risks: {state.verification.unresolvedRisks.join(" · ")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <EmptyState>No independent verification record has been persisted.</EmptyState>
                  )}
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-medium text-foreground">Draft publication</h3>
                    {state.publication && <Badge>{state.publication.status}</Badge>}
                  </div>
                  {state.publication ? (
                    <div className="mt-4 space-y-3 text-sm text-muted">
                      <p>Completed: {state.publication.completedAt}</p>
                      <p>
                        Steps: {Object.entries(state.publication.steps)
                          .map(([name, status]) => `${name}=${status}`)
                          .join(" · ") || "none"}
                      </p>
                      {state.publication.draftPrUrl && (
                        <a
                          href={state.publication.draftPrUrl}
                          className="inline-block text-accent underline underline-offset-4"
                        >
                          Open recorded draft PR
                        </a>
                      )}
                      {state.publication.unresolvedRisks.length > 0 && (
                        <p className="text-amber-200">
                          Risks: {state.publication.unresolvedRisks.join(" · ")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <EmptyState>No draft publication record has been persisted.</EmptyState>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-medium text-foreground">Process lease evidence</h3>
                    <Badge>{state.operation.disposition}</Badge>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-muted">
                    {state.operation.record ? (
                      <>
                        <p>
                          Operation: <span className="text-foreground">{state.operation.record.operation}</span>
                        </p>
                        <p>
                          Status: <span className="text-foreground">{state.operation.record.status}</span>
                        </p>
                        <p>Actor: {state.operation.record.actor}</p>
                        <p>Heartbeat: {state.operation.record.heartbeatAt}</p>
                      </>
                    ) : (
                      <p>No operation checkpoint has been recorded.</p>
                    )}
                    <p>Lock present: {state.operation.lockPresent ? "yes" : "no"}</p>
                    {state.operation.findings.length > 0 && (
                      <ul className="space-y-1 text-amber-200">
                        {state.operation.findings.map((finding) => (
                          <li key={finding}>• {finding}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </section>

              <DeliveryOperatorControls
                cycleId={selected.cycleId}
                enabled={mutationAccess.allowed}
                accessReason={mutationAccess.reason}
                operationDisposition={state.operation.disposition}
              />

              <section className="rounded-2xl border border-border bg-background p-5 text-sm leading-relaxed text-muted">
                <p className="font-medium text-foreground">Boundary</p>
                <p className="mt-2">
                  This console exposes inspection and recovery only. It cannot upload a delivery
                  manifest, run an implementation command, accept verification, push a branch, merge,
                  deploy or write production.
                </p>
              </section>
            </>
          )}
        </main>
      )}
    </div>
  );
}

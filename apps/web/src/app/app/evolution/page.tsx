import Link from "next/link";
import { basename, dirname, resolve } from "node:path";
import {
  EvolutionStore,
  type EvolutionCycle,
} from "../../../../../../packages/evolution-core/src/index";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ cycle?: string }>;
};

function defaultStateRoot(): string {
  if (process.env.SHIPKIT_STATE_ROOT) return resolve(process.env.SHIPKIT_STATE_ROOT);
  const cwd = process.cwd();
  const fromWebWorkspace = basename(cwd) === "web" && basename(dirname(cwd)) === "apps";
  return fromWebWorkspace ? resolve(cwd, "../..", ".shipkit") : resolve(cwd, ".shipkit");
}

async function loadCycles() {
  const store = new EvolutionStore(defaultStateRoot());
  try {
    const summaries = await store.list();
    const cycles = await Promise.all(
      summaries.map(async (summary) => {
        try {
          return await store.load(summary.cycleId);
        } catch {
          return null;
        }
      })
    );
    return {
      root: store.rootDir,
      cycles: cycles.filter((cycle): cycle is EvolutionCycle => cycle !== null),
      error: null,
    };
  } catch (error) {
    return {
      root: store.rootDir,
      cycles: [] as EvolutionCycle[],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted">
      {children}
    </span>
  );
}

export default async function EvolutionWorkspacePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const workspace = await loadCycles();
  const selected =
    workspace.cycles.find((cycle) => cycle.cycleId === params.cycle) ?? workspace.cycles[0] ?? null;
  const research = selected?.research;
  const decision = research?.decisions.at(-1) ?? null;
  const experiment = research?.experiments.at(-1) ?? null;
  const handoff = research?.executionHandoffs.at(-1) ?? null;
  const selectedOpportunity = decision
    ? research?.opportunities.find(
        (opportunity) => opportunity.recordId === decision.selectedOpportunityId
      ) ?? null
    : null;

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Unified Shipkit workspace
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">Evolution cycles</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            This view reads the same durable journal and cycle records as the CLI. It does not keep a
            second workspace state.
          </p>
        </div>
        <Link
          href="/app"
          className="rounded-xl border border-border px-4 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-foreground"
        >
          Back to app
        </Link>
      </header>

      <div className="mt-6 rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted">
        State root: <code className="break-all text-foreground">{workspace.root}</code>
      </div>

      {workspace.error && (
        <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-300">
          Could not load Shipkit state: {workspace.error}
        </div>
      )}

      {workspace.cycles.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-medium text-foreground">No durable cycle found</h2>
          <p className="mt-2 text-sm text-muted">
            Initialize a cycle with the CLI, inspect and assess the repository, then prepare a research
            handoff.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-background p-4 text-xs text-muted">
            {`pnpm evolve -- init\npnpm evolve -- start --id shipkit:cycle-001 --objective "Choose the next product experiment"\npnpm evolve -- inspect shipkit:cycle-001 --project-root .\npnpm evolve -- assess shipkit:cycle-001 --project-root .\npnpm evolve -- prepare-handoff shipkit:cycle-001 --bundle research.json --project-root .`}
          </pre>
        </section>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-3">
            {workspace.cycles.map((cycle) => (
              <Link
                key={cycle.cycleId}
                href={`/app/evolution?cycle=${encodeURIComponent(cycle.cycleId)}`}
                className={`block rounded-xl border p-4 transition-colors ${
                  cycle.cycleId === selected?.cycleId
                    ? "border-accent bg-accent/5"
                    : "border-border bg-card hover:border-accent/60"
                }`}
              >
                <p className="truncate text-sm font-medium text-foreground">{cycle.cycleId}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                  {cycle.objective}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>{cycle.stage}</Badge>
                  <Badge>{cycle.autonomy}</Badge>
                  <Badge>{cycle.risk}</Badge>
                </div>
              </Link>
            ))}
          </aside>

          {selected && (
            <main className="space-y-6">
              <section className="rounded-2xl border border-border bg-card p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-accent">{selected.cycleId}</p>
                    <h2 className="mt-2 text-xl font-semibold text-foreground">
                      {selected.objective}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>stage: {selected.stage}</Badge>
                    <Badge>events: {selected.history.length}</Badge>
                    <Badge>evidence buckets: {Object.values(selected.artifacts).filter((v) => v.length).length}</Badge>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Sources", research?.sources.length ?? 0],
                  ["Claims", research?.claims.length ?? 0],
                  ["Contradictions", research?.contradictions.length ?? 0],
                  ["Opportunities", research?.opportunities.length ?? 0],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-border bg-card p-5">
                    <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
                  </div>
                ))}
              </section>

              <section className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-medium text-foreground">Opportunity portfolio</h3>
                <div className="mt-4 space-y-3">
                  {(research?.opportunities ?? []).map((opportunity) => (
                    <article
                      key={opportunity.recordId}
                      className={`rounded-xl border p-4 ${
                        opportunity.recordId === decision?.selectedOpportunityId
                          ? "border-accent bg-accent/5"
                          : "border-border bg-background"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{opportunity.title}</p>
                          <p className="mt-1 text-sm leading-relaxed text-muted">
                            {opportunity.problem}
                          </p>
                        </div>
                        {opportunity.recordId === decision?.selectedOpportunityId && (
                          <Badge>selected</Badge>
                        )}
                      </div>
                      <p className="mt-3 text-sm text-muted">
                        Smallest experiment: <span className="text-foreground">{opportunity.smallestExperiment}</span>
                      </p>
                    </article>
                  ))}
                  {!research?.opportunities.length && (
                    <p className="text-sm text-muted">No opportunity records have been persisted yet.</p>
                  )}
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h3 className="font-medium text-foreground">Selected decision</h3>
                  {decision && selectedOpportunity ? (
                    <div className="mt-4 space-y-3 text-sm text-muted">
                      <p className="text-lg font-medium text-foreground">{selectedOpportunity.title}</p>
                      <p>{decision.rationale}</p>
                      <p>
                        Rejected alternatives: <span className="text-foreground">{decision.rejectedOpportunityIds.length}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted">No decision has been persisted.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-card p-6">
                  <h3 className="font-medium text-foreground">Reversible experiment</h3>
                  {experiment ? (
                    <div className="mt-4 space-y-3 text-sm text-muted">
                      <p className="text-foreground">{experiment.hypothesis}</p>
                      <p>{experiment.method}</p>
                      <p>Success criteria: {experiment.successCriteria.join(" · ")}</p>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted">No experiment has been persisted.</p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-card p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-medium text-foreground">Execution handoff</h3>
                  {handoff && <Badge>{handoff.parameterDigest.slice(0, 12)}…</Badge>}
                </div>
                {handoff ? (
                  <div className="mt-4 grid gap-5 text-sm md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted">Allowed scope</p>
                      <ul className="mt-2 space-y-1 text-foreground">
                        {handoff.allowedScope.map((item) => <li key={item}>✓ {item}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted">Forbidden scope</p>
                      <ul className="mt-2 space-y-1 text-foreground">
                        {handoff.forbiddenScope.map((item) => <li key={item}>× {item}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted">Acceptance</p>
                      <ul className="mt-2 space-y-1 text-foreground">
                        {handoff.acceptanceCriteria.map((item) => <li key={item}>• {item}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted">Verification</p>
                      <ul className="mt-2 space-y-1 text-foreground">
                        {handoff.verificationPlan.map((item) => <li key={item}>• {item}</li>)}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted">
                    Run <code className="text-foreground">prepare-handoff</code> after the cycle reaches modeled.
                  </p>
                )}
              </section>
            </main>
          )}
        </div>
      )}
    </div>
  );
}

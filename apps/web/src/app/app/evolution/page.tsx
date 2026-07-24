import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import Link from "next/link";
import { basename, dirname, resolve } from "node:path";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  searchParams: Promise<{ cycle?: string }>;
};

type CycleSummary = {
  cycleId: string;
  objective: string;
  stage: string;
  autonomy: string;
  risk: string;
  updatedAt: string;
};

type OpportunityView = {
  recordId: string;
  title: string;
  problem: string;
  smallestExperiment: string;
};

type DecisionView = {
  selectedOpportunityId: string;
  rejectedOpportunityIds: string[];
  rationale: string;
};

type ExperimentView = {
  hypothesis: string;
  method: string;
  successCriteria: string[];
};

type HandoffView = {
  parameterDigest: string;
  allowedScope: string[];
  forbiddenScope: string[];
  acceptanceCriteria: string[];
  verificationPlan: string[];
};

type ResearchRunView = {
  adapter: string;
  outcome: string;
  usage: {
    queries: number;
    sources: number;
    minutes: number;
    costUsd: number;
  };
  coverage: {
    required: string[];
    answered: string[];
    gaps: string[];
  };
  stopReason: string;
};

type ResearchEvaluationView = {
  actor: string;
  verdict: string;
  checks: Array<{ id: string; passed: boolean; summary: string }>;
  unsupportedClaimIds: string[];
  unresolvedContradictionIds: string[];
  limitations: string[];
};

type ResearchView = {
  runs?: ResearchRunView[];
  sources: Array<{ recordId: string }>;
  claims: Array<{ recordId: string }>;
  contradictions: Array<{ recordId: string }>;
  opportunities: OpportunityView[];
  evaluations?: ResearchEvaluationView[];
  decisions: DecisionView[];
  experiments: ExperimentView[];
  executionHandoffs: HandoffView[];
};

type CycleView = {
  cycleId: string;
  objective: string;
  stage: string;
  autonomy: string;
  risk: string;
  history: unknown[];
  artifacts: Record<string, string[]>;
  research?: ResearchView;
};

type StatusOutput = {
  root: string;
  cycles: CycleSummary[];
};

type ShowOutput = {
  cycle: CycleView;
};

const execFileAsync = promisify(execFile);

function repositoryRoot(): string {
  const cwd = process.cwd();
  return basename(cwd) === "web" && basename(dirname(cwd)) === "apps"
    ? resolve(cwd, "../..")
    : cwd;
}

function stateRoot(): string {
  const configuredRoot =
    process.env.CYCLEWARDEN_STATE_ROOT ?? process.env.SHIPKIT_STATE_ROOT;
  if (configuredRoot) return resolve(configuredRoot);

  const canonicalRoot = resolve(repositoryRoot(), ".cyclewarden");
  const legacyRoot = resolve(repositoryRoot(), ".shipkit");
  return existsSync(canonicalRoot) || !existsSync(legacyRoot) ? canonicalRoot : legacyRoot;
}

function cliPath(): string {
  return resolve(
    process.env.CYCLEWARDEN_EVOLUTION_CLI ??
      process.env.SHIPKIT_EVOLUTION_CLI ??
      resolve(repositoryRoot(), "packages/evolution-core/dist/cli.js")
  );
}

async function runCoreCli<T>(args: string[]): Promise<T> {
  const { stdout } = await execFileAsync(process.execPath, [cliPath(), ...args], {
    cwd: repositoryRoot(),
    env: process.env,
    maxBuffer: 4 * 1024 * 1024,
  });
  return JSON.parse(stdout) as T;
}

async function loadWorkspace(selectedCycleId?: string) {
  const root = stateRoot();
  try {
    const status = await runCoreCli<StatusOutput>(["status", "--root", root]);
    const selectedSummary =
      status.cycles.find((cycle) => cycle.cycleId === selectedCycleId) ?? status.cycles[0] ?? null;
    const selected = selectedSummary
      ? (await runCoreCli<ShowOutput>(["show", selectedSummary.cycleId, "--root", root])).cycle
      : null;
    return { root: status.root, summaries: status.cycles, selected, error: null };
  } catch (error) {
    return {
      root,
      summaries: [] as CycleSummary[],
      selected: null as CycleView | null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted">
      {children}
    </span>
  );
}

export default async function EvolutionWorkspacePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const workspace = await loadWorkspace(params.cycle);
  const selected = workspace.selected;
  const research = selected?.research;
  const run = research?.runs?.at(-1) ?? null;
  const evaluation = research?.evaluations?.at(-1) ?? null;
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
            Unified CycleWarden workspace
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">Evolution cycles</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            This server view calls the official Evolution Core CLI. The CLI and web workspace therefore
            share the same journal replay, recovery, policy and cycle state instead of maintaining two
            sources of truth.
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
          Could not load CycleWarden state: {workspace.error}
        </div>
      )}

      {workspace.summaries.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-medium text-foreground">No durable cycle found</h2>
          <p className="mt-2 text-sm text-muted">
            Initialize a cycle, inspect and assess the repository, then run bounded repository research.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-background p-4 text-xs text-muted">
            {`pnpm evolve -- init
pnpm evolve -- start --id cyclewarden:cycle-001 --objective "Choose the next product experiment"
pnpm evolve -- inspect cyclewarden:cycle-001 --project-root .
pnpm evolve -- assess cyclewarden:cycle-001 --project-root .
pnpm evolve -- research-repository cyclewarden:cycle-001 --project-root .`}
          </pre>
        </section>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-3">
            {workspace.summaries.map((cycle) => (
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
                    <Badge>
                      evidence buckets: {Object.values(selected.artifacts).filter((refs) => refs.length).length}
                    </Badge>
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

              <section className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-medium text-foreground">Research run</h3>
                    {run && <Badge>{run.outcome}</Badge>}
                  </div>
                  {run ? (
                    <div className="mt-4 space-y-3 text-sm text-muted">
                      <p>
                        Adapter: <span className="text-foreground">{run.adapter}</span>
                      </p>
                      <p>
                        Usage: {run.usage.queries} queries · {run.usage.sources} sources · {run.usage.minutes}
                        min · ${run.usage.costUsd.toFixed(2)}
                      </p>
                      <p>
                        Coverage: {run.coverage.answered.length}/{run.coverage.required.length} questions
                        answered
                      </p>
                      <p className="text-foreground">Stop reason: {run.stopReason}</p>
                      {run.coverage.gaps.length > 0 && (
                        <p>Remaining gaps: {run.coverage.gaps.join(" · ")}</p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted">No durable research run has been persisted.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-medium text-foreground">Independent research review</h3>
                    {evaluation && <Badge>{evaluation.verdict}</Badge>}
                  </div>
                  {evaluation ? (
                    <div className="mt-4 space-y-3 text-sm text-muted">
                      <p>
                        Reviewer: <span className="text-foreground">{evaluation.actor}</span>
                      </p>
                      <p>
                        Checks: {evaluation.checks.filter((item) => item.passed).length}/
                        {evaluation.checks.length} passed
                      </p>
                      <ul className="space-y-1">
                        {evaluation.checks.map((item) => (
                          <li key={item.id} className={item.passed ? "text-muted" : "text-red-300"}>
                            {item.passed ? "✓" : "×"} {item.id}: {item.summary}
                          </li>
                        ))}
                      </ul>
                      {evaluation.limitations.length > 0 && (
                        <p>Limitations: {evaluation.limitations.join(" · ")}</p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted">No independent review has been persisted.</p>
                  )}
                </div>
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
                        Smallest experiment:{" "}
                        <span className="text-foreground">{opportunity.smallestExperiment}</span>
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
                        Rejected alternatives:{" "}
                        <span className="text-foreground">{decision.rejectedOpportunityIds.length}</span>
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
                        {handoff.allowedScope.map((item) => (
                          <li key={item}>✓ {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted">Forbidden scope</p>
                      <ul className="mt-2 space-y-1 text-foreground">
                        {handoff.forbiddenScope.map((item) => (
                          <li key={item}>× {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted">Acceptance</p>
                      <ul className="mt-2 space-y-1 text-foreground">
                        {handoff.acceptanceCriteria.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted">Verification</p>
                      <ul className="mt-2 space-y-1 text-foreground">
                        {handoff.verificationPlan.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted">
                    Run <code className="text-foreground">research-repository</code> after the cycle reaches
                    modeled.
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

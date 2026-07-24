import "server-only";

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { basename, dirname, parse, resolve } from "node:path";
import { promisify } from "node:util";

export type CycleSummary = {
  cycleId: string;
  objective: string;
  stage: string;
  autonomy: string;
  risk: string;
  updatedAt: string;
};

export type OpportunityView = {
  recordId: string;
  title: string;
  problem: string;
  smallestExperiment: string;
};

export type DecisionView = {
  selectedOpportunityId: string;
  rejectedOpportunityIds: string[];
  rationale: string;
};

export type ExperimentView = {
  hypothesis: string;
  method: string;
  successCriteria: string[];
};

export type HandoffView = {
  parameterDigest: string;
  allowedScope: string[];
  forbiddenScope: string[];
  acceptanceCriteria: string[];
  verificationPlan: string[];
};

export type ResearchRunView = {
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

export type ResearchEvaluationView = {
  actor: string;
  verdict: string;
  checks: Array<{ id: string; passed: boolean; summary: string }>;
  unsupportedClaimIds: string[];
  unresolvedContradictionIds: string[];
  limitations: string[];
};

export type ResearchView = {
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

export type CycleView = {
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
const MAX_CLI_OUTPUT_BYTES = 4 * 1024 * 1024;
const MAX_CLI_RUNTIME_MS = 10 * 60 * 1000;

export function resolveCycleWardenRepositoryRoot(): string {
  const cwd = process.cwd();
  return basename(cwd) === "web" && basename(dirname(cwd)) === "apps"
    ? resolve(cwd, "../..")
    : cwd;
}

export function resolveEvolutionProjectRoot(): string {
  const repositoryRoot = resolveCycleWardenRepositoryRoot();
  return resolve(repositoryRoot, process.env.CYCLEWARDEN_PROJECT_ROOT ?? ".");
}

export function resolveEvolutionStateRoot(): string {
  const repositoryRoot = resolveCycleWardenRepositoryRoot();
  const configuredRoot =
    process.env.CYCLEWARDEN_STATE_ROOT ?? process.env.SHIPKIT_STATE_ROOT;
  if (configuredRoot) return resolve(repositoryRoot, configuredRoot);

  const canonicalRoot = resolve(repositoryRoot, ".cyclewarden");
  const legacyRoot = resolve(repositoryRoot, ".shipkit");
  return existsSync(canonicalRoot) || !existsSync(legacyRoot) ? canonicalRoot : legacyRoot;
}

export async function assertEvolutionProjectRoot(): Promise<string> {
  const requestedRoot = resolveEvolutionProjectRoot();
  let projectRoot: string;
  try {
    projectRoot = await realpath(requestedRoot);
  } catch {
    throw new Error(`Configured project root does not exist: ${requestedRoot}`);
  }
  if (projectRoot === parse(projectRoot).root) {
    throw new Error("CYCLEWARDEN_PROJECT_ROOT may not target a filesystem root");
  }
  const info = await stat(projectRoot);
  if (!info.isDirectory()) {
    throw new Error(`Configured project root is not a directory: ${projectRoot}`);
  }
  return projectRoot;
}

function evolutionCliPath(): string {
  const repositoryRoot = resolveCycleWardenRepositoryRoot();
  return resolve(
    repositoryRoot,
    process.env.CYCLEWARDEN_EVOLUTION_CLI ??
      process.env.SHIPKIT_EVOLUTION_CLI ??
      "packages/evolution-core/dist/cli.js"
  );
}

function cliErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const stderr = "stderr" in error ? String(error.stderr ?? "").trim() : "";
    if (stderr) {
      return stderr.replace(/^cyclewarden-evolve:\s*/i, "").slice(0, 800);
    }
  }
  return (error instanceof Error ? error.message : String(error)).slice(0, 800);
}

export async function runEvolutionCoreCli<T>(args: string[]): Promise<T> {
  try {
    const { stdout } = await execFileAsync(process.execPath, [evolutionCliPath(), ...args], {
      cwd: resolveCycleWardenRepositoryRoot(),
      env: process.env,
      maxBuffer: MAX_CLI_OUTPUT_BYTES,
      timeout: MAX_CLI_RUNTIME_MS,
      windowsHide: true,
    });
    return JSON.parse(stdout) as T;
  } catch (error) {
    throw new Error(cliErrorMessage(error));
  }
}

export async function loadEvolutionWorkspace(selectedCycleId?: string) {
  const root = resolveEvolutionStateRoot();
  try {
    const status = await runEvolutionCoreCli<StatusOutput>(["status", "--root", root]);
    const selectedSummary =
      status.cycles.find((cycle) => cycle.cycleId === selectedCycleId) ??
      status.cycles[0] ??
      null;
    const selected = selectedSummary
      ? (await runEvolutionCoreCli<ShowOutput>([
          "show",
          selectedSummary.cycleId,
          "--root",
          root,
        ])).cycle
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

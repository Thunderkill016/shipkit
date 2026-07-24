#!/usr/bin/env node

import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { EvidenceRegistry } from "./evidence.js";
import { EvolutionStore } from "./persistence.js";
import { authorizeAction } from "./policy.js";
import { resolveDefaultStateRoot } from "./runtime-paths.js";
import {
  preparePublicSearchResearch,
  type PublicSearchRuntime,
} from "./public-search.js";

type CliIo = {
  stdout: (message: string) => void;
  stderr: (message: string) => void;
};

type ParsedArgs = {
  positionals: string[];
  options: Map<string, string[]>;
};

const HELP = `CycleWarden reproducible public search research

Usage:
  cyclewarden-research-search <cycle-id> --manifest public-search.json
    [--root .cyclewarden] [--project-root .]
    [--search-timeout-ms 15000] [--max-search-bytes 524288]
    [--source-timeout-ms 15000] [--max-source-bytes 524288]
    [--actor cyclewarden-search-researcher] [--reviewer cyclewarden-search-reviewer]

The command requires a modeled A1+ cycle. It executes the explicit support and falsification
queries in the manifest through one declared public provider, persists ranked result digests and
timestamps, retrieves only selected results through the bounded public-source capture path, verifies
exact citation spans, and persists either a reviewed planned cycle or a durable inconclusive result.
The current built-in provider searches public GitHub repositories; it is not a general web index.
Manifest files must resolve inside project-root. The command never modifies product code, merges, or
deploys.
`;

function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const options = new Map<string, string[]>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token?.startsWith("--")) {
      if (token) positionals.push(token);
      continue;
    }
    const equal = token.indexOf("=");
    const key = token.slice(2, equal === -1 ? undefined : equal);
    let value = equal === -1 ? undefined : token.slice(equal + 1);
    if (value === undefined && argv[index + 1] && !argv[index + 1]!.startsWith("--")) {
      value = argv[index + 1];
      index += 1;
    }
    const values = options.get(key) ?? [];
    values.push(value ?? "true");
    options.set(key, values);
  }
  return { positionals, options };
}

function one(args: ParsedArgs, key: string): string | undefined {
  return args.options.get(key)?.at(-1);
}

function required(args: ParsedArgs, key: string): string {
  const value = one(args, key)?.trim();
  if (!value) throw new Error(`--${key} is required`);
  return value;
}

function optionalPositiveInteger(args: ParsedArgs, key: string): number | undefined {
  const value = one(args, key);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`--${key} must be a positive integer`);
  }
  return parsed;
}

export async function resolvePublicSearchInputFile(
  projectRoot: string,
  value: string,
  label: string
): Promise<string> {
  const root = await realpath(resolve(projectRoot));
  const requested = isAbsolute(value) ? resolve(value) : resolve(root, value);
  let target: string;
  try {
    target = await realpath(requested);
  } catch (error) {
    throw new Error(
      `cannot resolve ${label} ${requested}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  const offset = relative(root, target);
  if (offset === ".." || offset.startsWith(`..${sep}`) || isAbsolute(offset)) {
    throw new Error(`${label} must resolve inside project-root`);
  }
  return target;
}

async function readJson(path: string, label: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(
      `cannot read ${label} ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function printJson(io: CliIo, value: unknown): void {
  io.stdout(`${JSON.stringify(value, null, 2)}\n`);
}

export async function runPublicSearchCli(
  argv: string[],
  io: CliIo = {
    stdout: (message) => process.stdout.write(message),
    stderr: (message) => process.stderr.write(message),
  },
  runtime: PublicSearchRuntime = {}
): Promise<number> {
  const parsed = parseArgs(argv);
  if (parsed.options.has("help") || parsed.positionals[0] === "help") {
    io.stdout(HELP);
    return 0;
  }

  const cycleId = parsed.positionals[0];
  if (!cycleId) throw new Error("public search research requires a cycle ID");
  const explicitRoot = one(parsed, "root");
  const root = explicitRoot ? resolve(explicitRoot) : resolveDefaultStateRoot();
  const projectRoot = resolve(one(parsed, "project-root") ?? process.cwd());
  const store = new EvolutionStore(root);
  const previous = await store.load(cycleId);
  if (previous.stage !== "modeled") {
    throw new Error(`public search research requires a modeled cycle; current stage is ${previous.stage}`);
  }
  const authorization = authorizeAction({
    autonomy: previous.autonomy,
    risk: previous.risk,
    action: "research",
    cycleId: previous.cycleId,
    requiredScope: `cycle:${previous.cycleId}:research`,
    approvals: previous.approvals,
  });
  if (!authorization.allowed) throw new Error(authorization.reason);

  const manifestPath = await resolvePublicSearchInputFile(
    projectRoot,
    required(parsed, "manifest"),
    "public search manifest"
  );
  const manifest = await readJson(manifestPath, "public search manifest");
  const registry = new EvidenceRegistry(root, projectRoot);
  const manifestEvidence = await registry.registerJson("public-search-manifest", manifest);
  const prepared = await preparePublicSearchResearch(previous, manifest, {
    actor: one(parsed, "actor")?.trim() || "cyclewarden-search-researcher",
    reviewerActor: one(parsed, "reviewer")?.trim() || "cyclewarden-search-reviewer",
    registry,
    manifestEvidenceRef: `evidence:${manifestEvidence.occurrenceId}`,
    startedAt: new Date().toISOString(),
    searchTimeoutMs: optionalPositiveInteger(parsed, "search-timeout-ms"),
    maxSearchBytes: optionalPositiveInteger(parsed, "max-search-bytes"),
    sourceTimeoutMs: optionalPositiveInteger(parsed, "source-timeout-ms"),
    maxSourceBytes: optionalPositiveInteger(parsed, "max-source-bytes"),
    runtime,
  });

  const diagnosed = await store.save(previous, prepared.diagnosed);
  if (prepared.outcome === "inconclusive") {
    const cycle = await store.save(diagnosed, prepared.inconclusive);
    printJson(io, {
      authorization,
      outcome: prepared.outcome,
      reason: prepared.reason,
      manifestEvidence,
      searchResponses: prepared.searchResponses,
      selectedResults: prepared.selectedResults,
      run: prepared.run,
      evaluation: prepared.evaluation,
      citationSpans: prepared.citationSpans,
      sources: prepared.records?.sources ?? [],
      cycle,
    });
    return 0;
  }

  const researched = await store.save(diagnosed, prepared.researched);
  const decided = await store.save(researched, prepared.decided);
  const cycle = await store.save(decided, prepared.planned);
  printJson(io, {
    authorization,
    outcome: prepared.outcome,
    manifestEvidence,
    searchResponses: prepared.searchResponses,
    selectedResults: prepared.selectedResults,
    run: prepared.run,
    evaluation: prepared.evaluation,
    citationSpans: prepared.citationSpans,
    records: prepared.records,
    executionHandoff: prepared.records.executionHandoff,
    cycle,
  });
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPublicSearchCli(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      process.stderr.write(
        `cyclewarden-research-search: ${error instanceof Error ? error.message : String(error)}\n`
      );
      process.exitCode = 1;
    }
  );
}

#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { EvidenceRegistry } from "./evidence.js";
import { EvolutionStore } from "./persistence.js";
import { authorizeAction } from "./policy.js";
import {
  preparePublicSourceResearch,
  type PublicResearchRuntime,
} from "./public-research.js";

type CliIo = {
  stdout: (message: string) => void;
  stderr: (message: string) => void;
};

type ParsedArgs = {
  positionals: string[];
  options: Map<string, string[]>;
};

const HELP = `Shipkit public-source research

Usage:
  shipkit-research-public <cycle-id> --manifest public-research.json
    [--root .shipkit] [--project-root .]
    [--timeout-ms 15000] [--max-source-bytes 524288]
    [--actor shipkit-public-researcher] [--reviewer shipkit-citation-reviewer]

The command requires a modeled A1+ cycle. It retrieves only explicit HTTP(S) URLs from the
manifest, blocks private-network destinations and unsafe redirects, stores normalized source text,
verifies exact quote spans, quarantines hostile instruction-like content, and persists either a
reviewed planned cycle or an explicit inconclusive result. It does not search the wider web.
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

function printJson(io: CliIo, value: unknown): void {
  io.stdout(`${JSON.stringify(value, null, 2)}\n`);
}

export async function runPublicResearchCli(
  argv: string[],
  io: CliIo = {
    stdout: (message) => process.stdout.write(message),
    stderr: (message) => process.stderr.write(message),
  },
  runtime: PublicResearchRuntime = {}
): Promise<number> {
  const parsed = parseArgs(argv);
  if (parsed.options.has("help") || parsed.positionals[0] === "help") {
    io.stdout(HELP);
    return 0;
  }

  const cycleId = parsed.positionals[0];
  if (!cycleId) throw new Error("public research requires a cycle ID");
  const root = resolve(one(parsed, "root") ?? ".shipkit");
  const projectRoot = resolve(one(parsed, "project-root") ?? process.cwd());
  const store = new EvolutionStore(root);
  const previous = await store.load(cycleId);
  if (previous.stage !== "modeled") {
    throw new Error(`public research requires a modeled cycle; current stage is ${previous.stage}`);
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

  const manifestPath = resolve(required(parsed, "manifest"));
  let manifest: unknown;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    throw new Error(
      `cannot read public research manifest ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const registry = new EvidenceRegistry(root, projectRoot);
  const manifestEvidence = await registry.registerJson("public-research-manifest", manifest);
  const prepared = await preparePublicSourceResearch(previous, manifest, {
    actor: one(parsed, "actor")?.trim() || "shipkit-public-researcher",
    reviewerActor: one(parsed, "reviewer")?.trim() || "shipkit-citation-reviewer",
    registry,
    manifestEvidenceRef: `evidence:${manifestEvidence.occurrenceId}`,
    startedAt: new Date().toISOString(),
    timeoutMs: optionalPositiveInteger(parsed, "timeout-ms"),
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
      run: prepared.run,
      evaluation: prepared.evaluation,
      citationSpans: prepared.citationSpans,
      sources: prepared.records.sources,
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
  runPublicResearchCli(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      process.stderr.write(
        `shipkit-research-public: ${error instanceof Error ? error.message : String(error)}\n`
      );
      process.exitCode = 1;
    }
  );
}

#!/usr/bin/env node

import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { prepareCandidateResearch } from "./candidate-research.js";
import { EvidenceRegistry } from "./evidence.js";
import { EvolutionStore } from "./persistence.js";
import { authorizeAction } from "./policy.js";

type CliIo = {
  stdout: (message: string) => void;
  stderr: (message: string) => void;
};

type ParsedArgs = {
  positionals: string[];
  options: Map<string, string[]>;
};

const HELP = `Shipkit named-candidate research

Usage:
  shipkit-research-candidates <cycle-id> --manifest candidate-decision.json
    [--capabilities docs/CAPABILITIES.json] [--root .shipkit] [--project-root .]
    [--actor shipkit-candidate-researcher] [--reviewer shipkit-candidate-reviewer]

The command requires a modeled A1+ cycle. It compares only the explicitly named candidates in the
manifest. Every candidate must link issue, roadmap, current capability and implementation evidence.
Capability statements are regenerated from the supplied current registry; stale expectations, missing
coverage or a tied score produce a durable inconclusive result. Manifest and capability files must
resolve inside project-root; traversal and symlink escape fail closed. The command does not search the
web, call a model, modify product code, merge or deploy.
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

export async function resolveCandidateInputFile(
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

export async function runCandidateResearchCli(
  argv: string[],
  io: CliIo = {
    stdout: (message) => process.stdout.write(message),
    stderr: (message) => process.stderr.write(message),
  }
): Promise<number> {
  const parsed = parseArgs(argv);
  if (parsed.options.has("help") || parsed.positionals[0] === "help") {
    io.stdout(HELP);
    return 0;
  }

  const cycleId = parsed.positionals[0];
  if (!cycleId) throw new Error("candidate research requires a cycle ID");
  const root = resolve(one(parsed, "root") ?? ".shipkit");
  const projectRoot = resolve(one(parsed, "project-root") ?? process.cwd());
  const store = new EvolutionStore(root);
  const previous = await store.load(cycleId);
  if (previous.stage !== "modeled") {
    throw new Error(`candidate research requires a modeled cycle; current stage is ${previous.stage}`);
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

  const manifestPath = await resolveCandidateInputFile(
    projectRoot,
    required(parsed, "manifest"),
    "candidate manifest"
  );
  const capabilitiesPath = await resolveCandidateInputFile(
    projectRoot,
    one(parsed, "capabilities")?.trim() || "docs/CAPABILITIES.json",
    "capability registry"
  );
  const manifest = await readJson(manifestPath, "candidate manifest");
  const capabilities = await readJson(capabilitiesPath, "capability registry");

  const registry = new EvidenceRegistry(root, projectRoot);
  const manifestEvidence = await registry.registerJson("candidate-decision-manifest", manifest);
  const capabilitiesEvidence = await registry.registerJson("capability-registry-snapshot", capabilities);
  const prepared = prepareCandidateResearch(previous, manifest, capabilities, {
    actor: one(parsed, "actor")?.trim() || "shipkit-candidate-researcher",
    reviewerActor: one(parsed, "reviewer")?.trim() || "shipkit-candidate-reviewer",
    startedAt: new Date().toISOString(),
    evidenceRefs: {
      manifest: `evidence:${manifestEvidence.occurrenceId}`,
      capabilities: `evidence:${capabilitiesEvidence.occurrenceId}`,
    },
  });

  const diagnosed = await store.save(previous, prepared.diagnosed);
  if (prepared.outcome === "inconclusive") {
    const cycle = await store.save(diagnosed, prepared.inconclusive);
    printJson(io, {
      authorization,
      outcome: prepared.outcome,
      reason: prepared.reason,
      evidence: { manifest: manifestEvidence, capabilities: capabilitiesEvidence },
      run: prepared.run,
      evaluation: prepared.evaluation,
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
    evidence: { manifest: manifestEvidence, capabilities: capabilitiesEvidence },
    scores: prepared.scores,
    run: prepared.run,
    evaluation: prepared.evaluation,
    records: prepared.records,
    executionHandoff: prepared.records.executionHandoff,
    cycle,
  });
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCandidateResearchCli(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      process.stderr.write(
        `shipkit-research-candidates: ${error instanceof Error ? error.message : String(error)}\n`
      );
      process.exitCode = 1;
    }
  );
}

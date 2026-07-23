#!/usr/bin/env node

import { basename, resolve } from "node:path";
import { runDiscoveredChecks } from "./check-runner.js";
import { EvidenceRegistry } from "./evidence.js";
import { EvolutionStore } from "./persistence.js";
import { authorizeAction } from "./policy.js";
import { inspectRepository } from "./repository.js";
import { createProjectScorecard } from "./scorecard.js";
import { createCycle, transitionCycle } from "./state-machine.js";
import {
  AUTONOMY_LEVELS,
  EVOLUTION_ACTIONS,
  EVOLUTION_STAGES,
  RISK_CLASSES,
  type ArtifactBucket,
  type AutonomyLevel,
  type EvolutionAction,
  type EvolutionApproval,
  type EvolutionStage,
  type RiskClass,
} from "./types.js";

type CliIo = {
  stdout: (message: string) => void;
  stderr: (message: string) => void;
};

type ParsedArgs = {
  positionals: string[];
  options: Map<string, string[]>;
};

const HELP = `Shipkit Evolution Engine

Usage:
  shipkit-evolve init [--root .shipkit]
  shipkit-evolve start --objective "..." [--id repo:cycle] [--autonomy A2] [--risk R1]
  shipkit-evolve inspect [cycle-id] [--project-root .] [--actor shipkit-inspector]
  shipkit-evolve assess <cycle-id> [--project-root .] [--check test]...
    [--timeout-ms 120000] [--max-output-bytes 65536] [--actor shipkit-assessor]
  shipkit-evolve status [--root .shipkit]
  shipkit-evolve show <cycle-id> [--root .shipkit]
  shipkit-evolve resume <cycle-id> [--root .shipkit]
  shipkit-evolve advance <cycle-id> --to <stage> --actor <name> --reason "..."
    [--artifact bucket=reference]...
    [--approval action|approved-by|scope]...
    [--verification-passed]

The CLI never calls a model, merges, deploys, reads secrets, or writes production by itself.
Repository checks are selected only from discovered package scripts and run in temporary source copies.
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

function parseArtifacts(values: string[]): Partial<Record<ArtifactBucket, string[]>> {
  const result: Partial<Record<ArtifactBucket, string[]>> = {};
  const allowed = new Set<ArtifactBucket>([
    "baseline",
    "model",
    "diagnosis",
    "research",
    "candidates",
    "decision",
    "plan",
    "rollback",
    "changes",
    "verification",
    "measurement",
    "memory",
    "metaChanges",
  ]);

  for (const value of values) {
    const separator = value.indexOf("=");
    if (separator <= 0 || separator === value.length - 1) {
      throw new Error(`invalid --artifact value: ${value}; expected bucket=reference`);
    }
    const bucket = value.slice(0, separator) as ArtifactBucket;
    const reference = value.slice(separator + 1).trim();
    if (!allowed.has(bucket)) throw new Error(`unknown artifact bucket: ${bucket}`);
    result[bucket] = [...(result[bucket] ?? []), reference];
  }
  return result;
}

function parseApprovals(values: string[]): EvolutionApproval[] {
  return values.map((value) => {
    const [action, approvedBy, ...scopeParts] = value.split("|");
    const scope = scopeParts.join("|").trim();
    if (!EVOLUTION_ACTIONS.includes(action as EvolutionAction) || !approvedBy?.trim() || !scope) {
      throw new Error(
        `invalid --approval value: ${value}; expected action|approved-by|scope`
      );
    }
    return {
      action: action as EvolutionAction,
      approvedBy: approvedBy.trim(),
      approvedAt: new Date().toISOString(),
      scope,
    };
  });
}

function rootFrom(args: ParsedArgs): string {
  return resolve(one(args, "root") ?? ".shipkit");
}

function projectRootFrom(args: ParsedArgs): string {
  return resolve(one(args, "project-root") ?? process.cwd());
}

function printJson(io: CliIo, value: unknown): void {
  io.stdout(`${JSON.stringify(value, null, 2)}\n`);
}

export async function runEvolutionCli(
  argv: string[],
  io: CliIo = {
    stdout: (message) => process.stdout.write(message),
    stderr: (message) => process.stderr.write(message),
  }
): Promise<number> {
  const parsed = parseArgs(argv);
  const command = parsed.positionals[0];

  if (!command || command === "help" || parsed.options.has("help")) {
    io.stdout(HELP);
    return 0;
  }

  const store = new EvolutionStore(rootFrom(parsed));

  if (command === "init") {
    const configPath = await store.initializeProject(projectRootFrom(parsed));
    printJson(io, { initialized: true, root: store.rootDir, configPath });
    return 0;
  }

  if (command === "start") {
    const autonomy = (one(parsed, "autonomy") ?? "A2") as AutonomyLevel;
    const risk = (one(parsed, "risk") ?? "R1") as RiskClass;
    if (!AUTONOMY_LEVELS.includes(autonomy)) throw new Error(`invalid autonomy: ${autonomy}`);
    if (!RISK_CLASSES.includes(risk)) throw new Error(`invalid risk: ${risk}`);

    const project = basename(projectRootFrom(parsed)).replace(/[^A-Za-z0-9._-]/g, "-") || "project";
    const defaultId = `${project}:${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
    const cycle = createCycle({
      cycleId: one(parsed, "id") ?? defaultId,
      objective: required(parsed, "objective"),
      autonomy,
      risk,
    });
    await store.create(cycle);
    printJson(io, cycle);
    return 0;
  }

  if (command === "inspect") {
    const projectRoot = projectRootFrom(parsed);
    const snapshot = await inspectRepository(projectRoot);
    const evidence = await new EvidenceRegistry(store.rootDir, projectRoot).registerJson(
      "project-snapshot",
      snapshot
    );
    const cycleId = parsed.positionals[1];
    let cycle = null;
    if (cycleId) {
      const previous = await store.load(cycleId);
      const next = transitionCycle(previous, "observed", {
        actor: one(parsed, "actor")?.trim() || "shipkit-inspector",
        reason: "Captured repository structure, checks, product signals, and trust boundaries",
        addArtifacts: { baseline: [`evidence:${evidence.id}`] },
      });
      cycle = await store.save(previous, next);
    }
    printJson(io, { evidence, snapshot, cycle });
    return 0;
  }

  if (command === "assess") {
    const cycleId = parsed.positionals[1];
    if (!cycleId) throw new Error("assess requires a cycle ID");
    const previous = await store.load(cycleId);
    if (previous.stage !== "observed") {
      throw new Error(`assess requires an observed cycle; current stage is ${previous.stage}`);
    }
    const authorization = authorizeAction({
      autonomy: previous.autonomy,
      risk: previous.risk,
      action: "run-checks",
      approvals: previous.approvals,
    });
    if (!authorization.allowed) throw new Error(authorization.reason);

    const projectRoot = projectRootFrom(parsed);
    const snapshot = await inspectRepository(projectRoot);
    const checkReport = await runDiscoveredChecks(snapshot, {
      projectRoot,
      checkNames: parsed.options.get("check") ?? [],
      timeoutMs: optionalPositiveInteger(parsed, "timeout-ms"),
      maxOutputBytes: optionalPositiveInteger(parsed, "max-output-bytes"),
    });
    const scorecard = createProjectScorecard(snapshot, checkReport);
    const registry = new EvidenceRegistry(store.rootDir, projectRoot);
    const snapshotEvidence = await registry.registerJson("project-snapshot", snapshot);
    const checkEvidence = await registry.registerJson("check-report", checkReport);
    const scorecardEvidence = await registry.registerJson("project-scorecard", scorecard);
    const next = transitionCycle(previous, "modeled", {
      actor: one(parsed, "actor")?.trim() || "shipkit-assessor",
      reason: "Built a repository model from isolated checks and an evidence-backed scorecard",
      addArtifacts: {
        baseline: [`evidence:${snapshotEvidence.id}`, `evidence:${checkEvidence.id}`],
        model: [`evidence:${scorecardEvidence.id}`],
      },
    });
    const cycle = await store.save(previous, next);
    printJson(io, {
      authorization,
      evidence: {
        snapshot: snapshotEvidence,
        checks: checkEvidence,
        scorecard: scorecardEvidence,
      },
      snapshot,
      checkReport,
      scorecard,
      cycle,
    });
    return 0;
  }

  if (command === "status") {
    printJson(io, { root: store.rootDir, cycles: await store.list() });
    return 0;
  }

  if (command === "show" || command === "resume") {
    const cycleId = parsed.positionals[1];
    if (!cycleId) throw new Error(`${command} requires a cycle ID`);
    const cycle = await store.load(cycleId);
    printJson(io, { recovered: command === "resume", cycle });
    return 0;
  }

  if (command === "advance") {
    const cycleId = parsed.positionals[1];
    if (!cycleId) throw new Error("advance requires a cycle ID");
    const to = required(parsed, "to") as EvolutionStage;
    if (!EVOLUTION_STAGES.includes(to)) throw new Error(`invalid stage: ${to}`);

    const previous = await store.load(cycleId);
    const next = transitionCycle(previous, to, {
      actor: required(parsed, "actor"),
      reason: required(parsed, "reason"),
      addArtifacts: parseArtifacts(parsed.options.get("artifact") ?? []),
      approvals: parseApprovals(parsed.options.get("approval") ?? []),
      verificationPassed: one(parsed, "verification-passed") === "true",
    });
    await store.save(previous, next);
    printJson(io, next);
    return 0;
  }

  throw new Error(`unknown command: ${command}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runEvolutionCli(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      process.stderr.write(`shipkit-evolve: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    }
  );
}

#!/usr/bin/env node

import { resolve } from "node:path";
import { executeDelivery, showDelivery, verifyDelivery } from "./delivery.js";
import { publishDelivery } from "./delivery-publish.js";
import { EvolutionStore } from "./persistence.js";
import { resolveDefaultStateRoot } from "./runtime-paths.js";

type CliIo = {
  stdout: (message: string) => void;
  stderr: (message: string) => void;
};

type ParsedArgs = {
  positionals: string[];
  options: Map<string, string[]>;
};

const HELP = `CycleWarden governed delivery

Usage:
  cyclewarden-deliver execute <cycle-id> --manifest delivery.json
    [--root .cyclewarden] [--project-root .] [--actor cyclewarden-implementer]
    --trusted-repository
  cyclewarden-deliver verify <cycle-id>
    [--root .cyclewarden] [--project-root .] [--actor cyclewarden-independent-verifier]
  cyclewarden-deliver publish <cycle-id> --base main
    [--root .cyclewarden] [--project-root .] [--actor cyclewarden-publisher]
    [--remote origin] [--title "Draft PR title"] --confirm-push-and-draft-pr
  cyclewarden-deliver show <cycle-id> [--root .cyclewarden]

execute requires a planned A3/A4 cycle and a manifest whose expectedParameterDigest matches the
latest persisted ExecutionHandoff. It creates an isolated git worktree and branch, runs one command
without a shell, and rejects changes outside allowedScope or inside enforceable forbiddenScope.

verify requires a different actor. It reruns the manifest verification commands without a shell,
rejects patch drift, and creates a local commit only after every check passes.

publish requires an accepted verified commit, an explicit confirmation flag, an authenticated GitHub CLI,
and a github.com remote. It performs a non-force push, verifies the remote ref, and opens an open draft PR.
This CLI never merges, deploys, writes production, or accepts implementation output without an independent verifier.
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

function rootFrom(args: ParsedArgs): string {
  const root = one(args, "root");
  return root ? resolve(root) : resolveDefaultStateRoot();
}

function projectRootFrom(args: ParsedArgs): string {
  return resolve(one(args, "project-root") ?? process.cwd());
}

function printJson(io: CliIo, value: unknown): void {
  io.stdout(`${JSON.stringify(value, null, 2)}\n`);
}

export async function runDeliveryCli(
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
  const cycleId = parsed.positionals[1];
  if (!cycleId) throw new Error(`${command} requires a cycle ID`);
  const store = new EvolutionStore(rootFrom(parsed));

  if (command === "execute") {
    const result = await executeDelivery({
      store,
      cycleId,
      projectRoot: projectRootFrom(parsed),
      manifestPath: resolve(required(parsed, "manifest")),
      actor: one(parsed, "actor")?.trim() || "cyclewarden-implementer",
      trustedRepository: one(parsed, "trusted-repository") === "true",
    });
    printJson(io, result);
    return 0;
  }

  if (command === "verify") {
    const result = await verifyDelivery({
      store,
      cycleId,
      projectRoot: projectRootFrom(parsed),
      actor: one(parsed, "actor")?.trim() || "cyclewarden-independent-verifier",
    });
    printJson(io, result);
    return 0;
  }

  if (command === "publish") {
    const result = await publishDelivery({
      store,
      cycleId,
      projectRoot: projectRootFrom(parsed),
      actor: one(parsed, "actor")?.trim() || "cyclewarden-publisher",
      remoteName: one(parsed, "remote")?.trim() || "origin",
      baseBranch: required(parsed, "base"),
      title: one(parsed, "title")?.trim() || undefined,
      confirmPushAndDraftPr: one(parsed, "confirm-push-and-draft-pr") === "true",
    });
    printJson(io, result);
    return 0;
  }

  if (command === "show") {
    printJson(io, await showDelivery(store, cycleId));
    return 0;
  }

  throw new Error(`unknown delivery command: ${command}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runDeliveryCli(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      process.stderr.write(
        `cyclewarden-deliver: ${error instanceof Error ? error.message : String(error)}\n`
      );
      process.exitCode = 1;
    }
  );
}

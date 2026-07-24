#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { executeDelivery, publishDelivery, verifyDelivery } from "./delivery-api.js";
import { showDelivery } from "./delivery.js";
import { showDeliveryPublication } from "./delivery-publish.js";
import { recoverDelivery, showDeliveryRecovery } from "./delivery-recovery.js";
import {
  reconcileDeliveryOperation,
  showDeliveryOperation,
} from "./delivery-operation.js";
import {
  requestDeliveryCancellation,
  showDeliveryCancellation,
} from "./delivery-cancel.js";
import { showDeliveryProgress } from "./delivery-progress.js";
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
  cyclewarden-deliver publish <cycle-id> --draft-pr
    [--root .cyclewarden] [--project-root .] [--actor cyclewarden-publisher]
    [--remote origin] [--hostname github.com] [--base main]
    [--title "Draft PR title"] [--body-file draft-pr.md]
  cyclewarden-deliver recover <cycle-id>
    [--root .cyclewarden] [--project-root .] [--actor cyclewarden-recovery-operator]
    [--apply]
  cyclewarden-deliver operation <cycle-id>
    [--root .cyclewarden] [--project-root .] [--actor cyclewarden-recovery-operator]
    [--apply]
  cyclewarden-deliver cancel <cycle-id> --operation-id <exact-operation-id>
    [--root .cyclewarden] [--project-root .] [--actor cyclewarden-cancellation-operator]
    [--apply]
  cyclewarden-deliver progress <cycle-id> [--root .cyclewarden]
  cyclewarden-deliver show <cycle-id> [--root .cyclewarden]

execute requires a planned A3/A4 cycle and a manifest whose expectedParameterDigest matches the
latest persisted ExecutionHandoff. It creates an isolated git worktree and branch, runs one command
without a shell, and rejects changes outside allowedScope or inside enforceable forbiddenScope.

verify requires a different actor. It reruns the manifest verification commands without a shell,
rejects patch drift, and creates a local commit only after every check passes.

publish requires a verified cycle and the explicit --draft-pr opt-in. It checks GitHub CLI
availability and authentication before pushing the exact verified commit, then opens a draft PR.
It never merges, deploys, writes production, or accepts implementation output without an
independent verifier.

execute, verify and publish use the same lease-protected public API exported by the package. Direct
library callers and the CLI therefore share write-ahead checkpoints, overlap prevention, stale
operation recovery and an integrity-chained append-only progress timeline.

recover inspects cycle, control-sidecar, branch and worktree state. It is read-only by default.
Use --apply only after reviewing the proposed transition. Recovery never treats an unrecorded
commit as accepted verification and never reruns implementation, merges or deploys.

operation inspects the write-ahead checkpoint, owner PID, child PID and lock. It clears a stale
lease only with --apply and only when the integrity-valid local owner and child are both dead.

cancel is read-only by default. With --apply it records a durable cancellation intent and sends
SIGTERM only to the exact integrity-valid active child process group on the current host. The
operation ID, heartbeat and process start identity are rechecked immediately before signalling.
Cancellation never escalates to SIGKILL, merges, deploys or writes production.

progress reads the integrity-chained append-only timeline without requiring delivery control state.
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

function terminalDeliveryOperation(store: EvolutionStore, cycleId: string) {
  const inspection = showDeliveryOperation(store, cycleId).deliveryOperation;
  if (!inspection.record || inspection.record.status === "running") {
    throw new Error("delivery operation did not persist a terminal checkpoint");
  }
  return inspection.record;
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
    const projectRoot = projectRootFrom(parsed);
    const actor = one(parsed, "actor")?.trim() || "cyclewarden-implementer";
    const result = await executeDelivery({
      store,
      cycleId,
      projectRoot,
      manifestPath: resolve(required(parsed, "manifest")),
      actor,
      trustedRepository: one(parsed, "trusted-repository") === "true",
    });
    printJson(io, { ...result, deliveryOperation: terminalDeliveryOperation(store, cycleId) });
    return 0;
  }

  if (command === "verify") {
    const projectRoot = projectRootFrom(parsed);
    const actor = one(parsed, "actor")?.trim() || "cyclewarden-independent-verifier";
    const result = await verifyDelivery({ store, cycleId, projectRoot, actor });
    printJson(io, { ...result, deliveryOperation: terminalDeliveryOperation(store, cycleId) });
    return 0;
  }

  if (command === "publish") {
    const bodyFile = one(parsed, "body-file")?.trim();
    const projectRoot = projectRootFrom(parsed);
    const actor = one(parsed, "actor")?.trim() || "cyclewarden-publisher";
    const result = await publishDelivery({
      store,
      cycleId,
      projectRoot,
      actor,
      draftPr: one(parsed, "draft-pr") === "true",
      remote: one(parsed, "remote")?.trim() || "origin",
      hostname: one(parsed, "hostname")?.trim(),
      baseBranch: one(parsed, "base")?.trim(),
      title: one(parsed, "title")?.trim(),
      body: bodyFile ? await readFile(resolve(bodyFile), "utf8") : undefined,
    });
    printJson(io, { ...result, deliveryOperation: terminalDeliveryOperation(store, cycleId) });
    return 0;
  }

  if (command === "recover") {
    const result = await recoverDelivery({
      store,
      cycleId,
      projectRoot: projectRootFrom(parsed),
      actor: one(parsed, "actor")?.trim() || "cyclewarden-recovery-operator",
      apply: one(parsed, "apply") === "true",
    });
    printJson(io, result);
    return 0;
  }

  if (command === "operation") {
    const result = await reconcileDeliveryOperation({
      store,
      cycleId,
      projectRoot: projectRootFrom(parsed),
      actor: one(parsed, "actor")?.trim() || "cyclewarden-recovery-operator",
      apply: one(parsed, "apply") === "true",
    });
    printJson(io, result);
    return 0;
  }

  if (command === "cancel") {
    const result = await requestDeliveryCancellation({
      store,
      cycleId,
      projectRoot: projectRootFrom(parsed),
      actor: one(parsed, "actor")?.trim() || "cyclewarden-cancellation-operator",
      expectedOperationId: required(parsed, "operation-id"),
      apply: one(parsed, "apply") === "true",
    });
    printJson(io, result);
    return 0;
  }

  if (command === "progress") {
    printJson(io, showDeliveryProgress(store, cycleId));
    return 0;
  }

  if (command === "show") {
    printJson(io, {
      ...(await showDelivery(store, cycleId)),
      ...(await showDeliveryPublication(store, cycleId)),
      ...(await showDeliveryRecovery(store, cycleId)),
      ...showDeliveryOperation(store, cycleId),
      ...showDeliveryCancellation(store, cycleId),
      ...showDeliveryProgress(store, cycleId),
    });
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

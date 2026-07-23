#!/usr/bin/env node

import { resolve } from "node:path";
import { createCheckExecutionBackend, runDiscoveredChecks } from "./check-runner.js";
import { inspectRepository } from "./repository.js";

export type SandboxCliIo = {
  stdout: (message: string) => void;
  stderr: (message: string) => void;
};

type ParsedArgs = {
  options: Map<string, string[]>;
};

const HELP = `Shipkit Sandbox Check

Usage:
  shipkit-sandbox-check --project-root . --backend trusted-local \
    --acknowledge-trusted-repository --check test [--check build]

  shipkit-sandbox-check --project-root . --backend docker \
    --docker-image sha256:<64-hex> --check test

Options:
  --project-root <path>                 Repository root. Defaults to the current directory.
  --backend trusted-local|docker        Required. No implicit execution backend is selected.
  --acknowledge-trusted-repository      Required for trusted-local execution.
  --docker-image <immutable-digest>     Required for Docker execution.
  --check <name>                        Repeatable discovered package-script name.
  --timeout-ms <positive-integer>       Per-check timeout.
  --max-output-bytes <positive-integer> Per-stream output limit.

The trusted-local backend is not a security sandbox. Docker execution fails closed when the
immutable image is unavailable locally or any required isolation capability cannot be proved.
`;

function parseArgs(argv: string[]): ParsedArgs {
  const options = new Map<string, string[]>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token?.startsWith("--")) {
      throw new Error(`unexpected positional argument: ${token ?? ""}`);
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
  return { options };
}

function one(parsed: ParsedArgs, key: string): string | undefined {
  return parsed.options.get(key)?.at(-1);
}

function optionalPositiveInteger(parsed: ParsedArgs, key: string): number | undefined {
  const raw = one(parsed, key);
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`--${key} must be a positive integer`);
  }
  return value;
}

function selectedBackend(parsed: ParsedArgs) {
  const kind = one(parsed, "backend");
  if (kind !== "trusted-local" && kind !== "docker") {
    throw new Error("--backend is required and must be trusted-local or docker");
  }

  const acknowledged = one(parsed, "acknowledge-trusted-repository") === "true";
  const dockerImage = one(parsed, "docker-image")?.trim();
  if (kind === "trusted-local") {
    if (!acknowledged) {
      throw new Error(
        "trusted-local execution requires --acknowledge-trusted-repository because it is not a security sandbox"
      );
    }
    if (dockerImage) throw new Error("--docker-image is only valid with --backend docker");
  } else {
    if (acknowledged) {
      throw new Error("--acknowledge-trusted-repository is not valid with --backend docker");
    }
    if (!dockerImage) throw new Error("--docker-image is required with --backend docker");
  }

  return createCheckExecutionBackend(kind, dockerImage ? { dockerImage } : {});
}

export async function runSandboxCli(
  argv: string[],
  io: SandboxCliIo = {
    stdout: (message) => process.stdout.write(message),
    stderr: (message) => process.stderr.write(message),
  }
): Promise<number> {
  const parsed = parseArgs(argv);
  if (parsed.options.has("help")) {
    io.stdout(HELP);
    return 0;
  }

  const backend = selectedBackend(parsed);
  const projectRoot = resolve(one(parsed, "project-root") ?? process.cwd());
  const snapshot = await inspectRepository(projectRoot);
  const report = await runDiscoveredChecks(snapshot, {
    projectRoot,
    checkNames: parsed.options.get("check") ?? [],
    timeoutMs: optionalPositiveInteger(parsed, "timeout-ms"),
    maxOutputBytes: optionalPositiveInteger(parsed, "max-output-bytes"),
    backend,
  });

  io.stdout(
    `${JSON.stringify(
      {
        backend: {
          id: backend.id,
          trust: backend.trust,
          capabilities: backend.capabilities,
        },
        repository: {
          projectName: snapshot.projectName,
          projectRoot,
          commit: snapshot.git.commit,
          dirty: snapshot.git.dirty,
        },
        report,
      },
      null,
      2
    )}\n`
  );
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSandboxCli(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      process.stderr.write(
        `shipkit-sandbox-check: ${error instanceof Error ? error.message : String(error)}\n`
      );
      process.exitCode = 1;
    }
  );
}

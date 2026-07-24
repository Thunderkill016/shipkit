#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const deliveryPath = "packages/evolution-core/src/delivery.ts";
let source = await readFile(deliveryPath, "utf8");

function replaceOnce(before, after, label) {
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`missing replacement marker: ${label}`);
  if (source.indexOf(before, index + before.length) >= 0) {
    throw new Error(`replacement marker is not unique: ${label}`);
  }
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

replaceOnce(
  `async function runBoundedCommand(
  worktreePath: string,
  spec: DeliveryCommandSpec
): Promise<ExecutionBackendResult> {
  const backend = new TrustedLocalExecutionBackend();
  await backend.assertAvailable();
  return await backend.execute({
    workspaceRoot: worktreePath,
    relativeWorkingDirectory: spec.relativeWorkingDirectory ?? ".",`,
  `async function containedCommandWorkingDirectory(
  worktreePath: string,
  relativeWorkingDirectory: string
): Promise<string> {
  const root = await realpath(resolve(worktreePath));
  const requested = resolve(root, relativeWorkingDirectory || ".");
  let workingDirectory: string;
  try {
    workingDirectory = await realpath(requested);
  } catch (error) {
    throw new DeliveryError(
      \`command working directory does not exist: \${relativeWorkingDirectory}; \${
        error instanceof Error ? error.message : String(error)
      }\`
    );
  }
  const offset = relative(root, workingDirectory);
  if (offset === ".." || offset.startsWith(\`..\${sep}\`) || isAbsolute(offset)) {
    throw new DeliveryError("command working directory resolves outside the delivery worktree");
  }
  return offset || ".";
}

async function runBoundedCommand(
  worktreePath: string,
  spec: DeliveryCommandSpec
): Promise<ExecutionBackendResult> {
  const relativeWorkingDirectory = await containedCommandWorkingDirectory(
    worktreePath,
    spec.relativeWorkingDirectory ?? "."
  );
  const backend = new TrustedLocalExecutionBackend();
  await backend.assertAvailable();
  return await backend.execute({
    workspaceRoot: worktreePath,
    relativeWorkingDirectory,`,
  "canonical command working directory"
);

replaceOnce(
  `function executionStatus(
  result: ExecutionBackendResult,
  changedFiles: string[],
  violations: string[]
): DeliveryExecutionStatus {
  if (violations.length > 0) return "failed";
  if (result.status === "passed" && changedFiles.length > 0) return "implemented";
  if (result.status === "unavailable" || result.status === "timed-out" || changedFiles.length === 0) {
    return "inconclusive";
  }
  return "failed";
}`,
  `function executionStatus(
  result: ExecutionBackendResult,
  changedFiles: string[],
  violations: string[]
): DeliveryExecutionStatus {
  if (violations.length > 0 || result.status === "failed") return "failed";
  if (result.status === "unavailable" || result.status === "timed-out") return "inconclusive";
  if (result.status === "passed" && changedFiles.length > 0) return "implemented";
  return "inconclusive";
}`,
  "failed command classification"
);

replaceOnce(
  `  let result: ExecutionBackendResult;
  try {
    result = await runBoundedCommand(worktreePath, manifest.command);
  } catch (error) {
    result = {
      status: "unavailable",
      exitCode: null,
      signal: null,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      stdoutTruncated: false,
      stderrTruncated: false,
    };
  }
  let changedFiles: string[] = [];
  let implementationPatchDigest = sha256("");
  let violations: string[] = [];`,
  `  let result: ExecutionBackendResult;
  let commandBoundaryError: string | null = null;
  try {
    result = await runBoundedCommand(worktreePath, manifest.command);
  } catch (error) {
    commandBoundaryError = error instanceof Error ? error.message : String(error);
    result = {
      status: "failed",
      exitCode: null,
      signal: null,
      stdout: "",
      stderr: commandBoundaryError,
      stdoutTruncated: false,
      stderrTruncated: false,
    };
  }
  let changedFiles: string[] = [];
  let implementationPatchDigest = sha256("");
  let violations: string[] = commandBoundaryError ? [commandBoundaryError] : [];`,
  "command boundary failure evidence"
);

replaceOnce(
  `    changedFiles = await listChangedFiles(worktreePath);
    violations = scopeViolations(changedFiles, handoff.allowedScope, handoff.forbiddenScope);
    implementationPatchDigest = await patchDigest(worktreePath, changedFiles);`,
  `    changedFiles = await listChangedFiles(worktreePath);
    violations.push(...scopeViolations(changedFiles, handoff.allowedScope, handoff.forbiddenScope));
    violations = [...new Set(violations)];
    implementationPatchDigest = await patchDigest(worktreePath, changedFiles);`,
  "preserve command boundary violations"
);

replaceOnce(
  `      } catch (error) {
        result = {
          status: "unavailable",
          exitCode: null,
          signal: null,
          stdout: "",
          stderr: error instanceof Error ? error.message : String(error),
          stdoutTruncated: false,
          stderrTruncated: false,
        };
      }
      checks.push(checkRecord(spec, result));`,
  `      } catch (error) {
        const boundaryFailure = error instanceof DeliveryError;
        result = {
          status: boundaryFailure ? "failed" : "unavailable",
          exitCode: null,
          signal: null,
          stdout: "",
          stderr: error instanceof Error ? error.message : String(error),
          stdoutTruncated: false,
          stderrTruncated: false,
        };
      }
      checks.push(checkRecord(spec, result));`,
  "verification cwd boundary classification"
);

await writeFile(deliveryPath, source, "utf8");
console.log("Applied command working-directory and failed-status hardening.");

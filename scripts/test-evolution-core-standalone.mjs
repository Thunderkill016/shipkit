#!/usr/bin/env node

import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePackageRoot = join(repositoryRoot, "packages", "evolution-core");
const temporaryRoot = await mkdtemp(join(tmpdir(), "shipkit-evolution-core-standalone-"));
const isolatedPackageRoot = join(temporaryRoot, "package");
const tarballDirectory = join(temporaryRoot, "tarballs");
const consumerRoot = join(temporaryRoot, "consumer");
const diagnosticsPath = join(
  repositoryRoot,
  "artifacts",
  `evolution-core-standalone-diagnostics-node-${process.versions.node}.json`
);
const commands = [];

async function persistDiagnostics(error = null) {
  await mkdir(dirname(diagnosticsPath), { recursive: true });
  await writeFile(
    diagnosticsPath,
    `${JSON.stringify(
      {
        node: process.version,
        platform: process.platform,
        packageRoot: sourcePackageRoot,
        commands,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : error === null
              ? null
              : { message: String(error) },
      },
      null,
      2
    )}\n`,
    "utf8"
  );
}

async function run(executable, args, cwd) {
  const command = { executable, args, cwd, status: "running" };
  commands.push(command);
  try {
    const result = await execFileAsync(executable, args, {
      cwd,
      env: {
        ...process.env,
        CI: "true",
        npm_config_audit: "false",
        npm_config_fund: "false",
        npm_config_update_notifier: "false",
      },
      maxBuffer: 20 * 1024 * 1024,
    });
    Object.assign(command, {
      status: "passed",
      stdout: result.stdout,
      stderr: result.stderr,
    });
    return result;
  } catch (error) {
    Object.assign(command, {
      status: "failed",
      code: error?.code ?? null,
      signal: error?.signal ?? null,
      stdout: error?.stdout ?? "",
      stderr: error?.stderr ?? "",
      message: error instanceof Error ? error.message : String(error),
    });
    await persistDiagnostics(error);
    throw new Error(
      `standalone command failed: ${executable} ${args.join(" ")}\nstdout:\n${command.stdout || "<empty>"}\nstderr:\n${command.stderr || "<empty>"}`,
      { cause: error }
    );
  }
}

function copyFilter(source) {
  const offset = relative(sourcePackageRoot, source);
  if (!offset) return true;
  const firstSegment = offset.split(sep)[0];
  return firstSegment !== "node_modules" && firstSegment !== "dist";
}

try {
  await cp(sourcePackageRoot, isolatedPackageRoot, {
    recursive: true,
    filter: copyFilter,
  });

  const copiedPackage = JSON.parse(
    await readFile(join(isolatedPackageRoot, "package.json"), "utf8")
  );
  if (copiedPackage.scripts?.typecheck?.includes("apps/web")) {
    throw new Error("standalone package still delegates typecheck to apps/web");
  }
  if (copiedPackage.scripts?.build?.includes("apps/web")) {
    throw new Error("standalone package still delegates build to apps/web");
  }
  if (copiedPackage.scripts?.test?.includes("apps/web")) {
    throw new Error("standalone package still delegates tests to apps/web");
  }

  await run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], isolatedPackageRoot);
  await run("npm", ["run", "typecheck"], isolatedPackageRoot);
  await run("npm", ["test"], isolatedPackageRoot);

  await mkdir(tarballDirectory, { recursive: true });
  const packed = await run(
    "npm",
    ["pack", "--json", "--pack-destination", tarballDirectory],
    isolatedPackageRoot
  );
  const packResult = JSON.parse(packed.stdout);
  const tarballName = packResult[0]?.filename;
  if (!tarballName) throw new Error("npm pack did not return a tarball filename");
  const tarballPath = join(tarballDirectory, basename(tarballName));

  await mkdir(consumerRoot, { recursive: true });
  await writeFile(
    join(consumerRoot, "package.json"),
    `${JSON.stringify({ name: "shipkit-evolution-core-consumer", private: true, type: "module" }, null, 2)}\n`,
    "utf8"
  );
  await run(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarballPath],
    consumerRoot
  );

  await run(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      'const core = await import("@shipkit/evolution-core"); if (typeof core.createCycle !== "function") throw new Error("createCycle export missing");',
    ],
    consumerRoot
  );

  const binary = join(
    consumerRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "shipkit-evolve.cmd" : "shipkit-evolve"
  );
  const help = await run(binary, ["--help"], consumerRoot);
  if (!help.stdout.includes("Shipkit Evolution Engine")) {
    throw new Error("installed shipkit-evolve binary did not return expected help output");
  }

  const candidateBinary = join(
    consumerRoot,
    "node_modules",
    ".bin",
    process.platform === "win32"
      ? "shipkit-research-candidates.cmd"
      : "shipkit-research-candidates"
  );
  const candidateHelp = await run(candidateBinary, ["--help"], consumerRoot);
  if (!candidateHelp.stdout.includes("Shipkit named-candidate research")) {
    throw new Error(
      "installed shipkit-research-candidates binary did not return expected help output"
    );
  }

  await persistDiagnostics();
  process.stdout.write(
    `${JSON.stringify(
      {
        package: copiedPackage.name,
        version: copiedPackage.version,
        node: process.version,
        isolatedFromWeb: true,
        typecheck: "passed",
        tests: "passed",
        pack: "passed",
        consumerImport: "passed",
        consumerCli: "passed",
        consumerCandidateCli: "passed",
      },
      null,
      2
    )}\n`
  );
} catch (error) {
  await persistDiagnostics(error);
  throw error;
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

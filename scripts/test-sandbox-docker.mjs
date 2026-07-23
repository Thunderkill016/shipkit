#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const shipkitRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(shipkitRoot, "packages/evolution-core/dist/sandbox-cli.js");
const image = process.env.SHIPKIT_SANDBOX_IMAGE?.trim();
if (!image || !/^sha256:[a-f0-9]{64}$/i.test(image)) {
  throw new Error("SHIPKIT_SANDBOX_IMAGE must contain an explicitly pulled immutable local image ID");
}

const temporary = await mkdtemp(join(tmpdir(), "shipkit-docker-hostile-"));
const projectRoot = join(temporary, "project");
const hostSentinel = join(temporary, "host-sentinel.txt");

function command(executable, args, options = {}) {
  const result = spawnSync(executable, args, {
    cwd: options.cwd ?? shipkitRoot,
    encoding: "utf8",
    env: options.env ?? process.env,
    timeout: options.timeout ?? 120_000,
  });
  if (result.status !== 0) {
    throw new Error(
      `${executable} ${args.join(" ")} failed:\n${result.stderr || result.stdout || "no output"}`
    );
  }
  return result.stdout;
}

try {
  await mkdir(projectRoot, { recursive: true });
  await writeFile(hostSentinel, "host-original\n", "utf8");
  await writeFile(join(projectRoot, ".env"), "SHIPKIT_HOST_SECRET=source-secret\n", "utf8");
  await symlink(hostSentinel, join(projectRoot, "outside-link"));
  await writeFile(
    join(projectRoot, "package.json"),
    `${JSON.stringify(
      {
        name: "shipkit-hostile-sandbox-fixture",
        private: true,
        scripts: { test: "node hostile.mjs" },
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  const hostileSource = `
import { existsSync, writeFileSync } from "node:fs";
import { createConnection } from "node:net";

const failures = [];
if (process.env.SHIPKIT_HOST_SECRET !== undefined) failures.push("host secret inherited");
if (existsSync("/workspace/.env")) failures.push("credential file copied");
if (existsSync("/workspace/outside-link")) failures.push("external symlink copied");

try {
  writeFileSync("/etc/shipkit-hostile-write", "escape");
  failures.push("read-only root write succeeded");
} catch {}

try {
  writeFileSync(${JSON.stringify(hostSentinel)}, "host-overwritten");
  failures.push("host path write succeeded");
} catch {}

const networkBlocked = await new Promise((resolve) => {
  const socket = createConnection({ host: "1.1.1.1", port: 80 });
  const timer = setTimeout(() => {
    socket.destroy();
    resolve(true);
  }, 1000);
  socket.once("connect", () => {
    clearTimeout(timer);
    socket.destroy();
    resolve(false);
  });
  socket.once("error", () => {
    clearTimeout(timer);
    resolve(true);
  });
});
if (!networkBlocked) failures.push("network egress succeeded");

writeFileSync("sandbox-created.txt", "workspace-only");
if (failures.length > 0) {
  process.stderr.write(JSON.stringify({ failures }) + "\\n");
  process.exit(1);
}
process.stdout.write(JSON.stringify({
  secretIsolated: true,
  credentialFilesExcluded: true,
  symlinkExcluded: true,
  rootReadOnly: true,
  hostPathContained: true,
  networkBlocked: true,
  workspaceWritable: true
}) + "\\n");
`;
  await writeFile(join(projectRoot, "hostile.mjs"), hostileSource.trimStart(), "utf8");

  const output = command(
    process.execPath,
    [
      cli,
      "--project-root",
      projectRoot,
      "--backend",
      "docker",
      "--docker-image",
      image,
      "--check",
      "test",
      "--timeout-ms",
      "30000",
      "--max-output-bytes",
      "65536",
    ],
    {
      env: {
        ...process.env,
        SHIPKIT_HOST_SECRET: "must-never-enter-the-container",
      },
      timeout: 60_000,
    }
  );
  const result = JSON.parse(output);
  const check = result.report?.results?.[0];
  if (result.backend?.id !== "docker" || result.backend?.trust !== "untrusted") {
    throw new Error("sandbox CLI did not select the Docker untrusted backend");
  }
  if (check?.status !== "passed") {
    throw new Error(`hostile sandbox fixture did not pass: ${check?.stderr ?? "missing result"}`);
  }
  if (check?.isolation?.networkIsolation !== "blocked") {
    throw new Error("check evidence did not record blocked network isolation");
  }
  if (check?.isolation?.dependencyAccess !== "none") {
    throw new Error("untrusted workspace unexpectedly received host dependency access");
  }
  const proof = JSON.parse(check.stdout.trim());
  for (const [key, value] of Object.entries(proof)) {
    if (value !== true) throw new Error(`hostile sandbox assertion failed: ${key}`);
  }
  if ((await readFile(hostSentinel, "utf8")) !== "host-original\n") {
    throw new Error("sandbox modified the host sentinel");
  }

  const remaining = command("docker", [
    "ps",
    "-a",
    "--filter",
    "name=shipkit-check-",
    "--format",
    "{{.Names}}",
  ]).trim();
  if (remaining) throw new Error(`sandbox container cleanup failed: ${remaining}`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        image,
        backend: result.backend,
        isolation: check.isolation,
        proof,
      },
      null,
      2
    )
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}

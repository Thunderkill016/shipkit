import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  DockerExecutionBackend,
  ExecutionBackendError,
  TrustedLocalExecutionBackend,
  UNTRUSTED_CHECK_BASELINE_CAPABILITIES,
  assertExecutionCapabilities,
  buildDockerRunArguments,
} from "./execution-backend.js";

const temporaryRoots: string[] = [];
const IMMUTABLE_IMAGE = `sha256:${"a".repeat(64)}`;

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("execution backend contract", () => {
  it("fails closed when a backend cannot satisfy the requested capabilities", () => {
    expect(() =>
      assertExecutionCapabilities(new TrustedLocalExecutionBackend(), ["filesystem-containment"])
    ).toThrow(ExecutionBackendError);
  });

  it("requires an explicit immutable Docker image reference", () => {
    expect(() => new DockerExecutionBackend()).toThrow(/immutable image digest/);
    expect(() => new DockerExecutionBackend({ image: "node:22-bookworm-slim" })).toThrow(
      /immutable image digest/
    );
  });

  it("rejects mutable images even when building a Docker invocation directly", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "shipkit-docker-mutable-"));
    temporaryRoots.push(workspaceRoot);
    expect(() =>
      buildDockerRunArguments({
        containerName: "shipkit-check-mutable",
        image: "node:22-bookworm-slim",
        workspaceRoot,
        relativeWorkingDirectory: ".",
        executable: "node",
        arguments: ["--version"],
        environment: { CI: "true" },
        limits: { timeoutMs: 5_000, maxOutputBytes: 4_096 },
      })
    ).toThrow(/immutable image digest/);
  });

  it("rejects a working directory that escapes the copied workspace", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "shipkit-docker-traversal-"));
    temporaryRoots.push(workspaceRoot);
    expect(() =>
      buildDockerRunArguments({
        containerName: "shipkit-check-traversal",
        image: IMMUTABLE_IMAGE,
        workspaceRoot,
        relativeWorkingDirectory: "../host",
        executable: "node",
        arguments: ["--version"],
        environment: { CI: "true" },
        limits: { timeoutMs: 5_000, maxOutputBytes: 4_096 },
      })
    ).toThrow(/escapes the sandbox workspace/);
  });

  it("declares the Docker untrusted baseline without claiming a hard disk quota", () => {
    const backend = new DockerExecutionBackend({
      image: IMMUTABLE_IMAGE,
      probe: async () => true,
    });
    expect(backend.capabilities).toEqual(UNTRUSTED_CHECK_BASELINE_CAPABILITIES);
    expect(backend.capabilities).not.toContain("disk-limit");
  });

  it("builds a fail-closed Docker invocation without inheriting protected host variables", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "shipkit-docker-args-"));
    temporaryRoots.push(workspaceRoot);
    const args = buildDockerRunArguments({
      containerName: "shipkit-check-test",
      image: IMMUTABLE_IMAGE,
      workspaceRoot,
      relativeWorkingDirectory: ".",
      executable: "npm",
      arguments: ["run", "test", "--silent"],
      environment: {
        CI: "true",
        NO_COLOR: "1",
        GITHUB_TOKEN: "must-not-cross",
      },
      limits: {
        timeoutMs: 10_000,
        maxOutputBytes: 65_536,
        cpus: 1,
        memoryMb: 256,
        processLimit: 32,
      },
    });
    const serialized = args.join(" ");

    expect(serialized).toContain("--pull never");
    expect(serialized).toContain("--network none");
    expect(serialized).toContain("--read-only");
    expect(serialized).toContain("--cap-drop ALL");
    expect(serialized).toContain("--security-opt no-new-privileges");
    expect(serialized).toContain("--pids-limit 32");
    expect(serialized).toContain("--memory 256m");
    expect(serialized).toContain("--cpus 1");
    expect(serialized).toContain("CI=true");
    expect(serialized).not.toContain("must-not-cross");
    expect(args).toContain(IMMUTABLE_IMAGE);
  });

  it("runs trusted-local commands with an explicit environment instead of inheriting secrets", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "shipkit-local-backend-"));
    temporaryRoots.push(workspaceRoot);
    const previous = process.env.SHIPKIT_BACKEND_TEST_SECRET;
    process.env.SHIPKIT_BACKEND_TEST_SECRET = "do-not-inherit";
    try {
      const result = await new TrustedLocalExecutionBackend().execute({
        workspaceRoot,
        relativeWorkingDirectory: ".",
        executable: process.execPath,
        arguments: [
          "-e",
          "process.stdout.write(String(process.env.SHIPKIT_BACKEND_TEST_SECRET))",
        ],
        environment: { CI: "true" },
        limits: { timeoutMs: 5_000, maxOutputBytes: 4_096 },
      });
      expect(result.status).toBe("passed");
      expect(result.stdout).toBe("undefined");
    } finally {
      if (previous === undefined) delete process.env.SHIPKIT_BACKEND_TEST_SECRET;
      else process.env.SHIPKIT_BACKEND_TEST_SECRET = previous;
    }
  });
});

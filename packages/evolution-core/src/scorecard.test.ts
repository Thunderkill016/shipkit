import { describe, expect, it } from "vitest";
import type { CheckReport } from "./check-runner.js";
import type { ProjectSnapshot } from "./repository.js";
import { createProjectScorecard } from "./scorecard.js";

function snapshot(overrides: Partial<ProjectSnapshot> = {}): ProjectSnapshot {
  return {
    schemaVersion: 1,
    projectName: "sample-project",
    scannedAt: "2026-07-23T00:00:00.000Z",
    git: { detected: true, branch: "main", commit: "abc123", dirty: false },
    packageManagers: ["npm"],
    manifests: [
      {
        path: "package.json",
        kind: "package.json",
        name: "sample-project",
        workspaces: [],
        scripts: { test: "node test.js" },
      },
    ],
    languages: [{ name: "JavaScript", files: 2 }],
    checks: [{ name: "test", command: "node test.js", source: "package.json" }],
    ci: [".github/workflows/ci.yml"],
    documentation: ["README.md"],
    sourceDirectories: ["src"],
    testDirectories: ["test"],
    productSignals: ["PRODUCT.md"],
    trustBoundaries: [
      {
        kind: "deployment",
        evidencePaths: [".github/workflows/ci.yml"],
        reason: "Deployment boundary",
      },
    ],
    inventory: { filesObserved: 12, truncated: false, ignoredDirectories: [] },
    ...overrides,
  };
}

function report(status: "passed" | "failed" = "passed"): CheckReport {
  return {
    schemaVersion: 1,
    projectName: "sample-project",
    projectRoot: "/tmp/sample-project",
    createdAt: "2026-07-23T00:01:00.000Z",
    requestedChecks: ["test"],
    discoveredChecks: 1,
    selectedChecks: [{ name: "test", source: "package.json" }],
    results: [
      {
        schemaVersion: 1,
        name: "test",
        source: "package.json",
        declaredCommand: "node test.js",
        invocation: {
          executable: "npm",
          arguments: ["run", "test"],
          workingDirectory: ".",
          shell: false,
        },
        status,
        exitCode: status === "passed" ? 0 : 1,
        signal: null,
        startedAt: "2026-07-23T00:00:00.000Z",
        finishedAt: "2026-07-23T00:00:01.000Z",
        durationMs: 1000,
        timeoutMs: 120000,
        stdout: "",
        stderr: "",
        stdoutTruncated: false,
        stderrTruncated: false,
        isolation: {
          sourceWorkspace: "temporary-copy",
          dependencyAccess: "none",
          dependencyInstall: false,
          networkIsolation: "not-enforced",
        },
      },
    ],
    summary: {
      passed: status === "passed" ? 1 : 0,
      failed: status === "failed" ? 1 : 0,
      timedOut: 0,
      unavailable: 0,
    },
    limitations: [],
  };
}

describe("project scorecard", () => {
  it("marks an observable green baseline as research-ready but trusted-local-only for execution", () => {
    const result = createProjectScorecard(snapshot(), report(), {
      now: "2026-07-23T00:02:00.000Z",
    });

    expect(result.readiness).toBe("ready-for-research");
    expect(result.researchReadiness).toBe("ready-for-research");
    expect(result.executionReadiness).toBe("trusted-local-only");
    expect(result.verificationReadiness).toBe("ready");
    expect(result.autonomyCeiling).toBe("A2");
    expect(result.evidenceConfidence).toBe("high");
    expect(result.blockers).toEqual([]);
    expect(result.dimensions.find((item) => item.id === "verification")?.status).toBe("pass");
    expect(result.limitations.join(" ")).toMatch(/not a security sandbox/);
  });

  it("blocks broad conclusions and execution when coverage is truncated or checks fail", () => {
    const result = createProjectScorecard(
      snapshot({ inventory: { filesObserved: 20_000, truncated: true, ignoredDirectories: [] } }),
      report("failed")
    );

    expect(result.readiness).toBe("blocked");
    expect(result.researchReadiness).toBe("blocked");
    expect(result.executionReadiness).toBe("blocked");
    expect(result.verificationReadiness).toBe("blocked");
    expect(result.autonomyCeiling).toBe("A0");
    expect(result.blockers.length).toBeGreaterThan(0);
    expect(result.nextActions.join(" ")).toMatch(/Diagnose failed checks|Increase the scan limit/);
  });
});
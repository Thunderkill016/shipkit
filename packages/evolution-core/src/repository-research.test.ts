import { describe, expect, it } from "vitest";
import {
  createCycle,
  createProjectScorecard,
  evaluatePreparedResearch,
  prepareRepositoryResearch,
  transitionCycle,
  type CheckReport,
  type EvolutionCycle,
  type PreparedResearchHandoff,
  type ProjectSnapshot,
} from "./index.js";

function modeledCycle(): EvolutionCycle {
  let cycle = createCycle({
    cycleId: "repository:research-001",
    objective: "Choose the next evidence-backed product experiment",
    autonomy: "A2",
    risk: "R1",
    now: "2026-07-23T08:00:00.000Z",
  });
  cycle = transitionCycle(cycle, "observed", {
    actor: "inspector",
    reason: "captured repository baseline",
    now: "2026-07-23T08:01:00.000Z",
    addArtifacts: { baseline: ["evidence:baseline"] },
  });
  return transitionCycle(cycle, "modeled", {
    actor: "assessor",
    reason: "created repository scorecard",
    now: "2026-07-23T08:02:00.000Z",
    addArtifacts: { model: ["evidence:model"] },
  });
}

function snapshot(overrides: Partial<ProjectSnapshot["inventory"]> = {}): ProjectSnapshot {
  return {
    schemaVersion: 1,
    projectName: "sample-product",
    scannedAt: "2026-07-23T08:03:00.000Z",
    git: {
      detected: true,
      branch: "main",
      commit: "0123456789abcdef0123456789abcdef01234567",
      dirty: false,
    },
    packageManagers: ["pnpm"],
    manifests: [
      {
        path: "package.json",
        kind: "package.json",
        name: "sample-product",
        version: "1.0.0",
        workspaces: [],
        scripts: { test: "vitest run" },
      },
    ],
    languages: [{ name: "TypeScript", files: 12 }],
    checks: [{ name: "test", command: "vitest run", source: "package.json" }],
    ci: [".github/workflows/ci.yml"],
    documentation: ["README.md", "ROADMAP.md"],
    sourceDirectories: ["src"],
    testDirectories: ["src"],
    productSignals: ["ROADMAP.md"],
    trustBoundaries: [
      {
        kind: "authentication",
        evidencePaths: ["src/auth.ts"],
        reason: "Authentication changes affect identity behavior.",
      },
    ],
    inventory: {
      filesObserved: 24,
      truncated: false,
      ignoredDirectories: ["node_modules"],
      ...overrides,
    },
  };
}

function checkReport(): CheckReport {
  return {
    schemaVersion: 1,
    projectName: "sample-product",
    projectRoot: "/tmp/sample-product",
    createdAt: "2026-07-23T08:04:00.000Z",
    requestedChecks: [],
    discoveredChecks: 1,
    selectedChecks: [{ name: "test", source: "package.json" }],
    results: [
      {
        schemaVersion: 1,
        name: "test",
        source: "package.json",
        declaredCommand: "vitest run",
        invocation: {
          executable: "pnpm",
          arguments: ["test"],
          workingDirectory: ".",
          shell: false,
        },
        status: "passed",
        exitCode: 0,
        signal: null,
        startedAt: "2026-07-23T08:04:00.000Z",
        finishedAt: "2026-07-23T08:04:01.000Z",
        durationMs: 1000,
        timeoutMs: 120000,
        stdout: "ok",
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
    summary: { passed: 1, failed: 0, timedOut: 0, unavailable: 0 },
    limitations: ["Temporary workspace is not a security sandbox."],
  };
}

const evidenceRefs = {
  snapshot: "evidence:snapshot",
  checks: "evidence:checks",
  scorecard: "evidence:scorecard",
};

describe("repository single-worker research", () => {
  it("creates a reviewed repository-grounded decision and handoff", () => {
    const repositorySnapshot = snapshot();
    const scorecard = createProjectScorecard(repositorySnapshot, checkReport(), {
      now: "2026-07-23T08:05:00.000Z",
    });
    const prepared = prepareRepositoryResearch(modeledCycle(), repositorySnapshot, scorecard, {
      actor: "repository-researcher",
      reviewerActor: "independent-reviewer",
      now: "2026-07-23T08:06:00.000Z",
      startedAt: "2026-07-23T08:05:30.000Z",
      evidenceRefs,
    });

    expect(prepared.outcome).toBe("completed");
    if (prepared.outcome !== "completed") throw new Error("expected completed research");
    expect(prepared.planned.stage).toBe("planned");
    expect(prepared.run.adapter).toBe("repository-single-worker");
    expect(prepared.run.usage).toMatchObject({ queries: 5, sources: 3, costUsd: 0 });
    expect(prepared.evaluation.verdict).toBe("pass");
    expect(prepared.evaluation.actor).toBe("independent-reviewer");
    expect(prepared.planned.research?.runs).toHaveLength(1);
    expect(prepared.planned.research?.evaluations).toHaveLength(1);
    expect(prepared.planned.research?.opportunities).toHaveLength(3);
    expect(prepared.records.claims.some((claim) => claim.claimType === "user-problem")).toBe(false);
    expect(prepared.records.executionHandoff.parameterDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(
      prepared.records.claims.some((claim) =>
        claim.statement.includes("This repository assessment used the trusted-local path")
      )
    ).toBe(true);
    expect(
      prepared.records.claims.some((claim) => claim.statement.includes("verified Docker sandbox baseline"))
    ).toBe(true);
    expect(
      prepared.records.claims.some((claim) => claim.statement.includes("future sandbox backend"))
    ).toBe(false);
  });

  it("returns a durable inconclusive result when the query budget cannot cover the plan", () => {
    const repositorySnapshot = snapshot();
    const scorecard = createProjectScorecard(repositorySnapshot, checkReport());
    const prepared = prepareRepositoryResearch(modeledCycle(), repositorySnapshot, scorecard, {
      actor: "repository-researcher",
      reviewerActor: "independent-reviewer",
      now: "2026-07-23T08:06:00.000Z",
      budget: { maxQueries: 2 },
      evidenceRefs,
    });

    expect(prepared.outcome).toBe("inconclusive");
    if (prepared.outcome !== "inconclusive") throw new Error("expected inconclusive research");
    expect(prepared.inconclusive.stage).toBe("inconclusive");
    expect(prepared.run.outcome).toBe("inconclusive");
    expect(prepared.evaluation.verdict).toBe("inconclusive");
    expect(prepared.reason).toMatch(/coverage map/);
  });

  it("rejects unsupported user-problem claims during independent review", () => {
    const repositorySnapshot = snapshot();
    const scorecard = createProjectScorecard(repositorySnapshot, checkReport());
    const completed = prepareRepositoryResearch(modeledCycle(), repositorySnapshot, scorecard, {
      actor: "repository-researcher",
      reviewerActor: "independent-reviewer",
      now: "2026-07-23T08:06:00.000Z",
      evidenceRefs,
    });
    if (completed.outcome !== "completed") throw new Error("expected completed research");

    const claims = completed.records.claims.map((claim, index) =>
      index === 0 ? { ...claim, claimType: "user-problem" as const } : claim
    );
    const prepared = {
      diagnosed: completed.diagnosed,
      researched: completed.researched,
      decided: completed.decided,
      planned: completed.planned,
      records: { ...completed.records, claims },
    } satisfies PreparedResearchHandoff;
    const evaluation = evaluatePreparedResearch(prepared, {
      reviewerActor: "second-independent-reviewer",
      now: "2026-07-23T08:07:00.000Z",
      evidenceRefs: Object.values(evidenceRefs),
      run: completed.run,
    });

    expect(evaluation.verdict).toBe("revise");
    expect(evaluation.unsupportedClaimIds).toContain(claims[0]?.recordId);
    expect(evaluation.checks.find((item) => item.id === "user-evidence")?.passed).toBe(false);
  });

  it("requires reviewer and researcher actor separation", () => {
    const repositorySnapshot = snapshot();
    const scorecard = createProjectScorecard(repositorySnapshot, checkReport());
    expect(() =>
      prepareRepositoryResearch(modeledCycle(), repositorySnapshot, scorecard, {
        actor: "same-actor",
        reviewerActor: "same-actor",
        evidenceRefs,
      })
    ).toThrow(/must differ/);
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { normalizeDeliveryWorkspace } from "./delivery-workspace";

describe("delivery workspace normalization", () => {
  it("maps durable delivery and lease records into a bounded web view", () => {
    const view = normalizeDeliveryWorkspace(
      "cycle:fixture",
      {
        branchName: "cyclewarden/cycle-fixture",
        worktreeId: "worktree-fixture",
        execution: {
          status: "implemented",
          actor: "implementer",
          commandStatus: "passed",
          completedAt: "2026-07-24T00:00:00.000Z",
          changedFiles: ["src/feature.ts"],
          scopeViolations: [],
        },
        verification: {
          verdict: "accepted",
          verifierActor: "verifier",
          completedAt: "2026-07-24T00:01:00.000Z",
          commitSha: "abc123",
          checks: [{ id: "test", status: "passed" }],
          unresolvedRisks: [],
        },
        publication: {
          status: "published",
          completedAt: "2026-07-24T00:02:00.000Z",
          draftPrUrl: "https://github.com/example/repo/pull/1",
          unresolvedRisks: [],
          steps: { push: "passed", draftPr: "passed" },
        },
      },
      {
        inspection: {
          controlStatus: "valid",
          disposition: "healthy",
          lockPresent: false,
          ownerState: "dead",
          childState: "not-recorded",
          findings: [],
          record: {
            operationId: "operation:fixture",
            operation: "publish",
            actor: "publisher",
            status: "completed",
            startedAt: "2026-07-24T00:01:30.000Z",
            heartbeatAt: "2026-07-24T00:02:00.000Z",
            completedAt: "2026-07-24T00:02:00.000Z",
          },
        },
      }
    );

    expect(view.execution?.changedFiles).toEqual(["src/feature.ts"]);
    expect(view.verification?.verdict).toBe("accepted");
    expect(view.publication?.steps).toEqual({ push: "passed", draftPr: "passed" });
    expect(view.operation.disposition).toBe("healthy");
    expect(view.operation.record?.operation).toBe("publish");
  });

  it("fails soft when optional delivery records are absent or malformed", () => {
    const view = normalizeDeliveryWorkspace(
      "cycle:empty",
      { execution: "invalid", verification: null, publication: [] },
      {
        inspection: {
          controlStatus: "missing",
          disposition: "healthy",
          lockPresent: false,
          findings: ["ignored", 7],
        },
      }
    );

    expect(view.execution).toBeNull();
    expect(view.verification).toBeNull();
    expect(view.publication).toBeNull();
    expect(view.operation.controlStatus).toBe("missing");
    expect(view.operation.ownerState).toBe("not-recorded");
    expect(view.operation.findings).toEqual(["ignored"]);
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { normalizeDeliveryWorkspace } from "./delivery-workspace";

describe("delivery workspace progress normalization", () => {
  it("maps integrity-checked progress events into the bounded web view", () => {
    const view = normalizeDeliveryWorkspace(
      "cycle:progress",
      {
        deliveryProgress: {
          controlStatus: "valid",
          truncated: false,
          findings: [],
          latest: {
            operationId: "operation:progress",
          },
          activeStep: {
            stepIndex: 2,
            stepId: "typecheck",
            childPid: 4321,
          },
          events: [
            {
              eventId: "progress:1",
              sequence: 1,
              operationId: "operation:progress",
              operation: "verify",
              occurredAt: "2026-07-24T00:00:00.000Z",
              phase: "operation-started",
              status: "running",
              stepIndex: null,
              stepId: null,
              childPid: null,
              executable: null,
              exitCode: null,
              signal: null,
            },
            {
              eventId: "progress:2",
              sequence: 2,
              operationId: "operation:progress",
              operation: "verify",
              occurredAt: "2026-07-24T00:00:01.000Z",
              phase: "step-started",
              status: "running",
              stepIndex: 2,
              stepId: "typecheck",
              childPid: 4321,
              executable: null,
              exitCode: null,
              signal: null,
            },
          ],
        },
      },
      {
        inspection: {
          controlStatus: "valid",
          disposition: "active",
          lockPresent: true,
          ownerState: "alive",
          childState: "alive",
          findings: [],
          record: {
            operationId: "operation:progress",
            operation: "verify",
            actor: "verifier",
            status: "running",
            startedAt: "2026-07-24T00:00:00.000Z",
            heartbeatAt: "2026-07-24T00:00:01.000Z",
            completedAt: null,
          },
        },
      }
    );

    expect(view.progress.controlStatus).toBe("valid");
    expect(view.progress.latestOperationId).toBe("operation:progress");
    expect(view.progress.activeStep).toEqual({
      stepIndex: 2,
      stepId: "typecheck",
      childPid: 4321,
    });
    expect(view.progress.events).toHaveLength(2);
    expect(view.progress.events[1]).toMatchObject({
      phase: "step-started",
      status: "running",
      stepId: "typecheck",
      childPid: 4321,
    });
  });

  it("fails soft when progress payloads are missing or malformed", () => {
    const view = normalizeDeliveryWorkspace(
      "cycle:empty-progress",
      {
        deliveryProgress: {
          controlStatus: "invalid",
          truncated: "no",
          findings: ["digest chain mismatch", 7],
          events: [null, "invalid", { sequence: "bad" }],
        },
      },
      {
        inspection: {
          controlStatus: "missing",
          disposition: "healthy",
          lockPresent: false,
          findings: [],
        },
      }
    );

    expect(view.progress.controlStatus).toBe("invalid");
    expect(view.progress.events).toEqual([]);
    expect(view.progress.findings).toEqual(["digest chain mismatch"]);
    expect(view.progress.activeStep).toBeNull();
  });
});

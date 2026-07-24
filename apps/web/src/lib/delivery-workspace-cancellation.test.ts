import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { normalizeDeliveryWorkspace } from "./delivery-workspace";

describe("delivery workspace cancellation normalization", () => {
  it("surfaces live phase, cancellability and durable cancellation metadata", () => {
    const view = normalizeDeliveryWorkspace(
      "cycle:active",
      {
        deliveryCancellation: {
          cancellable: true,
          request: {
            operationId: "operation:active",
            actor: "operator",
            requestedAt: "2026-07-24T00:00:04.000Z",
            signalSentAt: "2026-07-24T00:00:04.100Z",
          },
        },
      },
      {
        inspection: {
          controlStatus: "valid",
          disposition: "active",
          lockPresent: true,
          ownerState: "alive",
          childState: "alive",
          findings: ["delivery child process or process group is still alive"],
          record: {
            operationId: "operation:active",
            operation: "execute",
            actor: "implementer",
            status: "running",
            startedAt: "2026-07-24T00:00:00.000Z",
            heartbeatAt: "2026-07-24T00:00:05.000Z",
            completedAt: null,
          },
        },
      }
    );

    expect(view.operation.record?.status).toBe("running · cancel-requested");
    expect(view.operation.record?.phase).toBe("cancel-requested");
    expect(view.operation.record?.cancelRequestedBy).toBe("operator");
    expect(view.operation.record?.cancelSignalAt).toBe("2026-07-24T00:00:04.100Z");
    expect(view.operation.cancellation?.operationId).toBe("operation:active");
    expect(view.operation.cancellable).toBe(false);
  });

  it("enables graceful cancellation only for a validated active child without a prior request", () => {
    const view = normalizeDeliveryWorkspace(
      "cycle:running",
      { deliveryCancellation: { cancellable: true, request: null } },
      {
        inspection: {
          controlStatus: "valid",
          disposition: "active",
          lockPresent: true,
          ownerState: "alive",
          childState: "alive",
          record: {
            operationId: "operation:running",
            operation: "execute",
            actor: "implementer",
            status: "running",
            startedAt: "2026-07-24T00:00:00.000Z",
            heartbeatAt: "2026-07-24T00:00:05.000Z",
            completedAt: null,
          },
        },
      }
    );

    expect(view.operation.record?.phase).toBe("command-running");
    expect(view.operation.cancellable).toBe(true);
  });

  it("keeps cancellation disabled when no validated child process is available", () => {
    const view = normalizeDeliveryWorkspace(
      "cycle:preparing",
      { deliveryCancellation: { cancellable: false, request: null } },
      {
        inspection: {
          controlStatus: "valid",
          disposition: "active",
          lockPresent: true,
          ownerState: "alive",
          childState: "not-recorded",
          record: {
            operationId: "operation:preparing",
            operation: "publish",
            actor: "publisher",
            status: "running",
            startedAt: "2026-07-24T00:00:00.000Z",
            heartbeatAt: "2026-07-24T00:00:05.000Z",
            completedAt: null,
          },
        },
      }
    );

    expect(view.operation.record?.phase).toBe("preparing");
    expect(view.operation.cancellable).toBe(false);
  });
});

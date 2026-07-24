import {
  executeDelivery as executeDeliveryInternal,
  verifyDelivery as verifyDeliveryInternal,
  type ExecuteDeliveryInput,
  type VerifyDeliveryInput,
} from "./delivery.js";
import {
  publishDelivery as publishDeliveryInternal,
  type PublishDeliveryInput,
} from "./delivery-publish.js";
import { withDeliveryOperation } from "./delivery-operation.js";
import {
  withDeliveryProgressOperation,
  type DeliveryProgressStepResult,
} from "./delivery-progress.js";

type ExecuteDeliveryResult = Awaited<ReturnType<typeof executeDeliveryInternal>>;
type VerifyDeliveryResult = Awaited<ReturnType<typeof verifyDeliveryInternal>>;

function executionProgress(result: ExecuteDeliveryResult): DeliveryProgressStepResult[] {
  return [
    {
      stepIndex: 1,
      stepId: "implementation",
      executable: result.execution.executable,
      status: result.execution.commandStatus,
      exitCode: result.execution.exitCode,
    },
  ];
}

function verificationProgress(result: VerifyDeliveryResult): DeliveryProgressStepResult[] {
  return result.verification.checks.map((check, index) => ({
    stepIndex: index + 1,
    stepId: check.id,
    executable: check.executable,
    status: check.status,
    exitCode: check.exitCode,
  }));
}

export async function executeDelivery(input: ExecuteDeliveryInput) {
  const protectedResult = await withDeliveryOperation(
    {
      store: input.store,
      cycleId: input.cycleId,
      projectRoot: input.projectRoot,
      actor: input.actor,
      operation: "execute",
      now: input.now,
    },
    () =>
      withDeliveryProgressOperation(
        {
          store: input.store,
          cycleId: input.cycleId,
          operation: "execute",
          plannedStepIds: ["implementation"],
        },
        () => executeDeliveryInternal(input),
        executionProgress
      )
  );
  return protectedResult.value;
}

export async function verifyDelivery(input: VerifyDeliveryInput) {
  const protectedResult = await withDeliveryOperation(
    {
      store: input.store,
      cycleId: input.cycleId,
      projectRoot: input.projectRoot,
      actor: input.actor,
      operation: "verify",
      now: input.now,
    },
    () =>
      withDeliveryProgressOperation(
        {
          store: input.store,
          cycleId: input.cycleId,
          operation: "verify",
        },
        () => verifyDeliveryInternal(input),
        verificationProgress
      )
  );
  return protectedResult.value;
}

export async function publishDelivery(input: PublishDeliveryInput) {
  const protectedResult = await withDeliveryOperation(
    {
      store: input.store,
      cycleId: input.cycleId,
      projectRoot: input.projectRoot,
      actor: input.actor,
      operation: "publish",
      now: input.now,
    },
    () =>
      withDeliveryProgressOperation(
        {
          store: input.store,
          cycleId: input.cycleId,
          operation: "publish",
        },
        () => publishDeliveryInternal(input)
      )
  );
  return protectedResult.value;
}

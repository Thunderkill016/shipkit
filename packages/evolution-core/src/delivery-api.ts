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
    () => executeDeliveryInternal(input)
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
    () => verifyDeliveryInternal(input)
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
    () => publishDeliveryInternal(input)
  );
  return protectedResult.value;
}

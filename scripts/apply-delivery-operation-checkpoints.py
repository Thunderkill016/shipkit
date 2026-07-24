from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"expected exactly one match in {path}, found {count}: {old[:80]!r}")
    file_path.write_text(text.replace(old, new), encoding="utf-8")


replace_once(
    "packages/evolution-core/src/execution-backend.ts",
    'import { isAbsolute, relative, resolve, sep } from "node:path";\n',
    'import { isAbsolute, relative, resolve, sep } from "node:path";\n'
    'import { recordDeliveryChildProcess } from "./delivery-operation.js";\n',
)

replace_once(
    "packages/evolution-core/src/execution-backend.ts",
    '''    const timer = setTimeout(() => {
      timedOut = true;
      void terminateProcess(child, detached);
    }, options.timeoutMs);

    child.stdout?.on("data", stdout.append);
''',
    '''    const timer = setTimeout(() => {
      timedOut = true;
      void terminateProcess(child, detached);
    }, options.timeoutMs);

    try {
      recordDeliveryChildProcess(child.pid ?? null);
    } catch (error) {
      stderr.append(error instanceof Error ? error.message : String(error));
      void terminateProcess(child, detached);
      finish({ status: "unavailable", exitCode: null, signal: null });
      return;
    }

    child.stdout?.on("data", stdout.append);
''',
)

replace_once(
    "packages/evolution-core/src/index.ts",
    'export * from "./delivery-recovery.js";\nexport * from "./delivery-cli.js";\n',
    'export * from "./delivery-recovery.js";\n'
    'export * from "./delivery-operation.js";\n'
    'export * from "./delivery-cli.js";\n',
)

replace_once(
    "packages/evolution-core/src/delivery-cli.ts",
    'import { recoverDelivery, showDeliveryRecovery } from "./delivery-recovery.js";\n',
    'import { recoverDelivery, showDeliveryRecovery } from "./delivery-recovery.js";\n'
    'import {\n'
    '  reconcileDeliveryOperation,\n'
    '  showDeliveryOperation,\n'
    '  withDeliveryOperation,\n'
    '} from "./delivery-operation.js";\n',
)

replace_once(
    "packages/evolution-core/src/delivery-cli.ts",
    '''  cyclewarden-deliver recover <cycle-id>
    [--root .cyclewarden] [--project-root .] [--actor cyclewarden-recovery-operator]
    [--apply]
  cyclewarden-deliver show <cycle-id> [--root .cyclewarden]
''',
    '''  cyclewarden-deliver recover <cycle-id>
    [--root .cyclewarden] [--project-root .] [--actor cyclewarden-recovery-operator]
    [--apply]
  cyclewarden-deliver operation <cycle-id>
    [--root .cyclewarden] [--project-root .] [--actor cyclewarden-recovery-operator]
    [--apply]
  cyclewarden-deliver show <cycle-id> [--root .cyclewarden]
''',
)

replace_once(
    "packages/evolution-core/src/delivery-cli.ts",
    '''recover inspects cycle, control-sidecar, branch and worktree state. It is read-only by default.
Use --apply only after reviewing the proposed transition. Recovery never treats an unrecorded
commit as accepted verification and never reruns implementation, merges or deploys.
''',
    '''recover inspects cycle, control-sidecar, branch and worktree state. It is read-only by default.
Use --apply only after reviewing the proposed transition. Recovery never treats an unrecorded
commit as accepted verification and never reruns implementation, merges or deploys.

operation inspects the write-ahead checkpoint, owner PID, child PID and lock. It clears a stale
lease only with --apply and only when the integrity-valid local owner and child are both dead.
''',
)

replace_once(
    "packages/evolution-core/src/delivery-cli.ts",
    '''  if (command === "execute") {
    const result = await executeDelivery({
      store,
      cycleId,
      projectRoot: projectRootFrom(parsed),
      manifestPath: resolve(required(parsed, "manifest")),
      actor: one(parsed, "actor")?.trim() || "cyclewarden-implementer",
      trustedRepository: one(parsed, "trusted-repository") === "true",
    });
    printJson(io, result);
    return 0;
  }
''',
    '''  if (command === "execute") {
    const projectRoot = projectRootFrom(parsed);
    const actor = one(parsed, "actor")?.trim() || "cyclewarden-implementer";
    const protectedResult = await withDeliveryOperation(
      { store, cycleId, projectRoot, actor, operation: "execute" },
      () =>
        executeDelivery({
          store,
          cycleId,
          projectRoot,
          manifestPath: resolve(required(parsed, "manifest")),
          actor,
          trustedRepository: one(parsed, "trusted-repository") === "true",
        })
    );
    printJson(io, { ...protectedResult.value, deliveryOperation: protectedResult.operation });
    return 0;
  }
''',
)

replace_once(
    "packages/evolution-core/src/delivery-cli.ts",
    '''  if (command === "verify") {
    const result = await verifyDelivery({
      store,
      cycleId,
      projectRoot: projectRootFrom(parsed),
      actor: one(parsed, "actor")?.trim() || "cyclewarden-independent-verifier",
    });
    printJson(io, result);
    return 0;
  }
''',
    '''  if (command === "verify") {
    const projectRoot = projectRootFrom(parsed);
    const actor = one(parsed, "actor")?.trim() || "cyclewarden-independent-verifier";
    const protectedResult = await withDeliveryOperation(
      { store, cycleId, projectRoot, actor, operation: "verify" },
      () => verifyDelivery({ store, cycleId, projectRoot, actor })
    );
    printJson(io, { ...protectedResult.value, deliveryOperation: protectedResult.operation });
    return 0;
  }
''',
)

replace_once(
    "packages/evolution-core/src/delivery-cli.ts",
    '''  if (command === "publish") {
    const bodyFile = one(parsed, "body-file")?.trim();
    const result = await publishDelivery({
      store,
      cycleId,
      projectRoot: projectRootFrom(parsed),
      actor: one(parsed, "actor")?.trim() || "cyclewarden-publisher",
      draftPr: one(parsed, "draft-pr") === "true",
      remote: one(parsed, "remote")?.trim() || "origin",
      hostname: one(parsed, "hostname")?.trim(),
      baseBranch: one(parsed, "base")?.trim(),
      title: one(parsed, "title")?.trim(),
      body: bodyFile ? await readFile(resolve(bodyFile), "utf8") : undefined,
    });
    printJson(io, result);
    return 0;
  }
''',
    '''  if (command === "publish") {
    const bodyFile = one(parsed, "body-file")?.trim();
    const projectRoot = projectRootFrom(parsed);
    const actor = one(parsed, "actor")?.trim() || "cyclewarden-publisher";
    const protectedResult = await withDeliveryOperation(
      { store, cycleId, projectRoot, actor, operation: "publish" },
      () =>
        publishDelivery({
          store,
          cycleId,
          projectRoot,
          actor,
          draftPr: one(parsed, "draft-pr") === "true",
          remote: one(parsed, "remote")?.trim() || "origin",
          hostname: one(parsed, "hostname")?.trim(),
          baseBranch: one(parsed, "base")?.trim(),
          title: one(parsed, "title")?.trim(),
          body: bodyFile ? readFile(resolve(bodyFile), "utf8") : undefined,
        })
    );
    printJson(io, { ...protectedResult.value, deliveryOperation: protectedResult.operation });
    return 0;
  }
''',
)

replace_once(
    "packages/evolution-core/src/delivery-cli.ts",
    '''  if (command === "show") {
    printJson(io, {
      ...(await showDelivery(store, cycleId)),
      ...(await showDeliveryPublication(store, cycleId)),
      ...(await showDeliveryRecovery(store, cycleId)),
    });
    return 0;
  }
''',
    '''  if (command === "operation") {
    const result = await reconcileDeliveryOperation({
      store,
      cycleId,
      projectRoot: projectRootFrom(parsed),
      actor: one(parsed, "actor")?.trim() || "cyclewarden-recovery-operator",
      apply: one(parsed, "apply") === "true",
    });
    printJson(io, result);
    return 0;
  }

  if (command === "show") {
    printJson(io, {
      ...(await showDelivery(store, cycleId)),
      ...(await showDeliveryPublication(store, cycleId)),
      ...(await showDeliveryRecovery(store, cycleId)),
      ...showDeliveryOperation(store, cycleId),
    });
    return 0;
  }
''',
)

replace_once(
    "packages/evolution-core/src/delivery-operation.ts",
    '''  const actor = input.actor.trim();
  if (!actor) throw new DeliveryOperationError("delivery operation actor is required");
  const existing = inspectDeliveryOperation(input.store, input.cycleId);
''',
    '''  const actor = input.actor.trim();
  if (!actor) throw new DeliveryOperationError("delivery operation actor is required");
  const heartbeatIntervalMs = input.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
  if (!Number.isInteger(heartbeatIntervalMs) || heartbeatIntervalMs <= 0) {
    throw new DeliveryOperationError("delivery heartbeat interval must be a positive integer");
  }
  const existing = inspectDeliveryOperation(input.store, input.cycleId);
''',
)

replace_once(
    "packages/evolution-core/src/delivery-operation.ts",
    '''  const heartbeatIntervalMs = input.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
  if (!Number.isInteger(heartbeatIntervalMs) || heartbeatIntervalMs <= 0) {
    releaseOperationLock(input.store, input.cycleId);
    throw new DeliveryOperationError("delivery heartbeat interval must be a positive integer");
  }
  let heartbeatFailure: Error | null = null;
''',
    '''  let heartbeatFailure: Error | null = null;
''',
)

print("delivery operation checkpoint integration applied")

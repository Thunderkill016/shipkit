import { createHash, randomUUID } from "node:crypto";
import {
  access,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import {
  AUTONOMY_LEVELS,
  EVOLUTION_STAGES,
  RISK_CLASSES,
  type EvolutionCycle,
} from "./types.js";
import { resolveDefaultStateRoot } from "./runtime-paths.js";

export const STORE_SCHEMA_VERSIONS = [1, 2] as const;
export const CURRENT_STORE_SCHEMA_VERSION = 2 as const;

const DEFAULT_LOCK_TIMEOUT_MS = 5_000;
const DEFAULT_STALE_LOCK_MS = 30_000;
const ORPHAN_TEMP_STALE_MS = 30_000;
const SNAPSHOT_TEMPORARY_SUFFIX = ".tmp";

export class EvolutionStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvolutionStoreError";
  }
}

type JournalRecordV1 = {
  storeSchemaVersion: 1;
  sequence: number;
  writtenAt: string;
  checksum: string;
  cycle: EvolutionCycle;
};

type JournalRecord = {
  storeSchemaVersion: typeof CURRENT_STORE_SCHEMA_VERSION;
  sequence: number;
  writtenAt: string;
  previousChecksum: string | null;
  checksum: string;
  cycle: EvolutionCycle;
};

type LockRecord = {
  token: string;
  pid: number;
  acquiredAt: string;
};

type ProjectConfig = {
  schemaVersion: typeof CURRENT_STORE_SCHEMA_VERSION;
  projectRoot: string;
  projectName: string;
  createdAt: string;
  migratedAt?: string;
};

export type EvolutionStoreOptions = {
  lockTimeoutMs?: number;
  staleLockMs?: number;
};

export type CycleSummary = {
  cycleId: string;
  objective: string;
  stage: EvolutionCycle["stage"];
  autonomy: EvolutionCycle["autonomy"];
  risk: EvolutionCycle["risk"];
  updatedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new EvolutionStoreError(`${label} must be a positive integer`);
  }
}

function assertCycle(value: unknown): asserts value is EvolutionCycle {
  if (!isRecord(value)) throw new EvolutionStoreError("cycle must be an object");
  if (value.schemaVersion !== 1) {
    throw new EvolutionStoreError(`unsupported cycle schemaVersion: ${String(value.schemaVersion)}`);
  }
  if (typeof value.cycleId !== "string" || value.cycleId.length < 3) {
    throw new EvolutionStoreError("cycleId is missing or invalid");
  }
  if (typeof value.objective !== "string" || value.objective.length < 8) {
    throw new EvolutionStoreError("objective is missing or invalid");
  }
  if (!AUTONOMY_LEVELS.includes(value.autonomy as EvolutionCycle["autonomy"])) {
    throw new EvolutionStoreError("autonomy is invalid");
  }
  if (!RISK_CLASSES.includes(value.risk as EvolutionCycle["risk"])) {
    throw new EvolutionStoreError("risk is invalid");
  }
  if (!EVOLUTION_STAGES.includes(value.stage as EvolutionCycle["stage"])) {
    throw new EvolutionStoreError("stage is invalid");
  }
  if (!Array.isArray(value.history) || !Array.isArray(value.approvals)) {
    throw new EvolutionStoreError("cycle history or approvals are invalid");
  }
  if (!isRecord(value.artifacts)) {
    throw new EvolutionStoreError("cycle artifacts are invalid");
  }
}

function checksumCycle(cycle: EvolutionCycle): string {
  return createHash("sha256").update(JSON.stringify(cycle)).digest("hex");
}

function maybeCrash(point: string): void {
  const configuredCrashPoint =
    process.env.CYCLEWARDEN_PERSISTENCE_CRASH_POINT ??
    process.env.SHIPKIT_PERSISTENCE_CRASH_POINT;
  if (configuredCrashPoint !== point) return;
  process.stderr.write(`cyclewarden persistence fault injection: ${point}\n`);
  if (process.platform === "win32") process.exit(86);
  process.kill(process.pid, "SIGKILL");
  throw new EvolutionStoreError(`fault injection did not terminate process at ${point}`);
}

function migrateJournalRecord(
  value: unknown,
  expectedSequence: number,
  expectedPreviousChecksum: string | null
): JournalRecord {
  if (!isRecord(value)) throw new EvolutionStoreError("journal record must be an object");
  const version = value.storeSchemaVersion;
  if (!STORE_SCHEMA_VERSIONS.includes(version as (typeof STORE_SCHEMA_VERSIONS)[number])) {
    throw new EvolutionStoreError(`unsupported store schemaVersion: ${String(version)}`);
  }
  if (value.sequence !== expectedSequence) {
    throw new EvolutionStoreError(
      `journal sequence mismatch: expected ${expectedSequence}, got ${String(value.sequence)}`
    );
  }
  if (
    typeof value.writtenAt !== "string" ||
    !Number.isFinite(Date.parse(value.writtenAt)) ||
    typeof value.checksum !== "string"
  ) {
    throw new EvolutionStoreError("journal metadata is invalid");
  }
  assertCycle(value.cycle);
  const expectedChecksum = checksumCycle(value.cycle);
  if (value.checksum !== expectedChecksum) {
    throw new EvolutionStoreError(`journal checksum mismatch at sequence ${expectedSequence}`);
  }

  if (version === 2) {
    if (value.previousChecksum !== expectedPreviousChecksum) {
      throw new EvolutionStoreError(
        `journal checksum chain mismatch at sequence ${expectedSequence}`
      );
    }
    return value as JournalRecord;
  }

  const legacy = value as JournalRecordV1;
  return {
    storeSchemaVersion: CURRENT_STORE_SCHEMA_VERSION,
    sequence: legacy.sequence,
    writtenAt: legacy.writtenAt,
    previousChecksum: expectedPreviousChecksum,
    checksum: legacy.checksum,
    cycle: legacy.cycle,
  };
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function syncDirectory(path: string): Promise<void> {
  if (process.platform === "win32") return;
  try {
    const handle = await open(path, "r");
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  } catch {
    // Some filesystems do not permit syncing directory descriptors.
  }
}

async function atomicWriteJson(
  path: string,
  value: unknown,
  enableSnapshotFaults = false
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomUUID()}${SNAPSHOT_TEMPORARY_SUFFIX}`;
  const handle = await open(temporary, "wx", 0o600);
  if (enableSnapshotFaults) maybeCrash("snapshot:after-temp-open");
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    if (enableSnapshotFaults) maybeCrash("snapshot:after-temp-write");
    await handle.sync();
    if (enableSnapshotFaults) maybeCrash("snapshot:after-temp-sync");
  } finally {
    await handle.close();
  }

  try {
    await rename(temporary, path);
    if (enableSnapshotFaults) maybeCrash("snapshot:after-rename");
    await syncDirectory(dirname(path));
    if (enableSnapshotFaults) maybeCrash("snapshot:after-directory-sync");
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

async function appendJournal(path: string, record: JournalRecord): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const existed = await exists(path);
  const handle = await open(path, "a", 0o600);
  maybeCrash("journal:after-open");
  try {
    await handle.writeFile(`${JSON.stringify(record)}\n`, "utf8");
    maybeCrash("journal:after-write");
    await handle.sync();
    maybeCrash("journal:after-sync");
  } finally {
    await handle.close();
  }
  if (!existed) {
    await syncDirectory(dirname(path));
  }
}

async function readLockRecord(path: string): Promise<LockRecord | null> {
  try {
    const value = JSON.parse(await readFile(path, "utf8"));
    if (
      isRecord(value) &&
      typeof value.token === "string" &&
      typeof value.pid === "number" &&
      Number.isInteger(value.pid) &&
      value.pid > 0 &&
      typeof value.acquiredAt === "string" &&
      Number.isFinite(Date.parse(value.acquiredAt))
    ) {
      return value as LockRecord;
    }
  } catch {
    // Missing or malformed lock records are handled by timeout/stale-lock logic.
  }
  return null;
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code !== "ESRCH";
  }
}

async function lockIsReclaimable(path: string, staleLockMs: number): Promise<boolean> {
  const details = await stat(path);
  const ageMs = Date.now() - details.mtimeMs;
  const record = await readLockRecord(path);
  if (record) {
    return !processIsAlive(record.pid);
  }
  return ageMs > staleLockMs;
}

async function acquireLock(
  path: string,
  options: Required<EvolutionStoreOptions>
): Promise<() => Promise<void>> {
  await mkdir(dirname(path), { recursive: true });
  const startedAt = Date.now();
  while (Date.now() - startedAt < options.lockTimeoutMs) {
    const token = randomUUID();
    try {
      const handle = await open(path, "wx", 0o600);
      try {
        await handle.writeFile(
          `${JSON.stringify({ token, pid: process.pid, acquiredAt: new Date().toISOString() })}\n`,
          "utf8"
        );
        await handle.sync();
      } catch (error) {
        await handle.close();
        await rm(path, { force: true });
        throw error;
      }
      return async () => {
        await handle.close();
        const current = await readLockRecord(path);
        if (current?.token === token) {
          await rm(path, { force: true });
          await syncDirectory(dirname(path));
        }
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") throw error;
      try {
        if (await lockIsReclaimable(path, options.staleLockMs)) {
          await rm(path, { force: true });
          await syncDirectory(dirname(path));
          continue;
        }
      } catch {
        continue;
      }
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 20));
    }
  }
  throw new EvolutionStoreError(`timed out acquiring cycle lock: ${path}`);
}

export function cycleStorageDirectoryName(cycleId: string): string {
  const readable = cycleId.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 64) || "cycle";
  const suffix = createHash("sha256").update(cycleId).digest("hex").slice(0, 12);
  return `${readable}-${suffix}`;
}

async function removeOrphanedSnapshots(cycleDir: string, statePath: string): Promise<void> {
  let entries;
  try {
    entries = await readdir(cycleDir, { withFileTypes: true });
  } catch {
    return;
  }
  const prefix = `${basename(statePath)}.`;
  const candidates = entries.filter(
    (entry) =>
      entry.isFile() &&
      entry.name.startsWith(prefix) &&
      entry.name.endsWith(SNAPSHOT_TEMPORARY_SUFFIX)
  );

  for (const entry of candidates) {
    const candidatePath = join(cycleDir, entry.name);
    const identity = entry.name.slice(prefix.length, -SNAPSHOT_TEMPORARY_SUFFIX.length);
    const pid = Number(identity.split(".", 1)[0]);
    if (Number.isInteger(pid) && pid > 0) {
      if (processIsAlive(pid)) continue;
      await rm(candidatePath, { force: true });
      continue;
    }
    try {
      const details = await stat(candidatePath);
      if (Date.now() - details.mtimeMs <= ORPHAN_TEMP_STALE_MS) continue;
      await rm(candidatePath, { force: true });
    } catch {
      // A concurrently completed or removed temporary file needs no further cleanup.
    }
  }
}

function normalizeProjectConfig(value: unknown): { config: ProjectConfig; migrated: boolean } {
  if (!isRecord(value)) throw new EvolutionStoreError("project config must be an object");
  if (value.schemaVersion !== 1 && value.schemaVersion !== CURRENT_STORE_SCHEMA_VERSION) {
    throw new EvolutionStoreError(
      `unsupported project config schemaVersion: ${String(value.schemaVersion)}`
    );
  }
  if (
    typeof value.projectRoot !== "string" ||
    typeof value.projectName !== "string" ||
    typeof value.createdAt !== "string" ||
    !Number.isFinite(Date.parse(value.createdAt))
  ) {
    throw new EvolutionStoreError("project config is invalid");
  }
  const migrated = value.schemaVersion === 1;
  const existingMigratedAt =
    typeof value.migratedAt === "string" && Number.isFinite(Date.parse(value.migratedAt))
      ? value.migratedAt
      : null;
  return {
    migrated,
    config: {
      schemaVersion: CURRENT_STORE_SCHEMA_VERSION,
      projectRoot: value.projectRoot,
      projectName: value.projectName,
      createdAt: value.createdAt,
      ...((existingMigratedAt ?? (migrated ? value.createdAt : null))
        ? { migratedAt: existingMigratedAt ?? value.createdAt }
        : {}),
    },
  };
}

export class EvolutionStore {
  readonly rootDir: string;
  readonly cyclesDir: string;
  readonly options: Required<EvolutionStoreOptions>;

  constructor(rootDir = resolveDefaultStateRoot(), options: EvolutionStoreOptions = {}) {
    const lockTimeoutMs = options.lockTimeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS;
    const staleLockMs = options.staleLockMs ?? DEFAULT_STALE_LOCK_MS;
    assertPositiveInteger(lockTimeoutMs, "lockTimeoutMs");
    assertPositiveInteger(staleLockMs, "staleLockMs");
    this.rootDir = resolve(rootDir);
    this.cyclesDir = join(this.rootDir, "cycles");
    this.options = { lockTimeoutMs, staleLockMs };
  }

  async initializeProject(projectRoot = process.cwd()): Promise<string> {
    await mkdir(this.cyclesDir, { recursive: true });
    const configPath = join(this.rootDir, "config.json");
    if (!(await exists(configPath))) {
      await atomicWriteJson(configPath, {
        schemaVersion: CURRENT_STORE_SCHEMA_VERSION,
        projectRoot: resolve(projectRoot),
        projectName: basename(resolve(projectRoot)),
        createdAt: new Date().toISOString(),
      });
      return configPath;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(await readFile(configPath, "utf8"));
    } catch (error) {
      throw new EvolutionStoreError(
        `cannot read project config: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    const normalized = normalizeProjectConfig(parsed);
    if (normalized.migrated) await atomicWriteJson(configPath, normalized.config);
    return configPath;
  }

  private paths(cycleId: string) {
    const cycleDir = join(this.cyclesDir, cycleStorageDirectoryName(cycleId));
    return {
      cycleDir,
      statePath: join(cycleDir, "state.json"),
      journalPath: join(cycleDir, "events.jsonl"),
      lockPath: join(cycleDir, ".write.lock"),
    };
  }

  private makeRecord(
    cycle: EvolutionCycle,
    sequence: number,
    previousChecksum: string | null
  ): JournalRecord {
    return {
      storeSchemaVersion: CURRENT_STORE_SCHEMA_VERSION,
      sequence,
      writtenAt: new Date().toISOString(),
      previousChecksum,
      checksum: checksumCycle(cycle),
      cycle,
    };
  }

  async create(cycle: EvolutionCycle): Promise<EvolutionCycle> {
    await this.initializeProject();
    const paths = this.paths(cycle.cycleId);
    await mkdir(paths.cycleDir, { recursive: true });
    await removeOrphanedSnapshots(paths.cycleDir, paths.statePath);
    const release = await acquireLock(paths.lockPath, this.options);
    try {
      if ((await exists(paths.statePath)) || (await exists(paths.journalPath))) {
        throw new EvolutionStoreError(`cycle already exists: ${cycle.cycleId}`);
      }
      const record = this.makeRecord(cycle, 0, null);
      await appendJournal(paths.journalPath, record);
      await atomicWriteJson(paths.statePath, record, true);
      return cycle;
    } finally {
      await release();
    }
  }

  async save(previous: EvolutionCycle, next: EvolutionCycle): Promise<EvolutionCycle> {
    if (previous.cycleId !== next.cycleId) {
      throw new EvolutionStoreError("cannot save a transition across different cycle IDs");
    }
    if (next.history.length !== previous.history.length + 1) {
      throw new EvolutionStoreError("save requires exactly one new transition");
    }

    const paths = this.paths(next.cycleId);
    const release = await acquireLock(paths.lockPath, this.options);
    try {
      await removeOrphanedSnapshots(paths.cycleDir, paths.statePath);
      const current = await this.load(previous.cycleId);
      const currentChecksum = checksumCycle(current);
      if (currentChecksum !== checksumCycle(previous)) {
        throw new EvolutionStoreError(
          `stale cycle state for ${previous.cycleId}; reload before writing`
        );
      }
      const record = this.makeRecord(next, next.history.length, currentChecksum);
      await appendJournal(paths.journalPath, record);
      await atomicWriteJson(paths.statePath, record, true);
      return next;
    } finally {
      await release();
    }
  }

  private async readJournal(cycleId: string): Promise<JournalRecord[]> {
    const { journalPath } = this.paths(cycleId);
    let source: string;
    try {
      source = await readFile(journalPath, "utf8");
    } catch (error) {
      throw new EvolutionStoreError(
        `cannot read journal for ${cycleId}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const rawLines = source.split("\n");
    const records: JournalRecord[] = [];
    for (let index = 0; index < rawLines.length; index += 1) {
      const line = rawLines[index]?.trim();
      if (!line) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch (error) {
        const isTrailingPartial =
          error instanceof SyntaxError && index === rawLines.length - 1 && !source.endsWith("\n");
        if (isTrailingPartial) break;
        throw new EvolutionStoreError(
          `invalid journal JSON at line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      const previousChecksum = records.at(-1)?.checksum ?? null;
      records.push(migrateJournalRecord(parsed, records.length, previousChecksum));
    }
    if (records.length === 0) {
      throw new EvolutionStoreError(`journal has no valid records: ${cycleId}`);
    }
    return records;
  }

  async replay(cycleId: string): Promise<EvolutionCycle> {
    const records = await this.readJournal(cycleId);
    const latest = records.at(-1);
    if (!latest) throw new EvolutionStoreError(`journal has no latest record: ${cycleId}`);
    if (latest.cycle.cycleId !== cycleId) {
      throw new EvolutionStoreError(`journal cycle ID mismatch for ${cycleId}`);
    }
    return latest.cycle;
  }

  async load(cycleId: string): Promise<EvolutionCycle> {
    const paths = this.paths(cycleId);
    await removeOrphanedSnapshots(paths.cycleDir, paths.statePath);
    const records = await this.readJournal(cycleId);
    const latest = records.at(-1);
    if (!latest) throw new EvolutionStoreError(`journal has no latest record: ${cycleId}`);
    if (latest.cycle.cycleId !== cycleId) {
      throw new EvolutionStoreError(`journal cycle ID mismatch for ${cycleId}`);
    }
    const previousChecksum = records.at(-2)?.checksum ?? null;

    try {
      const parsed = JSON.parse(await readFile(paths.statePath, "utf8"));
      const envelope = migrateJournalRecord(parsed, latest.sequence, previousChecksum);
      if (envelope.cycle.cycleId !== cycleId) {
        throw new EvolutionStoreError(`state cycle ID mismatch for ${cycleId}`);
      }
      if (envelope.checksum !== latest.checksum) {
        throw new EvolutionStoreError(`state is stale for ${cycleId}`);
      }
      if (isRecord(parsed) && parsed.storeSchemaVersion === 1) {
        await atomicWriteJson(paths.statePath, envelope, true);
      }
      return envelope.cycle;
    } catch {
      await atomicWriteJson(paths.statePath, latest, true);
      return latest.cycle;
    }
  }

  async list(): Promise<CycleSummary[]> {
    if (!(await exists(this.cyclesDir))) return [];
    const entries = await readdir(this.cyclesDir, { withFileTypes: true });
    const summaries: CycleSummary[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const statePath = join(this.cyclesDir, entry.name, "state.json");
      try {
        const parsed = JSON.parse(await readFile(statePath, "utf8"));
        if (!isRecord(parsed)) continue;
        assertCycle(parsed.cycle);
        const cycle = parsed.cycle;
        summaries.push({
          cycleId: cycle.cycleId,
          objective: cycle.objective,
          stage: cycle.stage,
          autonomy: cycle.autonomy,
          risk: cycle.risk,
          updatedAt: cycle.updatedAt,
        });
      } catch {
        // A broken summary never authorizes a cycle. Explicit load/replay reports the failure.
      }
    }
    return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
}

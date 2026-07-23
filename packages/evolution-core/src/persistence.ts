import { createHash, randomUUID } from "node:crypto";
import {
  access,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
} from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import {
  AUTONOMY_LEVELS,
  EVOLUTION_STAGES,
  RISK_CLASSES,
  type EvolutionCycle,
} from "./types.js";

const STORE_SCHEMA_VERSION = 1 as const;

export class EvolutionStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvolutionStoreError";
  }
}

type JournalRecord = {
  storeSchemaVersion: typeof STORE_SCHEMA_VERSION;
  sequence: number;
  writtenAt: string;
  checksum: string;
  cycle: EvolutionCycle;
};

type StateEnvelope = JournalRecord;

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

function assertJournalRecord(value: unknown, expectedSequence: number): JournalRecord {
  if (!isRecord(value)) throw new EvolutionStoreError("journal record must be an object");
  if (value.storeSchemaVersion !== STORE_SCHEMA_VERSION) {
    throw new EvolutionStoreError(
      `unsupported store schemaVersion: ${String(value.storeSchemaVersion)}`
    );
  }
  if (value.sequence !== expectedSequence) {
    throw new EvolutionStoreError(
      `journal sequence mismatch: expected ${expectedSequence}, got ${String(value.sequence)}`
    );
  }
  if (typeof value.writtenAt !== "string" || typeof value.checksum !== "string") {
    throw new EvolutionStoreError("journal metadata is invalid");
  }
  assertCycle(value.cycle);
  const expectedChecksum = checksumCycle(value.cycle);
  if (value.checksum !== expectedChecksum) {
    throw new EvolutionStoreError(`journal checksum mismatch at sequence ${expectedSequence}`);
  }
  return value as JournalRecord;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function atomicWriteJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }

  try {
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

async function appendJournal(path: string, record: JournalRecord): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const handle = await open(path, "a", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(record)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

function directoryName(cycleId: string): string {
  const readable = cycleId.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 64) || "cycle";
  const suffix = createHash("sha256").update(cycleId).digest("hex").slice(0, 12);
  return `${readable}-${suffix}`;
}

export class EvolutionStore {
  readonly rootDir: string;
  readonly cyclesDir: string;

  constructor(rootDir = ".shipkit") {
    this.rootDir = resolve(rootDir);
    this.cyclesDir = join(this.rootDir, "cycles");
  }

  async initializeProject(projectRoot = process.cwd()): Promise<string> {
    await mkdir(this.cyclesDir, { recursive: true });
    const configPath = join(this.rootDir, "config.json");
    if (!(await exists(configPath))) {
      await atomicWriteJson(configPath, {
        schemaVersion: STORE_SCHEMA_VERSION,
        projectRoot: resolve(projectRoot),
        projectName: basename(resolve(projectRoot)),
        createdAt: new Date().toISOString(),
      });
    }
    return configPath;
  }

  private paths(cycleId: string) {
    const cycleDir = join(this.cyclesDir, directoryName(cycleId));
    return {
      cycleDir,
      statePath: join(cycleDir, "state.json"),
      journalPath: join(cycleDir, "events.jsonl"),
    };
  }

  private makeRecord(cycle: EvolutionCycle, sequence: number): JournalRecord {
    return {
      storeSchemaVersion: STORE_SCHEMA_VERSION,
      sequence,
      writtenAt: new Date().toISOString(),
      checksum: checksumCycle(cycle),
      cycle,
    };
  }

  async create(cycle: EvolutionCycle): Promise<EvolutionCycle> {
    await this.initializeProject();
    const paths = this.paths(cycle.cycleId);
    if ((await exists(paths.statePath)) || (await exists(paths.journalPath))) {
      throw new EvolutionStoreError(`cycle already exists: ${cycle.cycleId}`);
    }
    await mkdir(paths.cycleDir, { recursive: true });
    const record = this.makeRecord(cycle, 0);
    await appendJournal(paths.journalPath, record);
    await atomicWriteJson(paths.statePath, record);
    return cycle;
  }

  async save(previous: EvolutionCycle, next: EvolutionCycle): Promise<EvolutionCycle> {
    if (previous.cycleId !== next.cycleId) {
      throw new EvolutionStoreError("cannot save a transition across different cycle IDs");
    }
    if (next.history.length !== previous.history.length + 1) {
      throw new EvolutionStoreError("save requires exactly one new transition");
    }

    const current = await this.load(previous.cycleId);
    if (checksumCycle(current) !== checksumCycle(previous)) {
      throw new EvolutionStoreError(
        `stale cycle state for ${previous.cycleId}; reload before writing`
      );
    }

    const paths = this.paths(next.cycleId);
    const record = this.makeRecord(next, next.history.length);
    await appendJournal(paths.journalPath, record);
    await atomicWriteJson(paths.statePath, record);
    return next;
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
      try {
        records.push(assertJournalRecord(JSON.parse(line), records.length));
      } catch (error) {
        const isTrailingPartial = index === rawLines.length - 1 && !source.endsWith("\n");
        if (isTrailingPartial) break;
        throw error;
      }
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
    const latestFromJournal = await this.replay(cycleId);
    const { statePath } = this.paths(cycleId);

    try {
      const parsed = JSON.parse(await readFile(statePath, "utf8"));
      const envelope = assertJournalRecord(parsed, latestFromJournal.history.length);
      if (envelope.cycle.cycleId !== cycleId) {
        throw new EvolutionStoreError(`state cycle ID mismatch for ${cycleId}`);
      }
      if (envelope.checksum !== checksumCycle(latestFromJournal)) {
        throw new EvolutionStoreError(`state is stale for ${cycleId}`);
      }
      return envelope.cycle;
    } catch {
      const recovered = this.makeRecord(latestFromJournal, latestFromJournal.history.length);
      await atomicWriteJson(statePath, recovered);
      return latestFromJournal;
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

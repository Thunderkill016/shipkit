import type {
  EvolutionResearchRecords,
  ResearchRecordBase,
} from "./types.js";

const RESEARCH_BUCKETS = [
  "briefs",
  "plans",
  "runs",
  "queries",
  "sources",
  "claims",
  "citationSpans",
  "contradictions",
  "opportunities",
  "evaluations",
  "decisions",
  "experiments",
  "executionHandoffs",
] as const satisfies readonly (keyof EvolutionResearchRecords)[];

const NEW_OPTIONAL_BUCKETS = new Set<keyof EvolutionResearchRecords>([
  "runs",
  "evaluations",
  "citationSpans",
]);

const EXPECTED_KINDS: Record<(typeof RESEARCH_BUCKETS)[number], string> = {
  briefs: "research-brief",
  plans: "research-plan",
  runs: "research-run",
  queries: "query",
  sources: "source",
  claims: "claim",
  citationSpans: "citation-span",
  contradictions: "contradiction",
  opportunities: "opportunity",
  evaluations: "research-evaluation",
  decisions: "decision",
  experiments: "experiment",
  executionHandoffs: "execution-handoff",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRecordBase(
  value: unknown,
  cycleId: string,
  expectedKind: string
): asserts value is ResearchRecordBase & { kind: string } {
  if (!isRecord(value)) throw new Error("research record must be an object");
  if (value.kind !== expectedKind) {
    throw new Error(`research record kind must be ${expectedKind}`);
  }
  if (typeof value.recordId !== "string" || value.recordId.length < 8) {
    throw new Error("research recordId is missing or invalid");
  }
  if (value.cycleId !== cycleId) {
    throw new Error(`research record ${value.recordId} belongs to another cycle`);
  }
  if (typeof value.actor !== "string" || !value.actor.trim()) {
    throw new Error(`research record ${value.recordId} requires an actor`);
  }
  if (typeof value.createdAt !== "string" || !Number.isFinite(Date.parse(value.createdAt))) {
    throw new Error(`research record ${value.recordId} has an invalid createdAt`);
  }
  if (!Array.isArray(value.evidenceRefs)) {
    throw new Error(`research record ${value.recordId} evidenceRefs must be an array`);
  }
}

export function emptyResearchRecords(): EvolutionResearchRecords {
  return {
    briefs: [],
    plans: [],
    runs: [],
    queries: [],
    sources: [],
    claims: [],
    citationSpans: [],
    contradictions: [],
    opportunities: [],
    evaluations: [],
    decisions: [],
    experiments: [],
    executionHandoffs: [],
  };
}

export function assertEvolutionResearchRecords(
  value: unknown,
  cycleId: string
): asserts value is EvolutionResearchRecords {
  if (!isRecord(value)) throw new Error("cycle research records must be an object");

  const seen = new Set<string>();
  for (const bucket of RESEARCH_BUCKETS) {
    if (value[bucket] === undefined && NEW_OPTIONAL_BUCKETS.has(bucket)) {
      value[bucket] = [];
    }
    const records = value[bucket];
    if (!Array.isArray(records)) {
      throw new Error(`cycle research.${bucket} must be an array`);
    }
    for (const record of records) {
      assertRecordBase(record, cycleId, EXPECTED_KINDS[bucket]);
      if (seen.has(record.recordId)) {
        throw new Error(`duplicate research recordId: ${record.recordId}`);
      }
      seen.add(record.recordId);
    }
  }
}

export function mergeResearchRecords(
  current: EvolutionResearchRecords | undefined,
  additions: Partial<EvolutionResearchRecords> = {}
): EvolutionResearchRecords {
  const next = current
    ? Object.fromEntries(
        RESEARCH_BUCKETS.map((bucket) => [bucket, [...(current[bucket] ?? [])]])
      ) as EvolutionResearchRecords
    : emptyResearchRecords();

  const seen = new Set(
    RESEARCH_BUCKETS.flatMap((bucket) => next[bucket].map((record) => record.recordId))
  );

  for (const bucket of RESEARCH_BUCKETS) {
    for (const record of additions[bucket] ?? []) {
      if (seen.has(record.recordId)) {
        throw new Error(`duplicate research recordId: ${record.recordId}`);
      }
      seen.add(record.recordId);
      (next[bucket] as ResearchRecordBase[]).push(record);
    }
  }

  return next;
}

import { createHash } from "node:crypto";
import type { EvidenceRegistry } from "./evidence.js";
import {
  capturePublicSource,
  locateExactCitation,
  normalizePublicText,
  type AddressResolver,
  type PublicFetch,
  type PublicSourceCapture,
} from "./public-source.js";
import { evaluatePreparedResearch } from "./research-review.js";
import {
  parseResearchBundle,
  prepareResearchToExecution,
  type PreparedResearchHandoff,
  type ResearchBundleInput,
} from "./research.js";
import { transitionCycle } from "./state-machine.js";
import type {
  CitationSpanRecord,
  ClaimRecord,
  EvolutionCycle,
  ResearchEvaluationRecord,
  ResearchReviewCheck,
  ResearchRunRecord,
  ResearchSourceClass,
  SourceRecord,
} from "./types.js";

export type PublicCitationInput = {
  sourceIndex: number;
  quote: string;
  occurrence?: number;
};

export type PublicResearchSourceInput = {
  url: string;
  title: string;
  publisher: string;
  sourceClass: Exclude<ResearchSourceClass, "repository" | "user-research">;
  version: string | null;
  license: string | null;
  authority: number;
  directness: number;
  freshness: number;
  applicability: number;
  independence: number;
  conflictOfInterest: string | null;
  rationale?: string;
};

export type PublicResearchClaimInput = {
  statement: string;
  claimType: ClaimRecord["claimType"];
  confidence: number;
  uncertainty: string;
  supportingCitations: PublicCitationInput[];
  contradictingCitations?: PublicCitationInput[];
  expiresAt: string | null;
};

export type PublicResearchManifest = Omit<
  ResearchBundleInput,
  "queries" | "sources" | "claims"
> & {
  sources: PublicResearchSourceInput[];
  claims: PublicResearchClaimInput[];
};

export type PublicResearchRuntime = {
  fetcher?: PublicFetch;
  resolveAddresses?: AddressResolver;
};

export type PublicResearchOptions = {
  actor: string;
  reviewerActor: string;
  registry: EvidenceRegistry;
  manifestEvidenceRef: string;
  now?: string;
  startedAt?: string;
  timeoutMs?: number;
  maxSourceBytes?: number;
  runtime?: PublicResearchRuntime;
};

type SourceAttempt = {
  capture: PublicSourceCapture | null;
  evidenceRefs: string[];
  error: string | null;
};

export type CompletedPublicResearch = {
  outcome: "completed";
  diagnosed: EvolutionCycle;
  researched: EvolutionCycle;
  decided: EvolutionCycle;
  planned: EvolutionCycle;
  run: ResearchRunRecord;
  evaluation: ResearchEvaluationRecord;
  citationSpans: CitationSpanRecord[];
  records: PreparedResearchHandoff["records"];
};

export type InconclusivePublicResearch = {
  outcome: "inconclusive";
  reason: string;
  diagnosed: EvolutionCycle;
  inconclusive: EvolutionCycle;
  run: ResearchRunRecord;
  evaluation: ResearchEvaluationRecord;
  citationSpans: CitationSpanRecord[];
  records: PreparedResearchHandoff["records"];
};

export type PublicResearchPreparation = CompletedPublicResearch | InconclusivePublicResearch;

const STRONG_EXTERNAL_SOURCE_CLASSES = new Set<ResearchSourceClass>([
  "primary-technical",
  "official-documentation",
  "independent-reproduction",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function stableId(kind: string, cycleId: string, payload: unknown): string {
  return `${kind}:${hash({ kind, cycleId, payload }).slice(0, 24)}`;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
}

function citationArray(
  value: unknown,
  label: string,
  sourceCount: number,
  minimum: number
): PublicCitationInput[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  const result = value.map((entry, index) => {
    if (!isRecord(entry)) throw new Error(`${label}[${index}] must be an object`);
    const sourceIndex = entry.sourceIndex;
    if (
      typeof sourceIndex !== "number" ||
      !Number.isInteger(sourceIndex) ||
      sourceIndex < 0 ||
      sourceIndex >= sourceCount
    ) {
      throw new Error(`${label}[${index}].sourceIndex must reference an existing source`);
    }
    const occurrence = entry.occurrence ?? 0;
    if (typeof occurrence !== "number" || !Number.isInteger(occurrence) || occurrence < 0) {
      throw new Error(`${label}[${index}].occurrence must be a non-negative integer`);
    }
    return {
      sourceIndex,
      quote: requireString(entry.quote, `${label}[${index}].quote`),
      occurrence,
    };
  });
  if (result.length < minimum) throw new Error(`${label} requires at least ${minimum} citation(s)`);
  return result;
}

export function parsePublicResearchManifest(value: unknown): PublicResearchManifest {
  if (!isRecord(value)) throw new Error("public research manifest must be an object");
  if (!Array.isArray(value.sources) || value.sources.length === 0) {
    throw new Error("public research manifest requires at least one source");
  }
  if (!Array.isArray(value.claims) || value.claims.length === 0) {
    throw new Error("public research manifest requires at least one claim");
  }

  const sources = value.sources.map((entry, index) => {
    if (!isRecord(entry)) throw new Error(`sources[${index}] must be an object`);
    const sourceClass = requireString(entry.sourceClass, `sources[${index}].sourceClass`);
    if (sourceClass === "repository" || sourceClass === "user-research") {
      throw new Error(
        `sources[${index}].sourceClass ${sourceClass} is not valid for public HTTP ingestion`
      );
    }
    return {
      ...entry,
      url: requireString(entry.url, `sources[${index}].url`),
      title: requireString(entry.title, `sources[${index}].title`),
      publisher: requireString(entry.publisher, `sources[${index}].publisher`),
      sourceClass,
    } as PublicResearchSourceInput;
  });

  const claims = value.claims.map((entry, index) => {
    if (!isRecord(entry)) throw new Error(`claims[${index}] must be an object`);
    return {
      ...entry,
      statement: requireString(entry.statement, `claims[${index}].statement`),
      uncertainty: requireString(entry.uncertainty, `claims[${index}].uncertainty`),
      supportingCitations: citationArray(
        entry.supportingCitations,
        `claims[${index}].supportingCitations`,
        sources.length,
        1
      ),
      contradictingCitations: citationArray(
        entry.contradictingCitations ?? [],
        `claims[${index}].contradictingCitations`,
        sources.length,
        0
      ),
    } as PublicResearchClaimInput;
  });

  const manifest = { ...value, sources, claims } as PublicResearchManifest;
  parseResearchBundle(toResearchBundle(manifest, sources.map(() => null), "manifest:validation"));
  return manifest;
}

function sourceIndexes(citations: PublicCitationInput[]): number[] {
  return [...new Set(citations.map((citation) => citation.sourceIndex))];
}

function toResearchBundle(
  manifest: PublicResearchManifest,
  attempts: Array<SourceAttempt | null>,
  fallbackEvidenceRef: string
): ResearchBundleInput {
  return {
    brief: manifest.brief,
    plan: manifest.plan,
    queries: manifest.sources.map((source, index) => ({
      query: source.url,
      rationale:
        source.rationale?.trim() ||
        `Retrieve public source ${index + 1} for ${manifest.brief.decisionQuestion}`,
      tool: "public-http-manifest",
      parentQueryIndex: null,
      resultRefs: attempts[index]?.evidenceRefs ?? [fallbackEvidenceRef],
    })),
    sources: manifest.sources.map((source, index) => ({
      canonicalId: attempts[index]?.capture?.finalUrl ?? source.url,
      title: source.title,
      publisher: source.publisher,
      sourceClass: source.sourceClass,
      version: source.version,
      accessedAt: new Date().toISOString(),
      license: source.license,
      authority: source.authority,
      directness: source.directness,
      freshness: source.freshness,
      applicability: source.applicability,
      independence: source.independence,
      conflictOfInterest: source.conflictOfInterest,
      evidenceRefs: attempts[index]?.evidenceRefs ?? [fallbackEvidenceRef],
    })),
    claims: manifest.claims.map((claim) => ({
      statement: claim.statement,
      claimType: claim.claimType,
      confidence: claim.confidence,
      uncertainty: claim.uncertainty,
      supportingSourceIndexes: sourceIndexes(claim.supportingCitations),
      contradictingSourceIndexes: sourceIndexes(claim.contradictingCitations ?? []),
      expiresAt: claim.expiresAt,
    })),
    contradictions: manifest.contradictions,
    opportunities: manifest.opportunities,
    decision: manifest.decision,
    experiment: manifest.experiment,
    handoff: manifest.handoff,
  };
}

function minutesBetween(startedAt: string, completedAt: string): number {
  return Math.max(1, Math.ceil(Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)) / 60_000));
}

function researchRun(input: {
  cycle: EvolutionCycle;
  actor: string;
  startedAt: string;
  completedAt: string;
  bundle: ResearchBundleInput;
  outcome: ResearchRunRecord["outcome"];
  stopReason: string;
  gaps: string[];
  evidenceRefs: string[];
}): ResearchRunRecord {
  const payload = {
    adapter: "public-http-manifest" as const,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    budget: input.bundle.plan.budget,
    usage: {
      queries: input.bundle.queries.length,
      sources: input.bundle.sources.length,
      minutes: minutesBetween(input.startedAt, input.completedAt),
      costUsd: 0,
    },
    coverage: {
      required: input.bundle.plan.questions,
      answered: input.outcome === "completed" ? input.bundle.plan.questions : [],
      gaps: input.gaps,
    },
    stopReason: input.stopReason,
    outcome: input.outcome,
  };
  return {
    recordId: stableId("research-run", input.cycle.cycleId, payload),
    cycleId: input.cycle.cycleId,
    actor: input.actor,
    createdAt: input.completedAt,
    evidenceRefs: unique(input.evidenceRefs),
    kind: "research-run",
    ...payload,
  };
}

function reviewCheck(
  id: ResearchReviewCheck["id"],
  passed: boolean,
  summary: string,
  evidenceRefs: string[] = []
): ResearchReviewCheck {
  return { id, passed, summary, evidenceRefs: unique(evidenceRefs) };
}

function enrichSources(
  sources: SourceRecord[],
  attempts: SourceAttempt[]
): SourceRecord[] {
  return sources.map((source, index) => {
    const attempt = attempts[index]!;
    const capture = attempt.capture;
    return {
      ...source,
      uri: capture?.finalUrl ?? source.canonicalId,
      mediaType: capture?.mediaType ?? null,
      contentDigest: capture?.contentDigest ?? null,
      retrievalStatus: attempt.error
        ? "failed"
        : capture?.safetyStatus === "quarantined"
          ? "quarantined"
          : "captured",
      safetySignals: capture?.safetySignals ?? [],
      transformation: capture?.transformation ?? null,
      evidenceRefs: unique([...source.evidenceRefs, ...attempt.evidenceRefs]),
    };
  });
}

function citationSpans(input: {
  cycle: EvolutionCycle;
  actor: string;
  now: string;
  manifest: PublicResearchManifest;
  prepared: PreparedResearchHandoff;
  sources: SourceRecord[];
  attempts: SourceAttempt[];
}): CitationSpanRecord[] {
  const spans: CitationSpanRecord[] = [];
  input.manifest.claims.forEach((claim, claimIndex) => {
    const claimRecord = input.prepared.records.claims[claimIndex]!;
    const add = (citation: PublicCitationInput, relation: CitationSpanRecord["relation"]) => {
      const source = input.sources[citation.sourceIndex]!;
      const attempt = input.attempts[citation.sourceIndex]!;
      let located: ReturnType<typeof locateExactCitation> | null = null;
      let verificationError: string | null = attempt.error;
      if (!verificationError && attempt.capture?.safetyStatus === "quarantined") {
        verificationError = `source quarantined: ${attempt.capture.safetySignals.join(", ")}`;
      }
      if (!verificationError && attempt.capture) {
        try {
          located = locateExactCitation(
            attempt.capture.normalizedText,
            citation.quote,
            citation.occurrence ?? 0
          );
        } catch (error) {
          verificationError = error instanceof Error ? error.message : String(error);
        }
      }
      const normalizedQuote = normalizePublicText(citation.quote);
      const payload = {
        claimId: claimRecord.recordId,
        sourceId: source.recordId,
        relation,
        locator: {
          type: "normalized-text-offset" as const,
          start: located?.start ?? 0,
          end: located?.end ?? 0,
          occurrence: citation.occurrence ?? 0,
        },
        quote: located?.quote ?? normalizedQuote,
        quoteDigest: located?.quoteDigest ?? hash(normalizedQuote),
        sourceContentDigest: attempt.capture?.contentDigest ?? "",
        transformation: attempt.capture?.transformation ?? "unavailable",
        verified: verificationError === null && located !== null,
        verificationError,
      };
      spans.push({
        recordId: stableId("citation-span", input.cycle.cycleId, payload),
        cycleId: input.cycle.cycleId,
        actor: input.actor,
        createdAt: input.now,
        evidenceRefs: unique(attempt.evidenceRefs),
        kind: "citation-span",
        ...payload,
      });
    };
    claim.supportingCitations.forEach((citation) => add(citation, "supporting"));
    (claim.contradictingCitations ?? []).forEach((citation) => add(citation, "contradicting"));
  });
  return spans;
}

function buildExternalChecks(input: {
  prepared: PreparedResearchHandoff;
  sources: SourceRecord[];
  spans: CitationSpanRecord[];
}): ResearchReviewCheck[] {
  const sourceById = new Map(input.sources.map((source) => [source.recordId, source]));
  const supportingByClaim = new Map<string, CitationSpanRecord[]>();
  for (const span of input.spans.filter((item) => item.relation === "supporting")) {
    supportingByClaim.set(span.claimId, [...(supportingByClaim.get(span.claimId) ?? []), span]);
  }
  const unverified = input.spans.filter((span) => !span.verified);
  const unsafe = input.sources.filter(
    (source) => source.retrievalStatus !== "captured" || (source.safetySignals?.length ?? 0) > 0
  );
  const weakClaimIds = input.prepared.records.claims
    .filter((claim) => {
      const spans = supportingByClaim.get(claim.recordId) ?? [];
      if (claim.claimType === "limitation") return spans.every((span) => !span.verified);
      if (claim.claimType === "user-problem") return true;
      return !spans.some(
        (span) =>
          span.verified &&
          STRONG_EXTERNAL_SOURCE_CLASSES.has(sourceById.get(span.sourceId)?.sourceClass ?? "unverified")
      );
    })
    .map((claim) => claim.recordId);
  const duplicateCanonicalIds = input.sources
    .map((source) => source.canonicalId)
    .filter((canonicalId, index, all) => all.indexOf(canonicalId) !== index);
  const claimsWithoutVerifiedSupport = input.prepared.records.claims
    .filter(
      (claim) => !(supportingByClaim.get(claim.recordId) ?? []).some((span) => span.verified)
    )
    .map((claim) => claim.recordId);

  return [
    reviewCheck(
      "source-safety",
      unsafe.length === 0,
      unsafe.length === 0
        ? "Every public source passed network, media, size, and hostile-content screening."
        : `${unsafe.length} public source(s) failed retrieval or were quarantined.`,
      unsafe.flatMap((source) => source.evidenceRefs)
    ),
    reviewCheck(
      "citation-integrity",
      unverified.length === 0 && claimsWithoutVerifiedSupport.length === 0,
      unverified.length === 0 && claimsWithoutVerifiedSupport.length === 0
        ? "Every claim has at least one exact verified supporting quote in normalized source text."
        : `${unverified.length} citation span(s) are unverified and ${claimsWithoutVerifiedSupport.length} claim(s) lack verified support.`,
      unverified.flatMap((span) => span.evidenceRefs)
    ),
    reviewCheck(
      "source-strength",
      weakClaimIds.length === 0,
      weakClaimIds.length === 0
        ? "Material external claims use official, primary, or independent reproduction evidence."
        : `${weakClaimIds.length} material claim(s) lack sufficiently direct external evidence.`,
      weakClaimIds
    ),
    reviewCheck(
      "source-deduplication",
      duplicateCanonicalIds.length === 0,
      duplicateCanonicalIds.length === 0
        ? "Canonical public source URLs are unique."
        : `Duplicate canonical source URLs: ${unique(duplicateCanonicalIds).join(", ")}.`
    ),
  ];
}

function finalEvaluation(input: {
  base: ResearchEvaluationRecord;
  run: ResearchRunRecord;
  checks: ResearchReviewCheck[];
  spans: CitationSpanRecord[];
  sources: SourceRecord[];
  reviewerActor: string;
  now: string;
  evidenceRefs: string[];
}): ResearchEvaluationRecord {
  const checks = [...input.base.checks, ...input.checks];
  const verdict: ResearchEvaluationRecord["verdict"] =
    input.run.outcome === "inconclusive"
      ? "inconclusive"
      : checks.every((check) => check.passed)
        ? "pass"
        : "revise";
  const verifiedCitationSpanIds = input.spans.filter((span) => span.verified).map((span) => span.recordId);
  const unverifiedCitationSpanIds = input.spans.filter((span) => !span.verified).map((span) => span.recordId);
  const quarantinedSourceIds = input.sources
    .filter((source) => source.retrievalStatus === "quarantined")
    .map((source) => source.recordId);
  const limitations = unique([
    ...input.base.limitations,
    "This adapter retrieves an explicit URL manifest; it does not discover or rank the wider web.",
    "Normalized-text offsets are reproducible for the captured transformation, not the publisher's original DOM layout.",
  ]);
  const payload = {
    researcherActor: input.base.researcherActor,
    reviewerActor: input.reviewerActor,
    verdict,
    checks,
    unsupportedClaimIds: input.base.unsupportedClaimIds,
    unresolvedContradictionIds: input.base.unresolvedContradictionIds,
    stopReason: input.run.stopReason,
    limitations,
    verifiedCitationSpanIds,
    unverifiedCitationSpanIds,
    quarantinedSourceIds,
  };
  return {
    recordId: stableId("research-evaluation", input.base.cycleId, payload),
    cycleId: input.base.cycleId,
    actor: input.reviewerActor,
    createdAt: input.now,
    evidenceRefs: unique(input.evidenceRefs),
    kind: "research-evaluation",
    ...payload,
  };
}

export async function preparePublicSourceResearch(
  cycle: EvolutionCycle,
  rawManifest: unknown,
  options: PublicResearchOptions
): Promise<PublicResearchPreparation> {
  if (cycle.stage !== "modeled") {
    throw new Error(`public source research requires a modeled cycle; current stage is ${cycle.stage}`);
  }
  const actor = options.actor.trim();
  const reviewerActor = options.reviewerActor.trim();
  if (!actor || !reviewerActor) throw new Error("researcher and reviewer actors are required");
  const manifest = parsePublicResearchManifest(rawManifest);
  const startedAt = options.startedAt ?? new Date().toISOString();
  const attempts: SourceAttempt[] = [];
  const budget = manifest.plan.budget;
  const budgetFailure =
    manifest.sources.length > budget.maxSources
      ? `Manifest has ${manifest.sources.length} sources but budget allows ${budget.maxSources}.`
      : manifest.sources.length > budget.maxQueries
        ? `Manifest requires ${manifest.sources.length} retrieval queries but budget allows ${budget.maxQueries}.`
        : budget.maxCostUsd < 0
          ? "Public research cost budget is invalid."
          : null;

  for (const [index, source] of manifest.sources.entries()) {
    if (budgetFailure) {
      const evidence = await options.registry.registerJson("public-source-retrieval-failure", {
        url: source.url,
        error: budgetFailure,
      });
      attempts.push({
        capture: null,
        evidenceRefs: [`evidence:${evidence.occurrenceId}`],
        error: budgetFailure,
      });
      continue;
    }
    const elapsedMinutes = minutesBetween(startedAt, new Date().toISOString());
    if (elapsedMinutes > budget.maxMinutes) {
      const error = `Research time budget ${budget.maxMinutes} minute(s) was exhausted before source ${index + 1}.`;
      const evidence = await options.registry.registerJson("public-source-retrieval-failure", {
        url: source.url,
        error,
      });
      attempts.push({ capture: null, evidenceRefs: [`evidence:${evidence.occurrenceId}`], error });
      continue;
    }
    try {
      const capture = await capturePublicSource(source.url, {
        timeoutMs: options.timeoutMs,
        maxBytes: options.maxSourceBytes,
        fetcher: options.runtime?.fetcher,
        resolveAddresses: options.runtime?.resolveAddresses,
      });
      const content = await options.registry.registerText(
        "public-source-normalized-text",
        capture.normalizedText,
        "text/plain",
        capture.finalUrl
      );
      const metadata = await options.registry.registerJson("public-source-capture", {
        requestedUrl: capture.requestedUrl,
        finalUrl: capture.finalUrl,
        redirectChain: capture.redirectChain,
        mediaType: capture.mediaType,
        byteLength: capture.byteLength,
        contentDigest: capture.contentDigest,
        transformation: capture.transformation,
        safetyStatus: capture.safetyStatus,
        safetySignals: capture.safetySignals,
        contentEvidenceId: content.id,
      });
      attempts.push({
        capture,
        evidenceRefs: [
          `evidence:${content.occurrenceId}`,
          `evidence:${metadata.occurrenceId}`,
        ],
        error: null,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const evidence = await options.registry.registerJson("public-source-retrieval-failure", {
        url: source.url,
        error: reason,
      });
      attempts.push({
        capture: null,
        evidenceRefs: [`evidence:${evidence.occurrenceId}`],
        error: reason,
      });
    }
  }

  const bundle = parseResearchBundle(
    toResearchBundle(manifest, attempts, options.manifestEvidenceRef)
  );
  const now = options.now ?? new Date().toISOString();
  const allEvidenceRefs = unique([
    options.manifestEvidenceRef,
    ...attempts.flatMap((attempt) => attempt.evidenceRefs),
  ]);
  const prepared = prepareResearchToExecution(cycle, bundle, {
    actor,
    now,
    evidenceRefs: allEvidenceRefs,
  });
  const sources = enrichSources(prepared.records.sources, attempts);
  const preparedForReview: PreparedResearchHandoff = {
    ...prepared,
    records: { ...prepared.records, sources },
  };
  const spans = citationSpans({
    cycle,
    actor,
    now,
    manifest,
    prepared: preparedForReview,
    sources,
    attempts,
  });
  const externalChecks = buildExternalChecks({ prepared: preparedForReview, sources, spans });
  const preliminaryPass = externalChecks.every((check) => check.passed) && !budgetFailure;
  const preliminaryReason = preliminaryPass
    ? "All manifest sources were captured safely and every material claim has exact verified citation spans."
    : budgetFailure ??
      externalChecks
        .filter((check) => !check.passed)
        .map((check) => check.summary)
        .join(" ");
  let run = researchRun({
    cycle,
    actor,
    startedAt,
    completedAt: now,
    bundle,
    outcome: preliminaryPass ? "completed" : "inconclusive",
    stopReason: preliminaryReason,
    gaps: preliminaryPass ? ["Broader web discovery and citation chasing"] : bundle.plan.questions,
    evidenceRefs: allEvidenceRefs,
  });
  let base = evaluatePreparedResearch(preparedForReview, {
    reviewerActor,
    now,
    evidenceRefs: allEvidenceRefs,
    run,
  });
  const firstEvaluation = finalEvaluation({
    base,
    run,
    checks: externalChecks,
    spans,
    sources,
    reviewerActor,
    now,
    evidenceRefs: allEvidenceRefs,
  });
  if (firstEvaluation.verdict !== "pass" && run.outcome === "completed") {
    run = researchRun({
      cycle,
      actor,
      startedAt,
      completedAt: now,
      bundle,
      outcome: "inconclusive",
      stopReason: `Independent public-source review did not pass: ${firstEvaluation.checks
        .filter((check) => !check.passed)
        .map((check) => check.id)
        .join(", ")}.`,
      gaps: bundle.plan.questions,
      evidenceRefs: allEvidenceRefs,
    });
    base = evaluatePreparedResearch(preparedForReview, {
      reviewerActor,
      now,
      evidenceRefs: allEvidenceRefs,
      run,
    });
  }
  const evaluation = finalEvaluation({
    base,
    run,
    checks: externalChecks,
    spans,
    sources,
    reviewerActor,
    now,
    evidenceRefs: allEvidenceRefs,
  });
  const records = { ...prepared.records, sources };

  if (evaluation.verdict !== "pass") {
    const inconclusive = transitionCycle(prepared.diagnosed, "inconclusive", {
      actor: reviewerActor,
      reason: run.stopReason,
      now,
      addArtifacts: { research: allEvidenceRefs },
      appendResearch: {
        runs: [run],
        queries: records.queries,
        sources,
        claims: records.claims,
        citationSpans: spans,
        contradictions: records.contradictions,
        opportunities: records.opportunities,
        evaluations: [evaluation],
      },
    });
    return {
      outcome: "inconclusive",
      reason: run.stopReason,
      diagnosed: prepared.diagnosed,
      inconclusive,
      run,
      evaluation,
      citationSpans: spans,
      records,
    };
  }

  const researched = transitionCycle(prepared.diagnosed, "researched", {
    actor,
    reason: `Captured ${sources.length} public sources and verified ${spans.length} exact citation spans`,
    now,
    addArtifacts: { research: allEvidenceRefs },
    appendResearch: {
      runs: [run],
      queries: records.queries,
      sources,
      claims: records.claims,
      citationSpans: spans,
      contradictions: records.contradictions,
      opportunities: records.opportunities,
    },
  });
  const decided = transitionCycle(researched, "decided", {
    actor: reviewerActor,
    reason: "Independent public-source and citation review passed before decision acceptance",
    now,
    addArtifacts: { decision: allEvidenceRefs },
    appendResearch: { evaluations: [evaluation], decisions: [records.decision] },
  });
  const planned = transitionCycle(decided, "planned", {
    actor,
    reason: "Prepared the externally reviewed reversible experiment and execution handoff",
    now,
    addArtifacts: { plan: allEvidenceRefs, rollback: allEvidenceRefs },
    appendResearch: {
      experiments: [records.experiment],
      executionHandoffs: [records.executionHandoff],
    },
  });

  return {
    outcome: "completed",
    diagnosed: prepared.diagnosed,
    researched,
    decided,
    planned,
    run,
    evaluation,
    citationSpans: spans,
    records,
  };
}

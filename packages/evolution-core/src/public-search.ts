import { createHash } from "node:crypto";
import type { EvidenceRegistry } from "./evidence.js";
import {
  preparePublicSourceResearch,
  type PublicResearchManifest,
  type PublicResearchPreparation,
  type PublicResearchRuntime,
  type PublicResearchSourceInput,
} from "./public-research.js";
import {
  capturePublicSource,
  type AddressResolver,
  type PublicFetch,
} from "./public-source.js";
import { transitionCycle } from "./state-machine.js";
import type {
  EvolutionCycle,
  QueryRecord,
  ResearchEvaluationRecord,
  ResearchReviewCheck,
  ResearchRunRecord,
  SourceRecord,
} from "./types.js";

const DEFAULT_SEARCH_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_SEARCH_BYTES = 512 * 1024;
const DEFAULT_MAX_RESULT_AGE_MINUTES = 60;
const MAX_RESULTS_PER_QUERY = 10;
const GITHUB_SEARCH_HOST = "api.github.com";
const GITHUB_PROVIDER_ID = "github-repository-search";

export type PublicSearchIntent = "support" | "falsification" | "comparison";

export type PublicSearchQueryInput = {
  query: string;
  rationale: string;
  intent: PublicSearchIntent;
  maxResults: number;
};

export type PublicSearchSelectionInput = Omit<PublicResearchSourceInput, "url" | "title"> & {
  queryIndex: number;
  rank: number;
  title?: string;
  publisher?: string;
};

export type PublicSearchManifest = Omit<PublicResearchManifest, "sources"> & {
  provider: string;
  queries: PublicSearchQueryInput[];
  selections: PublicSearchSelectionInput[];
  maxResultAgeMinutes?: number;
};

export type PublicSearchResult = {
  provider: string;
  query: string;
  rank: number;
  title: string;
  canonicalUrl: string;
  retrievalUrl: string;
  snippet: string;
  updatedAt: string | null;
  providerScore: number | null;
  resultDigest: string;
};

export type PublicSearchResponse = {
  provider: string;
  query: string;
  searchedAt: string;
  responseDigest: string;
  totalCount: number;
  incomplete: boolean;
  rawResponseDigest: string;
  results: PublicSearchResult[];
};

export type PublicSearchRequest = {
  query: string;
  maxResults: number;
  now: string;
  timeoutMs?: number;
  maxBytes?: number;
  fetcher?: PublicFetch;
  resolveAddresses?: AddressResolver;
};

export type PublicSearchProvider = {
  id: string;
  search: (request: PublicSearchRequest) => Promise<PublicSearchResponse>;
};

export type PublicSearchRuntime = {
  provider?: PublicSearchProvider;
  fetcher?: PublicFetch;
  resolveAddresses?: AddressResolver;
  sourceRuntime?: PublicResearchRuntime;
};

export type PublicSearchOptions = {
  actor: string;
  reviewerActor: string;
  registry: EvidenceRegistry;
  manifestEvidenceRef: string;
  now?: string;
  startedAt?: string;
  searchTimeoutMs?: number;
  maxSearchBytes?: number;
  sourceTimeoutMs?: number;
  maxSourceBytes?: number;
  runtime?: PublicSearchRuntime;
};

type SearchEvidence = {
  response: PublicSearchResponse;
  evidenceRef: string;
};

type ResolvedSelection = {
  selection: PublicSearchSelectionInput;
  result: PublicSearchResult;
  responseEvidenceRef: string;
};

type SearchRecords = PublicResearchPreparation["records"];

export type CompletedPublicSearchResearch = {
  outcome: "completed";
  diagnosed: EvolutionCycle;
  researched: EvolutionCycle;
  decided: EvolutionCycle;
  planned: EvolutionCycle;
  run: ResearchRunRecord;
  evaluation: ResearchEvaluationRecord;
  citationSpans: PublicResearchPreparation["citationSpans"];
  records: SearchRecords;
  searchResponses: PublicSearchResponse[];
  selectedResults: PublicSearchResult[];
};

export type InconclusivePublicSearchResearch = {
  outcome: "inconclusive";
  reason: string;
  diagnosed: EvolutionCycle;
  inconclusive: EvolutionCycle;
  run: ResearchRunRecord;
  evaluation: ResearchEvaluationRecord;
  citationSpans: PublicResearchPreparation["citationSpans"];
  records: SearchRecords | null;
  searchResponses: PublicSearchResponse[];
  selectedResults: PublicSearchResult[];
};

export type PublicSearchPreparation =
  | CompletedPublicSearchResearch
  | InconclusivePublicSearchResearch;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function stableId(kind: string, cycleId: string, payload: unknown): string {
  return `${kind}:${sha256({ kind, cycleId, payload }).slice(0, 24)}`;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
}

function positiveInteger(value: unknown, label: string, maximum?: number): number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  const result = Number(value);
  if (maximum !== undefined && result > maximum) {
    throw new Error(`${label} may not exceed ${maximum}`);
  }
  return result;
}

function nonNegativeNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative number`);
  }
  return value;
}

function safeUrl(value: string, label: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`${label} must use http or https`);
  }
  if (url.username || url.password) throw new Error(`${label} may not contain credentials`);
  if (
    (url.protocol === "http:" && url.port && url.port !== "80") ||
    (url.protocol === "https:" && url.port && url.port !== "443")
  ) {
    throw new Error(`${label} may only use standard HTTP(S) ports`);
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error(`${label} hostname is not allowed`);
  }
  url.hash = "";
  return url;
}

function canonicalizeUrl(value: string, label: string): string {
  const url = safeUrl(value, label);
  const ignored = new Set([
    "fbclid",
    "gclid",
    "mc_cid",
    "mc_eid",
    "ref",
    "source",
  ]);
  const entries = [...url.searchParams.entries()]
    .filter(([key]) => !key.toLowerCase().startsWith("utm_") && !ignored.has(key.toLowerCase()))
    .sort(([aKey, aValue], [bKey, bValue]) =>
      aKey === bKey ? aValue.localeCompare(bValue) : aKey.localeCompare(bKey)
    );
  url.search = "";
  for (const [key, item] of entries) url.searchParams.append(key, item);
  return url.toString();
}

function resultDigest(result: Omit<PublicSearchResult, "resultDigest">): string {
  return sha256(result);
}

function responseDigest(response: Omit<PublicSearchResponse, "responseDigest" | "searchedAt">): string {
  return sha256(response);
}

function validateDate(value: string, label: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(`${label} must be a valid timestamp`);
  return timestamp;
}

export function parsePublicSearchManifest(value: unknown): PublicSearchManifest {
  if (!isRecord(value)) throw new Error("public search manifest must be an object");
  const provider = requiredString(value.provider, "provider");
  if (!Array.isArray(value.queries) || value.queries.length < 2) {
    throw new Error("public search manifest requires at least two queries");
  }
  const seenQueries = new Set<string>();
  const queries = value.queries.map((entry, index) => {
    if (!isRecord(entry)) throw new Error(`queries[${index}] must be an object`);
    const query = requiredString(entry.query, `queries[${index}].query`);
    const normalized = query.toLowerCase();
    if (seenQueries.has(normalized)) throw new Error(`duplicate search query: ${query}`);
    seenQueries.add(normalized);
    const intent = requiredString(entry.intent, `queries[${index}].intent`) as PublicSearchIntent;
    if (!(["support", "falsification", "comparison"] as const).includes(intent)) {
      throw new Error(`queries[${index}].intent is invalid`);
    }
    return {
      query,
      rationale: requiredString(entry.rationale, `queries[${index}].rationale`),
      intent,
      maxResults: positiveInteger(entry.maxResults, `queries[${index}].maxResults`, MAX_RESULTS_PER_QUERY),
    };
  });
  if (!queries.some((query) => query.intent === "support")) {
    throw new Error("public search manifest requires at least one support query");
  }
  if (!queries.some((query) => query.intent === "falsification")) {
    throw new Error("public search manifest requires at least one falsification query");
  }

  if (!Array.isArray(value.selections) || value.selections.length === 0) {
    throw new Error("public search manifest requires at least one selected result");
  }
  const selections = value.selections.map((entry, index) => {
    if (!isRecord(entry)) throw new Error(`selections[${index}] must be an object`);
    const queryIndex = Number(entry.queryIndex);
    if (!Number.isInteger(queryIndex) || queryIndex < 0 || queryIndex >= queries.length) {
      throw new Error(`selections[${index}].queryIndex must reference an existing query`);
    }
    const rank = positiveInteger(entry.rank, `selections[${index}].rank`);
    if (rank > queries[queryIndex]!.maxResults) {
      throw new Error(`selections[${index}].rank exceeds the query result limit`);
    }
    return {
      ...entry,
      queryIndex,
      rank,
      publisher:
        entry.publisher === undefined ? undefined : requiredString(entry.publisher, `selections[${index}].publisher`),
      title: entry.title === undefined ? undefined : requiredString(entry.title, `selections[${index}].title`),
    } as PublicSearchSelectionInput;
  });
  if (!selections.some((selection) => queries[selection.queryIndex]!.intent === "falsification")) {
    throw new Error("public search manifest must select at least one falsification result");
  }

  const plan = isRecord(value.plan) ? value.plan : null;
  const budget = plan && isRecord(plan.budget) ? plan.budget : null;
  if (!budget) throw new Error("public search manifest plan.budget is required");
  const maxQueries = positiveInteger(budget.maxQueries, "plan.budget.maxQueries");
  const maxSources = positiveInteger(budget.maxSources, "plan.budget.maxSources");
  positiveInteger(budget.maxMinutes, "plan.budget.maxMinutes");
  nonNegativeNumber(budget.maxCostUsd, "plan.budget.maxCostUsd");
  const operationCount = queries.length + selections.length;
  if (operationCount > maxQueries) {
    throw new Error(
      `public search requires ${operationCount} search/retrieval operations but budget allows ${maxQueries}`
    );
  }
  if (selections.length > maxSources) {
    throw new Error(
      `public search selects ${selections.length} sources but budget allows ${maxSources}`
    );
  }

  const maxResultAgeMinutes =
    value.maxResultAgeMinutes === undefined
      ? DEFAULT_MAX_RESULT_AGE_MINUTES
      : positiveInteger(value.maxResultAgeMinutes, "maxResultAgeMinutes");

  return {
    ...(value as unknown as PublicSearchManifest),
    provider,
    queries,
    selections,
    maxResultAgeMinutes,
  };
}

function githubResult(item: unknown, query: string, rank: number): PublicSearchResult {
  if (!isRecord(item)) throw new Error(`search result ${rank} must be an object`);
  const title = requiredString(item.full_name, `search result ${rank}.full_name`);
  const canonicalUrl = canonicalizeUrl(
    requiredString(item.html_url, `search result ${rank}.html_url`),
    `search result ${rank}.html_url`
  );
  const retrievalUrl = canonicalizeUrl(
    requiredString(item.url, `search result ${rank}.url`),
    `search result ${rank}.url`
  );
  if (new URL(canonicalUrl).hostname.toLowerCase() !== "github.com") {
    throw new Error(`search result ${rank} canonical URL must use github.com`);
  }
  if (new URL(retrievalUrl).hostname.toLowerCase() !== GITHUB_SEARCH_HOST) {
    throw new Error(`search result ${rank} retrieval URL must use ${GITHUB_SEARCH_HOST}`);
  }
  const snippet = typeof item.description === "string" ? item.description.trim() : "";
  const updatedAt =
    item.updated_at === null || item.updated_at === undefined
      ? null
      : requiredString(item.updated_at, `search result ${rank}.updated_at`);
  if (updatedAt !== null) validateDate(updatedAt, `search result ${rank}.updated_at`);
  const providerScore =
    typeof item.score === "number" && Number.isFinite(item.score) ? item.score : null;
  const base = {
    provider: GITHUB_PROVIDER_ID,
    query,
    rank,
    title,
    canonicalUrl,
    retrievalUrl,
    snippet,
    updatedAt,
    providerScore,
  };
  return { ...base, resultDigest: resultDigest(base) };
}

export function createGitHubRepositorySearchProvider(): PublicSearchProvider {
  return {
    id: GITHUB_PROVIDER_ID,
    async search(request): Promise<PublicSearchResponse> {
      const timeoutMs = request.timeoutMs ?? DEFAULT_SEARCH_TIMEOUT_MS;
      const maxBytes = request.maxBytes ?? DEFAULT_MAX_SEARCH_BYTES;
      positiveInteger(timeoutMs, "search timeoutMs");
      positiveInteger(maxBytes, "search maxBytes");
      positiveInteger(request.maxResults, "search maxResults", MAX_RESULTS_PER_QUERY);
      validateDate(request.now, "search now");

      const endpoint = new URL("https://api.github.com/search/repositories");
      endpoint.searchParams.set("q", request.query);
      endpoint.searchParams.set("per_page", String(request.maxResults));
      endpoint.searchParams.set("page", "1");
      const capture = await capturePublicSource(endpoint.toString(), {
        timeoutMs,
        maxBytes,
        fetcher: request.fetcher,
        resolveAddresses: request.resolveAddresses,
      });
      if (capture.mediaType !== "application/json") {
        throw new Error(`search provider returned unsupported media type: ${capture.mediaType}`);
      }
      if (capture.safetyStatus !== "clean") {
        throw new Error(
          `search provider response was quarantined: ${capture.safetySignals.join(", ")}`
        );
      }
      let payload: unknown;
      try {
        payload = JSON.parse(capture.normalizedText);
      } catch {
        throw new Error("search provider returned invalid JSON");
      }
      if (!isRecord(payload) || !Array.isArray(payload.items)) {
        throw new Error("search provider response does not contain ranked items");
      }
      const results = payload.items
        .slice(0, request.maxResults)
        .map((item, index) => githubResult(item, request.query, index + 1));
      if (results.length === 0) throw new Error("search provider returned no results");
      const responseBase = {
        provider: GITHUB_PROVIDER_ID,
        query: request.query,
        totalCount:
          typeof payload.total_count === "number" && Number.isFinite(payload.total_count)
            ? payload.total_count
            : results.length,
        incomplete: payload.incomplete_results === true,
        rawResponseDigest: capture.contentDigest,
        results,
      };
      return {
        ...responseBase,
        searchedAt: request.now,
        responseDigest: responseDigest(responseBase),
      };
    },
  };
}

function validateSearchResponse(
  response: PublicSearchResponse,
  query: PublicSearchQueryInput,
  providerId: string,
  now: string,
  maxResultAgeMinutes: number
): void {
  if (response.provider !== providerId) throw new Error("search response provider mismatch");
  if (response.query !== query.query) throw new Error("search response query mismatch");
  const searchedAt = validateDate(response.searchedAt, "search response searchedAt");
  const nowTimestamp = validateDate(now, "search now");
  const ageMs = nowTimestamp - searchedAt;
  if (ageMs < -60_000) throw new Error("search response timestamp is in the future");
  if (ageMs > maxResultAgeMinutes * 60_000) {
    throw new Error(`search response is older than ${maxResultAgeMinutes} minute(s)`);
  }
  if (!Number.isFinite(response.totalCount) || response.totalCount < 0) {
    throw new Error("search response totalCount is invalid");
  }
  if (response.incomplete) throw new Error("search provider reported incomplete results");
  if (response.results.length === 0 || response.results.length > query.maxResults) {
    throw new Error("search response result count is invalid");
  }
  const canonicalUrls = new Set<string>();
  response.results.forEach((result, index) => {
    const expectedRank = index + 1;
    if (result.provider !== providerId || result.query !== query.query) {
      throw new Error(`search result ${expectedRank} provider/query mismatch`);
    }
    if (result.rank !== expectedRank) throw new Error(`search result rank ${result.rank} is not contiguous`);
    const canonicalUrl = canonicalizeUrl(result.canonicalUrl, `search result ${expectedRank}.canonicalUrl`);
    const retrievalUrl = canonicalizeUrl(result.retrievalUrl, `search result ${expectedRank}.retrievalUrl`);
    if (canonicalUrl !== result.canonicalUrl || retrievalUrl !== result.retrievalUrl) {
      throw new Error(`search result ${expectedRank} URL is not canonical`);
    }
    if (canonicalUrls.has(canonicalUrl)) throw new Error(`duplicate search result URL: ${canonicalUrl}`);
    canonicalUrls.add(canonicalUrl);
    const { resultDigest: supplied, ...base } = result;
    if (supplied !== resultDigest(base)) throw new Error(`search result ${expectedRank} digest mismatch`);
  });
  const { responseDigest: supplied, searchedAt: _searchedAt, ...base } = response;
  if (supplied !== responseDigest(base)) throw new Error("search response digest mismatch");
}

function searchQueryRecord(input: {
  cycle: EvolutionCycle;
  actor: string;
  now: string;
  query: PublicSearchQueryInput;
  response: PublicSearchResponse;
  evidenceRef: string;
}): QueryRecord {
  const payload = {
    query: input.query.query,
    rationale: `${input.query.intent}: ${input.query.rationale}`,
    tool: `public-search:${input.response.provider}`,
    parentQueryId: null,
    resultRefs: [input.evidenceRef],
  };
  return {
    recordId: stableId("query", input.cycle.cycleId, payload),
    cycleId: input.cycle.cycleId,
    actor: input.actor,
    createdAt: input.now,
    evidenceRefs: [input.evidenceRef],
    kind: "query",
    ...payload,
  };
}

function retrievalQueryRecord(input: {
  cycle: EvolutionCycle;
  actor: string;
  now: string;
  base: QueryRecord;
  parentQueryId: string;
  selection: ResolvedSelection;
}): QueryRecord {
  const payload = {
    query: input.selection.result.retrievalUrl,
    rationale: `Capture rank ${input.selection.result.rank} from ${input.selection.result.provider} for exact citation verification`,
    tool: "public-http-capture",
    parentQueryId: input.parentQueryId,
    resultRefs: unique([...input.base.resultRefs, input.selection.responseEvidenceRef]),
  };
  return {
    recordId: stableId("query", input.cycle.cycleId, payload),
    cycleId: input.cycle.cycleId,
    actor: input.actor,
    createdAt: input.now,
    evidenceRefs: payload.resultRefs,
    kind: "query",
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

function transformedRun(input: {
  base: ResearchRunRecord;
  cycle: EvolutionCycle;
  actor: string;
  now: string;
  evidenceRefs: string[];
  queryCount: number;
  sourceCount: number;
  outcome?: ResearchRunRecord["outcome"];
  stopReason?: string;
}): ResearchRunRecord {
  const payload = {
    adapter: "public-search" as const,
    startedAt: input.base.startedAt,
    completedAt: input.now,
    budget: input.base.budget,
    usage: {
      ...input.base.usage,
      queries: input.queryCount,
      sources: input.sourceCount,
      costUsd: 0,
    },
    coverage: input.base.coverage,
    stopReason: input.stopReason ?? input.base.stopReason,
    outcome: input.outcome ?? input.base.outcome,
  };
  return {
    recordId: stableId("research-run", input.cycle.cycleId, payload),
    cycleId: input.cycle.cycleId,
    actor: input.actor,
    createdAt: input.now,
    evidenceRefs: unique([...input.base.evidenceRefs, ...input.evidenceRefs]),
    kind: "research-run",
    ...payload,
  };
}

function transformedEvaluation(input: {
  base: ResearchEvaluationRecord;
  cycle: EvolutionCycle;
  reviewerActor: string;
  now: string;
  run: ResearchRunRecord;
  evidenceRefs: string[];
  checks: ResearchReviewCheck[];
}): ResearchEvaluationRecord {
  const checks = [...input.base.checks, ...input.checks];
  const verdict: ResearchEvaluationRecord["verdict"] =
    input.run.outcome === "inconclusive"
      ? "inconclusive"
      : checks.every((check) => check.passed)
        ? "pass"
        : "revise";
  const limitations = unique([
    ...input.base.limitations.filter(
      (item) => item !== "This adapter retrieves an explicit URL manifest; it does not discover or rank the wider web."
    ),
    "Discovery currently uses one public GitHub repository-search provider, not a general web index.",
    "Provider ranking can change between runs; each response and rank is persisted with a digest and timestamp.",
    "The adapter does not yet reformulate queries, chase citations, render JavaScript pages, or ingest direct user evidence.",
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
    verifiedCitationSpanIds: input.base.verifiedCitationSpanIds ?? [],
    unverifiedCitationSpanIds: input.base.unverifiedCitationSpanIds ?? [],
    quarantinedSourceIds: input.base.quarantinedSourceIds ?? [],
  };
  return {
    recordId: stableId("research-evaluation", input.cycle.cycleId, payload),
    cycleId: input.cycle.cycleId,
    actor: input.reviewerActor,
    createdAt: input.now,
    evidenceRefs: unique([...input.base.evidenceRefs, ...input.evidenceRefs]),
    kind: "research-evaluation",
    ...payload,
  };
}

function rebuildFromPublicPreparation(input: {
  cycle: EvolutionCycle;
  base: PublicResearchPreparation;
  manifest: PublicSearchManifest;
  actor: string;
  reviewerActor: string;
  now: string;
  searchEvidence: SearchEvidence[];
  selections: ResolvedSelection[];
}): PublicSearchPreparation {
  const evidenceRefs = input.searchEvidence.map((item) => item.evidenceRef);
  const searchQueries = input.searchEvidence.map((item, index) =>
    searchQueryRecord({
      cycle: input.cycle,
      actor: input.actor,
      now: input.now,
      query: input.manifest.queries[index]!,
      response: item.response,
      evidenceRef: item.evidenceRef,
    })
  );
  const retrievalQueries = input.base.records.queries.map((baseQuery, index) => {
    const selection = input.selections[index]!;
    return retrievalQueryRecord({
      cycle: input.cycle,
      actor: input.actor,
      now: input.now,
      base: baseQuery,
      parentQueryId: searchQueries[selection.selection.queryIndex]!.recordId,
      selection,
    });
  });
  const sources: SourceRecord[] = input.base.records.sources.map((source, index) => ({
    ...source,
    evidenceRefs: unique([...source.evidenceRefs, input.selections[index]!.responseEvidenceRef]),
  }));
  const records: SearchRecords = {
    ...input.base.records,
    queries: [...searchQueries, ...retrievalQueries],
    sources,
  };
  let run = transformedRun({
    base: input.base.run,
    cycle: input.cycle,
    actor: input.actor,
    now: input.now,
    evidenceRefs,
    queryCount: records.queries.length,
    sourceCount: sources.length,
  });
  const checks = [
    reviewCheck(
      "search-reproducibility",
      true,
      "Every search query stores provider, timestamp, rank order, response digest, result digest, and evidence reference.",
      evidenceRefs
    ),
    reviewCheck(
      "search-result-integrity",
      true,
      "All selected results are fresh, canonical, uniquely ranked, digest-verified, and linked to captured sources.",
      evidenceRefs
    ),
    reviewCheck(
      "falsification-search",
      input.selections.some(
        (selection) => input.manifest.queries[selection.selection.queryIndex]!.intent === "falsification"
      ),
      "At least one falsification query produced a selected source for independent review.",
      evidenceRefs
    ),
  ];
  let evaluation = transformedEvaluation({
    base: input.base.evaluation,
    cycle: input.cycle,
    reviewerActor: input.reviewerActor,
    now: input.now,
    run,
    evidenceRefs,
    checks,
  });
  if (evaluation.verdict !== "pass" && run.outcome === "completed") {
    run = transformedRun({
      base: run,
      cycle: input.cycle,
      actor: input.actor,
      now: input.now,
      evidenceRefs,
      queryCount: records.queries.length,
      sourceCount: sources.length,
      outcome: "inconclusive",
      stopReason: `Independent public-search review did not pass: ${evaluation.checks
        .filter((check) => !check.passed)
        .map((check) => check.id)
        .join(", ")}.`,
    });
    evaluation = transformedEvaluation({
      base: input.base.evaluation,
      cycle: input.cycle,
      reviewerActor: input.reviewerActor,
      now: input.now,
      run,
      evidenceRefs,
      checks,
    });
  }
  const allEvidenceRefs = unique([
    ...evidenceRefs,
    ...run.evidenceRefs,
    ...sources.flatMap((source) => source.evidenceRefs),
  ]);
  const selectedResults = input.selections.map((selection) => selection.result);
  const searchResponses = input.searchEvidence.map((item) => item.response);

  if (evaluation.verdict !== "pass" || input.base.outcome === "inconclusive") {
    const inconclusive = transitionCycle(input.base.diagnosed, "inconclusive", {
      actor: input.reviewerActor,
      reason: run.stopReason,
      now: input.now,
      addArtifacts: { research: allEvidenceRefs },
      appendResearch: {
        runs: [run],
        queries: records.queries,
        sources,
        claims: records.claims,
        citationSpans: input.base.citationSpans,
        contradictions: records.contradictions,
        opportunities: records.opportunities,
        evaluations: [evaluation],
      },
    });
    return {
      outcome: "inconclusive",
      reason: run.stopReason,
      diagnosed: input.base.diagnosed,
      inconclusive,
      run,
      evaluation,
      citationSpans: input.base.citationSpans,
      records,
      searchResponses,
      selectedResults,
    };
  }

  const researched = transitionCycle(input.base.diagnosed, "researched", {
    actor: input.actor,
    reason: `Ran ${searchQueries.length} reproducible searches, captured ${sources.length} selected sources, and verified ${input.base.citationSpans.length} citation spans`,
    now: input.now,
    addArtifacts: { research: allEvidenceRefs },
    appendResearch: {
      runs: [run],
      queries: records.queries,
      sources,
      claims: records.claims,
      citationSpans: input.base.citationSpans,
      contradictions: records.contradictions,
      opportunities: records.opportunities,
    },
  });
  const decided = transitionCycle(researched, "decided", {
    actor: input.reviewerActor,
    reason: "Independent public-search, source, citation, and falsification review passed",
    now: input.now,
    addArtifacts: { decision: allEvidenceRefs },
    appendResearch: { evaluations: [evaluation], decisions: [records.decision] },
  });
  const planned = transitionCycle(decided, "planned", {
    actor: input.actor,
    reason: "Prepared the search-grounded reversible experiment and execution handoff",
    now: input.now,
    addArtifacts: { plan: allEvidenceRefs, rollback: allEvidenceRefs },
    appendResearch: {
      experiments: [records.experiment],
      executionHandoffs: [records.executionHandoff],
    },
  });
  return {
    outcome: "completed",
    diagnosed: input.base.diagnosed,
    researched,
    decided,
    planned,
    run,
    evaluation,
    citationSpans: input.base.citationSpans,
    records,
    searchResponses,
    selectedResults,
  };
}

function emptySearchFailure(input: {
  cycle: EvolutionCycle;
  actor: string;
  reviewerActor: string;
  startedAt: string;
  now: string;
  manifest: PublicSearchManifest;
  reason: string;
  evidenceRefs: string[];
  searchResponses: PublicSearchResponse[];
  queryRecords: QueryRecord[];
  selectedResults?: PublicSearchResult[];
}): InconclusivePublicSearchResearch {
  const diagnosed = transitionCycle(input.cycle, "diagnosed", {
    actor: input.actor,
    reason: "Public search discovery started but could not produce a reviewable source set",
    now: input.now,
    addArtifacts: { diagnosis: input.evidenceRefs, candidates: input.evidenceRefs },
  });
  const payload = {
    adapter: "public-search" as const,
    startedAt: input.startedAt,
    completedAt: input.now,
    budget: input.manifest.plan.budget,
    usage: {
      queries: input.queryRecords.length,
      sources: input.selectedResults?.length ?? 0,
      minutes: Math.max(
        1,
        Math.ceil(
          Math.max(0, Date.parse(input.now) - Date.parse(input.startedAt)) / 60_000
        )
      ),
      costUsd: 0,
    },
    coverage: {
      required: input.manifest.plan.questions,
      answered: [],
      gaps: input.manifest.plan.questions,
    },
    stopReason: input.reason,
    outcome: "inconclusive" as const,
  };
  const run: ResearchRunRecord = {
    recordId: stableId("research-run", input.cycle.cycleId, payload),
    cycleId: input.cycle.cycleId,
    actor: input.actor,
    createdAt: input.now,
    evidenceRefs: unique(input.evidenceRefs),
    kind: "research-run",
    ...payload,
  };
  const checks: ResearchReviewCheck[] = [
    reviewCheck("search-reproducibility", false, input.reason, input.evidenceRefs),
    reviewCheck("search-result-integrity", false, input.reason, input.evidenceRefs),
    reviewCheck(
      "falsification-search",
      input.manifest.queries.some((query) => query.intent === "falsification"),
      "The precommitted manifest includes a falsification query, but the search run did not reach an accepted decision.",
      input.evidenceRefs
    ),
  ];
  const evaluationPayload = {
    researcherActor: input.actor,
    reviewerActor: input.reviewerActor,
    verdict: "inconclusive" as const,
    checks,
    unsupportedClaimIds: [],
    unresolvedContradictionIds: [],
    stopReason: input.reason,
    limitations: [
      "Search discovery failed closed before a source-backed decision was accepted.",
      "The baseline supports one public GitHub repository-search provider only.",
    ],
    verifiedCitationSpanIds: [],
    unverifiedCitationSpanIds: [],
    quarantinedSourceIds: [],
  };
  const evaluation: ResearchEvaluationRecord = {
    recordId: stableId("research-evaluation", input.cycle.cycleId, evaluationPayload),
    cycleId: input.cycle.cycleId,
    actor: input.reviewerActor,
    createdAt: input.now,
    evidenceRefs: unique(input.evidenceRefs),
    kind: "research-evaluation",
    ...evaluationPayload,
  };
  const inconclusive = transitionCycle(diagnosed, "inconclusive", {
    actor: input.reviewerActor,
    reason: input.reason,
    now: input.now,
    addArtifacts: { research: input.evidenceRefs },
    appendResearch: {
      runs: [run],
      queries: input.queryRecords,
      evaluations: [evaluation],
    },
  });
  return {
    outcome: "inconclusive",
    reason: input.reason,
    diagnosed,
    inconclusive,
    run,
    evaluation,
    citationSpans: [],
    records: null,
    searchResponses: input.searchResponses,
    selectedResults: input.selectedResults ?? [],
  };
}

export async function preparePublicSearchResearch(
  cycle: EvolutionCycle,
  rawManifest: unknown,
  options: PublicSearchOptions
): Promise<PublicSearchPreparation> {
  if (cycle.stage !== "modeled") {
    throw new Error(`public search research requires a modeled cycle; current stage is ${cycle.stage}`);
  }
  const actor = options.actor.trim();
  const reviewerActor = options.reviewerActor.trim();
  if (!actor || !reviewerActor) throw new Error("researcher and reviewer actors are required");
  if (actor === reviewerActor) throw new Error("public search reviewer must differ from researcher");
  const manifest = parsePublicSearchManifest(rawManifest);
  const startedAt = options.startedAt ?? new Date().toISOString();
  const now = options.now ?? new Date().toISOString();
  validateDate(startedAt, "search startedAt");
  validateDate(now, "search now");
  const provider = options.runtime?.provider ?? createGitHubRepositorySearchProvider();
  const searchEvidence: SearchEvidence[] = [];
  const queryRecords: QueryRecord[] = [];
  const searchResponses: PublicSearchResponse[] = [];

  if (provider.id !== manifest.provider) {
    const failure = await options.registry.registerJson("public-search-failure", {
      provider: manifest.provider,
      error: `unsupported public search provider: ${manifest.provider}`,
    });
    return emptySearchFailure({
      cycle,
      actor,
      reviewerActor,
      startedAt,
      now,
      manifest,
      reason: `Unsupported public search provider: ${manifest.provider}.`,
      evidenceRefs: [`evidence:${failure.occurrenceId}`],
      searchResponses,
      queryRecords,
    });
  }

  for (const query of manifest.queries) {
    const elapsedMinutes = Math.max(
      1,
      Math.ceil(Math.max(0, Date.parse(now) - Date.parse(startedAt)) / 60_000)
    );
    if (elapsedMinutes > manifest.plan.budget.maxMinutes) {
      const reason = `Research time budget ${manifest.plan.budget.maxMinutes} minute(s) was exhausted before query ${query.query}.`;
      const failure = await options.registry.registerJson("public-search-failure", {
        provider: provider.id,
        query: query.query,
        error: reason,
      });
      return emptySearchFailure({
        cycle,
        actor,
        reviewerActor,
        startedAt,
        now,
        manifest,
        reason,
        evidenceRefs: unique([
          ...searchEvidence.map((item) => item.evidenceRef),
          `evidence:${failure.occurrenceId}`,
        ]),
        searchResponses,
        queryRecords,
      });
    }
    try {
      const response = await provider.search({
        query: query.query,
        maxResults: query.maxResults,
        now,
        timeoutMs: options.searchTimeoutMs,
        maxBytes: options.maxSearchBytes,
        fetcher: options.runtime?.fetcher,
        resolveAddresses: options.runtime?.resolveAddresses,
      });
      validateSearchResponse(
        response,
        query,
        provider.id,
        now,
        manifest.maxResultAgeMinutes ?? DEFAULT_MAX_RESULT_AGE_MINUTES
      );
      const evidence = await options.registry.registerJson("public-search-response", response);
      const evidenceRef = `evidence:${evidence.occurrenceId}`;
      searchEvidence.push({ response, evidenceRef });
      searchResponses.push(response);
      queryRecords.push(
        searchQueryRecord({ cycle, actor, now, query, response, evidenceRef })
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const failure = await options.registry.registerJson("public-search-failure", {
        provider: provider.id,
        query: query.query,
        error: reason,
      });
      return emptySearchFailure({
        cycle,
        actor,
        reviewerActor,
        startedAt,
        now,
        manifest,
        reason: `Public search failed closed: ${reason}`,
        evidenceRefs: unique([
          ...searchEvidence.map((item) => item.evidenceRef),
          `evidence:${failure.occurrenceId}`,
        ]),
        searchResponses,
        queryRecords,
      });
    }
  }

  const resolvedSelections: ResolvedSelection[] = [];
  const selectedCanonicalUrls = new Set<string>();
  try {
    for (const [index, selection] of manifest.selections.entries()) {
      const search = searchEvidence[selection.queryIndex];
      const result = search?.response.results[selection.rank - 1];
      if (!search || !result) {
        throw new Error(`selection ${index} does not resolve to an existing ranked result`);
      }
      if (selectedCanonicalUrls.has(result.canonicalUrl)) {
        throw new Error(`duplicate selected search result: ${result.canonicalUrl}`);
      }
      selectedCanonicalUrls.add(result.canonicalUrl);
      resolvedSelections.push({ selection, result, responseEvidenceRef: search.evidenceRef });
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const failure = await options.registry.registerJson("public-search-selection-failure", {
      error: reason,
      selections: manifest.selections,
    });
    return emptySearchFailure({
      cycle,
      actor,
      reviewerActor,
      startedAt,
      now,
      manifest,
      reason: `Public search selection failed closed: ${reason}`,
      evidenceRefs: unique([
        ...searchEvidence.map((item) => item.evidenceRef),
        `evidence:${failure.occurrenceId}`,
      ]),
      searchResponses,
      queryRecords,
      selectedResults: resolvedSelections.map((item) => item.result),
    });
  }

  const publicManifest: PublicResearchManifest = {
    ...(manifest as unknown as Omit<PublicResearchManifest, "sources">),
    sources: resolvedSelections.map(({ selection, result }) => ({
      ...selection,
      url: result.retrievalUrl,
      title: selection.title?.trim() || result.title,
      publisher: selection.publisher?.trim() || new URL(result.canonicalUrl).hostname,
    })),
  };
  const base = await preparePublicSourceResearch(cycle, publicManifest, {
    actor,
    reviewerActor,
    registry: options.registry,
    manifestEvidenceRef: options.manifestEvidenceRef,
    now,
    startedAt,
    timeoutMs: options.sourceTimeoutMs,
    maxSourceBytes: options.maxSourceBytes,
    runtime: options.runtime?.sourceRuntime,
  });
  return rebuildFromPublicPreparation({
    cycle,
    base,
    manifest,
    actor,
    reviewerActor,
    now,
    searchEvidence,
    selections: resolvedSelections,
  });
}

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  EvidenceRegistry,
  createCycle,
  createGitHubRepositorySearchProvider,
  preparePublicSearchResearch,
  transitionCycle,
  type EvolutionCycle,
  type PublicFetch,
  type PublicSearchManifest,
} from "./index.js";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function modeledCycle(id = "public:search-001"): EvolutionCycle {
  let cycle = createCycle({
    cycleId: id,
    objective: "Choose the next evidence-backed research improvement",
    autonomy: "A2",
    risk: "R1",
    now: "2026-07-23T15:00:00.000Z",
  });
  cycle = transitionCycle(cycle, "observed", {
    actor: "inspector",
    reason: "captured baseline",
    now: "2026-07-23T15:01:00.000Z",
    addArtifacts: { baseline: ["evidence:baseline"] },
  });
  return transitionCycle(cycle, "modeled", {
    actor: "assessor",
    reason: "created project model",
    now: "2026-07-23T15:02:00.000Z",
    addArtifacts: { model: ["evidence:model"] },
  });
}

function response(
  body: string,
  contentType = "application/json",
  status = 200,
  headers: Record<string, string> = {}
) {
  const normalized = new Map(
    Object.entries({ "content-type": contentType, ...headers }).map(([key, value]) => [
      key.toLowerCase(),
      value,
    ])
  );
  return {
    status,
    headers: { get: (name: string) => normalized.get(name.toLowerCase()) ?? null },
    arrayBuffer: async () => new TextEncoder().encode(body).buffer,
  };
}

const publicResolver = async () => ["140.82.114.5"];

function repositoryItem(input: {
  fullName: string;
  description: string;
  score: number;
}) {
  return {
    full_name: input.fullName,
    html_url: `https://github.com/${input.fullName}`,
    url: `https://api.github.com/repos/${input.fullName}`,
    description: input.description,
    updated_at: "2026-07-22T12:00:00.000Z",
    score: input.score,
  };
}

function searchFetcher(options: { duplicate?: boolean } = {}): PublicFetch {
  return async (url) => {
    const parsed = new URL(url);
    const query = parsed.searchParams.get("q") ?? "";
    const item = query.includes("limitations")
      ? repositoryItem({
          fullName: "example/cyclewarden-limitations",
          description: "Repository search alone is not a general web index.",
          score: 4,
        })
      : repositoryItem({
          fullName: "Thunderkill016/cyclewarden",
          description: "CycleWarden uses bounded search and exact citations.",
          score: 8,
        });
    const items = options.duplicate ? [item, item] : [item];
    return response(
      JSON.stringify({ total_count: items.length, incomplete_results: false, items })
    );
  };
}

function sourceFetcher(): PublicFetch {
  return async (url) => {
    if (url.includes("cyclewarden-limitations")) {
      return response(
        JSON.stringify({
          full_name: "example/cyclewarden-limitations",
          description: "Repository search alone is not a general web index.",
        })
      );
    }
    return response(
      JSON.stringify({
        full_name: "Thunderkill016/cyclewarden",
        description: "CycleWarden uses bounded search and exact citations.",
      })
    );
  };
}

function manifest(): PublicSearchManifest {
  return {
    provider: "github-repository-search",
    maxResultAgeMinutes: 60,
    brief: {
      decisionQuestion: "Should CycleWarden add a reproducible public search baseline before the external pilot?",
      owner: "search-researcher",
      deadline: null,
      assumptions: ["GitHub repository search is a bounded first discovery provider."],
      constraints: ["Use zero-cost public endpoints only."],
      evidenceThreshold: "Every material claim requires an exact verified quote.",
      protectedOutcomes: ["Keep the six-person pilot thresholds unchanged"],
    },
    plan: {
      questions: [
        "Can ranked public discovery be reconstructed?",
        "What limitation could invalidate the recommendation?",
      ],
      sourceStrategy: ["Public repository search", "Falsification search"],
      budget: { maxQueries: 4, maxSources: 2, maxMinutes: 15, maxCostUsd: 0 },
      stopConditions: ["Support and falsification evidence are captured and reviewed."],
    },
    queries: [
      {
        query: "cyclewarden evidence research in:name,description",
        rationale: "Find the primary CycleWarden repository result.",
        intent: "support",
        maxResults: 3,
      },
      {
        query: "cyclewarden limitations archived in:name,description",
        rationale: "Search explicitly for a limitation or contrary implementation.",
        intent: "falsification",
        maxResults: 3,
      },
    ],
    selections: [
      {
        queryIndex: 0,
        rank: 1,
        publisher: "GitHub",
        sourceClass: "primary-technical",
        version: "2026-07",
        license: null,
        authority: 0.9,
        directness: 1,
        freshness: 1,
        applicability: 1,
        independence: 0.5,
        conflictOfInterest: "The repository describes its own implementation.",
      },
      {
        queryIndex: 1,
        rank: 1,
        publisher: "GitHub",
        sourceClass: "community",
        version: "2026-07",
        license: null,
        authority: 0.6,
        directness: 0.8,
        freshness: 1,
        applicability: 0.8,
        independence: 0.9,
        conflictOfInterest: null,
      },
    ],
    claims: [
      {
        statement: "CycleWarden has a bounded search and exact-citation implementation path.",
        claimType: "fact",
        confidence: 0.9,
        uncertainty: "The fixture proves the baseline contract, not external product value.",
        supportingCitations: [
          {
            sourceIndex: 0,
            quote: '"description":"CycleWarden uses bounded search and exact citations."',
          },
        ],
        contradictingCitations: [],
        expiresAt: null,
      },
      {
        statement: "Repository search is not equivalent to general web discovery.",
        claimType: "limitation",
        confidence: 0.99,
        uncertainty: "A later provider can expand beyond repositories.",
        supportingCitations: [
          {
            sourceIndex: 1,
            quote: '"description":"Repository search alone is not a general web index."',
          },
        ],
        contradictingCitations: [],
        expiresAt: null,
      },
    ],
    contradictions: [],
    opportunities: [
      {
        title: "Add one reproducible search provider",
        problem: "Explicit URL manifests cannot discover omitted public repositories.",
        expectedOutcome: "Queries, ranks, result digests, selected sources, and citations are reconstructible.",
        evidenceClaimIndexes: [0, 1],
        alternatives: ["Remain manifest-only", "Add several providers immediately"],
        estimatedCost: "small",
        risk: "low",
        uncertainty: "Repository search is narrower than web search.",
        learningValue: "Tests whether discovered evidence improves pilot decisions.",
        smallestExperiment: "Run one support and one falsification query.",
      },
      {
        title: "Stay explicit-manifest only",
        problem: "Search results can change between runs.",
        expectedOutcome: "Maximum input control at the cost of discovery coverage.",
        evidenceClaimIndexes: [1],
        alternatives: ["Add search", "Manual browsing"],
        estimatedCost: "none",
        risk: "medium",
        uncertainty: "Missed sources may dominate the decision.",
        learningValue: "Provides the comparison baseline.",
        smallestExperiment: "Compare one manifest run with one search run.",
      },
      {
        title: "Add a general web provider now",
        problem: "Repository search does not cover the wider web.",
        expectedOutcome: "Broader coverage immediately.",
        evidenceClaimIndexes: [1],
        alternatives: ["Start narrow", "Defer discovery"],
        estimatedCost: "medium",
        risk: "medium",
        uncertainty: "Cost, safety, and ranking quality are unproven.",
        learningValue: "Could benchmark broader discovery later.",
        smallestExperiment: "Do not start before the repository baseline is measured.",
      },
    ],
    decision: {
      selectedOpportunityIndex: 0,
      rejectedOpportunityIndexes: [1, 2],
      rationale: "One provider is the smallest falsifiable step before the six-person pilot.",
    },
    experiment: {
      hypothesis: "A ranked support and falsification search improves evidence coverage without changing pilot thresholds.",
      method: "Run the bounded provider, capture selected sources, and verify exact quotes.",
      successCriteria: ["Search provenance is reconstructible", "Falsification evidence remains visible"],
      guardrails: ["No paid calls", "No pilot threshold changes"],
      rollbackPlan: ["Remove the provider adapter and retain evidence for review"],
    },
    handoff: {
      allowedScope: ["packages/evolution-core/src/public-search*.ts", "docs/evolution/**"],
      forbiddenScope: ["production", "secrets", "automatic merge", "automatic deploy"],
      acceptanceCriteria: ["Support and falsification queries pass independent review"],
      verificationPlan: ["Run deterministic provider and source fixtures"],
      rollbackPlan: ["Revert the public-search adapter"],
    },
  };
}

async function registry() {
  const root = await mkdtemp(join(tmpdir(), "cyclewarden-public-search-"));
  temporaryRoots.push(root);
  return new EvidenceRegistry(join(root, ".cyclewarden"), root);
}

describe("reproducible public search research", () => {
  it("persists ranked support and falsification searches before a reviewed decision", async () => {
    const now = new Date();
    const prepared = await preparePublicSearchResearch(modeledCycle(), manifest(), {
      actor: "search-researcher",
      reviewerActor: "independent-search-reviewer",
      registry: await registry(),
      manifestEvidenceRef: "evidence:search-manifest",
      startedAt: new Date(now.getTime() - 60_000).toISOString(),
      now: now.toISOString(),
      runtime: {
        fetcher: searchFetcher(),
        resolveAddresses: publicResolver,
        sourceRuntime: { fetcher: sourceFetcher(), resolveAddresses: publicResolver },
      },
    });

    expect(prepared.outcome).toBe("completed");
    if (prepared.outcome !== "completed") throw new Error("expected completed search research");
    expect(prepared.planned.stage).toBe("planned");
    expect(prepared.run.adapter).toBe("public-search");
    expect(prepared.run.usage).toMatchObject({ queries: 4, sources: 2, costUsd: 0 });
    expect(prepared.searchResponses).toHaveLength(2);
    expect(prepared.selectedResults).toHaveLength(2);
    expect(prepared.records.queries).toHaveLength(4);
    expect(prepared.records.queries.slice(0, 2).every((query) => query.parentQueryId === null)).toBe(true);
    expect(prepared.records.queries.slice(2).every((query) => query.parentQueryId !== null)).toBe(true);
    expect(prepared.citationSpans.every((span) => span.verified)).toBe(true);
    expect(prepared.evaluation.verdict).toBe("pass");
    expect(
      prepared.evaluation.checks.find((check) => check.id === "search-reproducibility")?.passed
    ).toBe(true);
    expect(
      prepared.evaluation.checks.find((check) => check.id === "falsification-search")?.passed
    ).toBe(true);
    expect(prepared.planned.research?.runs.at(-1)?.adapter).toBe("public-search");
  });

  it("returns a durable inconclusive result when ranked results contain duplicates", async () => {
    const now = new Date();
    const invalid = manifest();
    invalid.queries[0] = { ...invalid.queries[0]!, maxResults: 2 };
    const prepared = await preparePublicSearchResearch(
      modeledCycle("public:search-duplicate"),
      invalid,
      {
        actor: "search-researcher",
        reviewerActor: "independent-search-reviewer",
        registry: await registry(),
        manifestEvidenceRef: "evidence:search-manifest",
        startedAt: new Date(now.getTime() - 60_000).toISOString(),
        now: now.toISOString(),
        runtime: {
          fetcher: searchFetcher({ duplicate: true }),
          resolveAddresses: publicResolver,
          sourceRuntime: { fetcher: sourceFetcher(), resolveAddresses: publicResolver },
        },
      }
    );

    expect(prepared.outcome).toBe("inconclusive");
    if (prepared.outcome !== "inconclusive") throw new Error("expected inconclusive search research");
    expect(prepared.inconclusive.stage).toBe("inconclusive");
    expect(prepared.reason).toMatch(/duplicate search result/i);
    expect(prepared.run.adapter).toBe("public-search");
    expect(prepared.evaluation.verdict).toBe("inconclusive");
  });

  it("fails closed when the provider response is stale", async () => {
    const oldNow = "2026-07-23T10:00:00.000Z";
    const provider = createGitHubRepositorySearchProvider();
    const responses = new Map<string, Awaited<ReturnType<typeof provider.search>>>();
    for (const query of manifest().queries) {
      responses.set(
        query.query,
        await provider.search({
          query: query.query,
          maxResults: query.maxResults,
          now: oldNow,
          fetcher: searchFetcher(),
          resolveAddresses: publicResolver,
        })
      );
    }
    const replayProvider = {
      id: provider.id,
      search: async ({ query }: { query: string }) => responses.get(query)!,
    };
    const invalid = manifest();
    invalid.maxResultAgeMinutes = 5;
    const prepared = await preparePublicSearchResearch(
      modeledCycle("public:search-stale"),
      invalid,
      {
        actor: "search-researcher",
        reviewerActor: "independent-search-reviewer",
        registry: await registry(),
        manifestEvidenceRef: "evidence:search-manifest",
        startedAt: "2026-07-23T10:59:00.000Z",
        now: "2026-07-23T11:00:00.000Z",
        runtime: {
          provider: replayProvider,
          sourceRuntime: { fetcher: sourceFetcher(), resolveAddresses: publicResolver },
        },
      }
    );

    expect(prepared.outcome).toBe("inconclusive");
    if (prepared.outcome !== "inconclusive") throw new Error("expected stale search failure");
    expect(prepared.reason).toMatch(/older than 5 minute/i);
  });

  it("returns inconclusive for an unsupported provider without making a request", async () => {
    const invalid = manifest();
    invalid.provider = "unsupported-provider";
    let called = false;
    const prepared = await preparePublicSearchResearch(
      modeledCycle("public:search-provider"),
      invalid,
      {
        actor: "search-researcher",
        reviewerActor: "independent-search-reviewer",
        registry: await registry(),
        manifestEvidenceRef: "evidence:search-manifest",
        runtime: {
          provider: {
            id: "github-repository-search",
            search: async () => {
              called = true;
              throw new Error("not reached");
            },
          },
        },
      }
    );

    expect(called).toBe(false);
    expect(prepared.outcome).toBe("inconclusive");
    if (prepared.outcome !== "inconclusive") throw new Error("expected unsupported provider failure");
    expect(prepared.reason).toMatch(/unsupported public search provider/i);
  });
});

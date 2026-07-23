#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  EvidenceRegistry,
  createCycle,
  preparePublicSearchResearch,
  transitionCycle,
} from "../packages/evolution-core/dist/index.js";

const repositoryRoot = resolve(new URL("..", import.meta.url).pathname);
const manifest = JSON.parse(
  await readFile(
    join(repositoryRoot, "packages/evolution-core/src/fixtures/public-search-baseline.json"),
    "utf8"
  )
);
const temporaryRoot = await mkdtemp(join(tmpdir(), "shipkit-public-search-proof-"));
const artifactPath = join(repositoryRoot, "artifacts", "public-search-proof.json");

function response(body, contentType = "application/json", status = 200) {
  return {
    status,
    headers: { get: (name) => (name.toLowerCase() === "content-type" ? contentType : null) },
    arrayBuffer: async () => new TextEncoder().encode(body).buffer,
  };
}

function repositoryItem(fullName, description, score) {
  return {
    full_name: fullName,
    html_url: `https://github.com/${fullName}`,
    url: `https://api.github.com/repos/${fullName}`,
    description,
    updated_at: "2026-07-22T12:00:00.000Z",
    score,
  };
}

const searchFetcher = async (url) => {
  const query = new URL(url).searchParams.get("q") ?? "";
  const item = query.includes("limitations")
    ? repositoryItem(
        "example/shipkit-limitations",
        "Repository search alone is not a general web index.",
        4
      )
    : repositoryItem(
        "Thunderkill016/shipkit",
        "Shipkit uses bounded search and exact citations.",
        8
      );
  return response(JSON.stringify({ total_count: 1, incomplete_results: false, items: [item] }));
};

const sourceFetcher = async (url) =>
  url.includes("shipkit-limitations")
    ? response(
        JSON.stringify({
          full_name: "example/shipkit-limitations",
          description: "Repository search alone is not a general web index.",
        })
      )
    : response(
        JSON.stringify({
          full_name: "Thunderkill016/shipkit",
          description: "Shipkit uses bounded search and exact citations.",
        })
      );

const publicResolver = async () => ["140.82.114.5"];

try {
  let cycle = createCycle({
    cycleId: "public-search-proof:shipkit",
    objective: "Prove bounded public search with support and falsification evidence",
    autonomy: "A2",
    risk: "R1",
  });
  cycle = transitionCycle(cycle, "observed", {
    actor: "proof-inspector",
    reason: "captured baseline",
    addArtifacts: { baseline: ["evidence:baseline"] },
  });
  cycle = transitionCycle(cycle, "modeled", {
    actor: "proof-assessor",
    reason: "created project model",
    addArtifacts: { model: ["evidence:model"] },
  });
  const registry = new EvidenceRegistry(join(temporaryRoot, ".shipkit"), temporaryRoot);
  const manifestEvidence = await registry.registerJson("public-search-manifest", manifest);
  const now = new Date();
  const prepared = await preparePublicSearchResearch(cycle, manifest, {
    actor: "proof-search-researcher",
    reviewerActor: "proof-independent-reviewer",
    registry,
    manifestEvidenceRef: `evidence:${manifestEvidence.occurrenceId}`,
    startedAt: new Date(now.getTime() - 60_000).toISOString(),
    now: now.toISOString(),
    runtime: {
      fetcher: searchFetcher,
      resolveAddresses: publicResolver,
      sourceRuntime: { fetcher: sourceFetcher, resolveAddresses: publicResolver },
    },
  });
  if (prepared.outcome !== "completed") {
    throw new Error(`public search proof was inconclusive: ${prepared.reason}`);
  }
  if (prepared.run.adapter !== "public-search") throw new Error("wrong research adapter");
  if (prepared.searchResponses.length !== 2) throw new Error("expected two search responses");
  if (prepared.records.queries.length !== 4) throw new Error("expected search and retrieval query lineage");
  if (!prepared.citationSpans.every((span) => span.verified)) {
    throw new Error("not every citation span verified");
  }
  if (prepared.evaluation.verdict !== "pass") throw new Error("independent review did not pass");
  const report = {
    cycleId: cycle.cycleId,
    stage: prepared.planned.stage,
    adapter: prepared.run.adapter,
    usage: prepared.run.usage,
    provider: prepared.searchResponses[0]?.provider,
    queries: prepared.searchResponses.map((item) => ({
      query: item.query,
      searchedAt: item.searchedAt,
      responseDigest: item.responseDigest,
      ranks: item.results.map((result) => ({
        rank: result.rank,
        title: result.title,
        canonicalUrl: result.canonicalUrl,
        resultDigest: result.resultDigest,
      })),
    })),
    selectedResults: prepared.selectedResults.map((result) => ({
      rank: result.rank,
      title: result.title,
      canonicalUrl: result.canonicalUrl,
    })),
    citationSpanIds: prepared.citationSpans.map((span) => span.recordId),
    checks: prepared.evaluation.checks.map((check) => ({ id: check.id, passed: check.passed })),
    limitations: prepared.evaluation.limitations,
  };
  const digest = createHash("sha256").update(JSON.stringify(report)).digest("hex");
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify({ ...report, digest: `sha256:${digest}` }, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ ...report, digest: `sha256:${digest}` }, null, 2)}\n`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

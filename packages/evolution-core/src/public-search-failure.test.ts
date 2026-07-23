import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  EvidenceRegistry,
  createCycle,
  preparePublicSearchResearch,
  transitionCycle,
  type EvolutionCycle,
  type PublicFetch,
  type PublicSearchManifest,
} from "./index.js";

const temporaryRoots: string[] = [];
const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/public-search-baseline.json", import.meta.url), "utf8")
) as PublicSearchManifest;

function response(body: string, contentType = "application/json", status = 200) {
  return {
    status,
    headers: {
      get: (name: string) => (name.toLowerCase() === "content-type" ? contentType : null),
    },
    arrayBuffer: async () => new TextEncoder().encode(body).buffer,
  };
}

function modeledCycle(cycleId: string): EvolutionCycle {
  let cycle = createCycle({
    cycleId,
    objective: "Reject incomplete or malformed public search evidence",
    autonomy: "A2",
    risk: "R1",
    now: "2026-07-23T10:00:00.000Z",
  });
  cycle = transitionCycle(cycle, "observed", {
    actor: "inspector",
    reason: "captured baseline",
    now: "2026-07-23T10:01:00.000Z",
    addArtifacts: { baseline: ["evidence:baseline"] },
  });
  return transitionCycle(cycle, "modeled", {
    actor: "assessor",
    reason: "created project model",
    now: "2026-07-23T10:02:00.000Z",
    addArtifacts: { model: ["evidence:model"] },
  });
}

async function registry() {
  const root = await mkdtemp(join(tmpdir(), "shipkit-public-search-failure-"));
  temporaryRoots.push(root);
  return new EvidenceRegistry(join(root, ".shipkit"), root);
}

function manifest(): PublicSearchManifest {
  return JSON.parse(JSON.stringify(fixture)) as PublicSearchManifest;
}

const publicResolver = async () => ["140.82.114.5"];

const result = {
  full_name: "Thunderkill016/shipkit",
  html_url: "https://github.com/Thunderkill016/shipkit",
  url: "https://api.github.com/repos/Thunderkill016/shipkit",
  description: "Shipkit uses bounded search and exact citations.",
  updated_at: "2026-07-22T12:00:00.000Z",
  score: 8,
};

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  );
});

describe("public search fail-closed boundaries", () => {
  it("returns a durable inconclusive result for incomplete provider results", async () => {
    const fetcher: PublicFetch = async () =>
      response(JSON.stringify({ total_count: 1, incomplete_results: true, items: [result] }));
    const prepared = await preparePublicSearchResearch(
      modeledCycle("public-search:incomplete"),
      manifest(),
      {
        actor: "search-researcher",
        reviewerActor: "independent-search-reviewer",
        registry: await registry(),
        manifestEvidenceRef: "evidence:search-manifest",
        startedAt: "2026-07-23T10:02:00.000Z",
        now: "2026-07-23T10:03:00.000Z",
        runtime: { fetcher, resolveAddresses: publicResolver },
      }
    );

    expect(prepared.outcome).toBe("inconclusive");
    if (prepared.outcome !== "inconclusive") throw new Error("expected incomplete failure");
    expect(prepared.inconclusive.stage).toBe("inconclusive");
    expect(prepared.reason).toMatch(/incomplete results/i);
  });

  it("returns a durable inconclusive result for malformed provider JSON", async () => {
    const fetcher: PublicFetch = async () => response("{not-valid-json");
    const prepared = await preparePublicSearchResearch(
      modeledCycle("public-search:malformed"),
      manifest(),
      {
        actor: "search-researcher",
        reviewerActor: "independent-search-reviewer",
        registry: await registry(),
        manifestEvidenceRef: "evidence:search-manifest",
        startedAt: "2026-07-23T10:02:00.000Z",
        now: "2026-07-23T10:03:00.000Z",
        runtime: { fetcher, resolveAddresses: publicResolver },
      }
    );

    expect(prepared.outcome).toBe("inconclusive");
    if (prepared.outcome !== "inconclusive") throw new Error("expected malformed failure");
    expect(prepared.inconclusive.stage).toBe("inconclusive");
    expect(prepared.reason).toMatch(/invalid JSON/i);
  });

  it("uses the fixed run timestamp and stops before calling a provider after the time budget", async () => {
    let called = false;
    const prepared = await preparePublicSearchResearch(
      modeledCycle("public-search:time-budget"),
      manifest(),
      {
        actor: "search-researcher",
        reviewerActor: "independent-search-reviewer",
        registry: await registry(),
        manifestEvidenceRef: "evidence:search-manifest",
        startedAt: "2026-07-23T10:00:00.000Z",
        now: "2026-07-23T10:16:00.000Z",
        runtime: {
          provider: {
            id: "github-repository-search",
            search: async () => {
              called = true;
              throw new Error("provider should not be called after budget exhaustion");
            },
          },
        },
      }
    );

    expect(called).toBe(false);
    expect(prepared.outcome).toBe("inconclusive");
    if (prepared.outcome !== "inconclusive") throw new Error("expected time-budget failure");
    expect(prepared.inconclusive.stage).toBe("inconclusive");
    expect(prepared.reason).toMatch(/time budget 15 minute/i);
  });
});

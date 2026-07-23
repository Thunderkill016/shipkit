import { readFileSync } from "node:fs";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  EvolutionStore,
  createCycle,
  resolvePublicSearchInputFile,
  runPublicSearchCli,
  transitionCycle,
  type PublicFetch,
} from "./index.js";

const temporaryRoots: string[] = [];
const manifest = JSON.parse(
  readFileSync(new URL("./fixtures/public-search-baseline.json", import.meta.url), "utf8")
);

function response(body: string, contentType = "application/json", status = 200) {
  return {
    status,
    headers: {
      get: (name: string) => (name.toLowerCase() === "content-type" ? contentType : null),
    },
    arrayBuffer: async () => new TextEncoder().encode(body).buffer,
  };
}

function repositoryItem(fullName: string, description: string, score: number) {
  return {
    full_name: fullName,
    html_url: `https://github.com/${fullName}`,
    url: `https://api.github.com/repos/${fullName}`,
    description,
    updated_at: "2026-07-22T12:00:00.000Z",
    score,
  };
}

const publicResolver = async () => ["140.82.114.5"];

const searchFetcher: PublicFetch = async (url) => {
  const parsed = new URL(url);
  const query = parsed.searchParams.get("q") ?? "";
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

const sourceFetcher: PublicFetch = async (url) =>
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

function collector() {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout: (message: string) => {
        stdout += message;
      },
      stderr: (message: string) => {
        stderr += message;
      },
    },
    output: () => ({ stdout, stderr }),
  };
}

async function createModeledCycle(store: EvolutionStore, cycleId: string) {
  const created = createCycle({
    cycleId,
    objective: "Choose an evidence-backed public discovery baseline",
    autonomy: "A2",
    risk: "R1",
  });
  await store.create(created);
  const observed = transitionCycle(created, "observed", {
    actor: "inspector",
    reason: "captured baseline",
    addArtifacts: { baseline: ["evidence:baseline"] },
  });
  await store.save(created, observed);
  const modeled = transitionCycle(observed, "modeled", {
    actor: "assessor",
    reason: "created project model",
    addArtifacts: { model: ["evidence:model"] },
  });
  await store.save(observed, modeled);
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  );
});

describe("public search CLI", () => {
  it("persists and reloads a reviewed support and falsification search cycle", async () => {
    const root = await mkdtemp(join(tmpdir(), "shipkit-public-search-cli-"));
    temporaryRoots.push(root);
    const storeRoot = join(root, ".shipkit");
    const manifestPath = join(root, "public-search.json");
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    const store = new EvolutionStore(storeRoot);
    await createModeledCycle(store, "public-search-cli:cycle-001");

    const output = collector();
    await expect(
      runPublicSearchCli(
        [
          "public-search-cli:cycle-001",
          "--root",
          storeRoot,
          "--project-root",
          root,
          "--manifest",
          manifestPath,
          "--actor",
          "search-researcher",
          "--reviewer",
          "independent-search-reviewer",
        ],
        output.io,
        {
          fetcher: searchFetcher,
          resolveAddresses: publicResolver,
          sourceRuntime: { fetcher: sourceFetcher, resolveAddresses: publicResolver },
        }
      )
    ).resolves.toBe(0);

    const result = JSON.parse(output.output().stdout);
    expect(result.outcome).toBe("completed");
    expect(result.cycle.stage).toBe("planned");
    expect(result.run.adapter).toBe("public-search");
    expect(result.run.usage).toMatchObject({ queries: 4, sources: 2, costUsd: 0 });
    expect(result.searchResponses).toHaveLength(2);
    expect(result.selectedResults).toHaveLength(2);
    expect(result.citationSpans.every((span: { verified: boolean }) => span.verified)).toBe(true);
    expect(result.evaluation.verdict).toBe("pass");

    const persisted = await store.load("public-search-cli:cycle-001");
    expect(persisted.stage).toBe("planned");
    expect(persisted.research?.runs.at(-1)?.adapter).toBe("public-search");
    expect(persisted.research?.queries).toHaveLength(4);
    expect(persisted.research?.sources).toHaveLength(2);
    expect(persisted.research?.evaluations.at(-1)?.actor).toBe(
      "independent-search-reviewer"
    );
  });

  it("rejects a manifest symlink that escapes project-root", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "shipkit-public-search-project-"));
    const outsideRoot = await mkdtemp(join(tmpdir(), "shipkit-public-search-outside-"));
    temporaryRoots.push(projectRoot, outsideRoot);
    const outsideManifest = join(outsideRoot, "outside.json");
    const escapedLink = join(projectRoot, "escaped.json");
    await writeFile(outsideManifest, `${JSON.stringify(manifest)}\n`, "utf8");
    await symlink(outsideManifest, escapedLink);

    await expect(
      resolvePublicSearchInputFile(projectRoot, escapedLink, "public search manifest")
    ).rejects.toThrow(/inside project-root/i);
  });
});

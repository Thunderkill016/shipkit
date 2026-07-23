import { readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  EvolutionStore,
  createCycle,
  runCandidateResearchCli,
  transitionCycle,
} from "./index.js";

const temporaryRoots: string[] = [];

const manifest = JSON.parse(
  readFileSync(new URL("./fixtures/shipkit-next-workstream.candidates.json", import.meta.url), "utf8")
);

const capabilities = {
  schemaVersion: 1,
  project: "shipkit",
  lastVerified: "2026-07-23",
  capabilities: [
    {
      id: "evolution-state-machine",
      status: "implemented",
      verificationStatus: "passing",
      summary: "Deterministic lifecycle core.",
      evidence: ["packages/evolution-core/src/state-machine.ts"],
      checks: ["CI: Test & Build"],
      limitations: [],
    },
    {
      id: "research-intelligence",
      status: "partial",
      verificationStatus: "passing",
      summary: "Research is durable but external decision value is not proven.",
      evidence: ["packages/evolution-core/src/repository-research.ts"],
      checks: ["CI: Evolution Engine Proof"],
      limitations: ["No external decision-value proof"],
    },
    {
      id: "temporary-workspace-assessment",
      status: "partial",
      verificationStatus: "passing",
      summary: "Trusted repositories may use trusted-local execution.",
      evidence: ["packages/evolution-core/src/check-runner.ts"],
      checks: ["CI: Evolution Engine Proof"],
      limitations: ["Trusted-local is not a security sandbox"],
    },
    {
      id: "sandboxed-agent-execution",
      status: "partial",
      verificationStatus: "passing",
      summary: "A verified Docker baseline exists without a coding-agent adapter.",
      evidence: ["packages/evolution-core/src/execution-backend.ts"],
      checks: ["CI: Sandbox / hostile Docker proof"],
      limitations: ["No hard writable-workspace disk quota"],
    },
  ],
};

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

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

describe("candidate research CLI", () => {
  it("persists and reloads a reviewed named-candidate decision", async () => {
    const root = await mkdtemp(join(tmpdir(), "shipkit-candidate-cli-"));
    temporaryRoots.push(root);
    const storeRoot = join(root, ".shipkit");
    const manifestPath = join(root, "candidate-decision.json");
    const capabilitiesPath = join(root, "capabilities.json");
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    await writeFile(capabilitiesPath, `${JSON.stringify(capabilities, null, 2)}\n`, "utf8");

    const store = new EvolutionStore(storeRoot);
    const created = createCycle({
      cycleId: "candidate-cli:cycle-001",
      objective: "Choose Shipkit's next named workstream",
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
      reason: "created model",
      addArtifacts: { model: ["evidence:model"] },
    });
    await store.save(observed, modeled);

    const output = collector();
    await expect(
      runCandidateResearchCli(
        [
          "candidate-cli:cycle-001",
          "--root",
          storeRoot,
          "--project-root",
          root,
          "--manifest",
          manifestPath,
          "--capabilities",
          capabilitiesPath,
          "--actor",
          "candidate-researcher",
          "--reviewer",
          "candidate-reviewer",
        ],
        output.io
      )
    ).resolves.toBe(0);

    const result = JSON.parse(output.output().stdout);
    expect(result.outcome).toBe("completed");
    expect(result.cycle.stage).toBe("planned");
    expect(result.evaluation.verdict).toBe("pass");
    expect(result.records.opportunities).toHaveLength(4);
    expect(result.scores.find((item: { candidateId: string }) => item.candidateId === "#13")).toBeTruthy();

    const persisted = await store.load("candidate-cli:cycle-001");
    expect(persisted.stage).toBe("planned");
    expect(persisted.research?.runs.at(-1)?.adapter).toBe("candidate-manifest");
    expect(persisted.research?.opportunities).toHaveLength(4);
    expect(persisted.research?.evaluations.at(-1)?.actor).toBe("candidate-reviewer");
  });
});

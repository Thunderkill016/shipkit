import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EvidenceRegistry, EvidenceRegistryError } from "./evidence.js";
import { inspectRepository } from "./repository.js";

const temporaryRoots: string[] = [];

async function temporaryProject(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "shipkit-project-"));
  temporaryRoots.push(root);
  await mkdir(join(root, "src", "auth"), { recursive: true });
  await mkdir(join(root, "tests"), { recursive: true });
  await mkdir(join(root, "docs"), { recursive: true });
  await mkdir(join(root, ".github", "workflows"), { recursive: true });
  await mkdir(join(root, "node_modules", "ignored"), { recursive: true });
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      name: "sample-product",
      version: "1.0.0",
      scripts: {
        test: "vitest run",
        lint: "eslint .",
        build: "tsc -p tsconfig.json",
        dev: "vite",
      },
    }),
    "utf8"
  );
  await writeFile(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");
  await writeFile(join(root, "src", "index.ts"), "export const product = true;\n", "utf8");
  await writeFile(join(root, "src", "auth", "session.ts"), "export const session = true;\n", "utf8");
  await writeFile(join(root, "tests", "product.test.ts"), "// test\n", "utf8");
  await writeFile(join(root, "docs", "ROADMAP.md"), "# Roadmap\n", "utf8");
  await writeFile(join(root, "IDEA.md"), "# Product idea\n", "utf8");
  await writeFile(join(root, ".github", "workflows", "ci.yml"), "name: CI\n", "utf8");
  await writeFile(join(root, ".env"), "SECRET=do-not-read\n", "utf8");
  await writeFile(join(root, ".env.example"), "SECRET=placeholder\n", "utf8");
  await writeFile(join(root, "node_modules", "ignored", "huge.ts"), "ignored\n", "utf8");
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("repository perception", () => {
  it("discovers stack, checks, product signals, CI, tests, and trust boundaries", async () => {
    const root = await temporaryProject();
    const snapshot = await inspectRepository(root, {
      now: "2026-07-23T00:00:00.000Z",
    });

    expect(snapshot).toMatchObject({
      schemaVersion: 1,
      projectName: expect.any(String),
      packageManagers: ["pnpm"],
      inventory: { truncated: false },
    });
    expect(snapshot.manifests).toEqual([
      expect.objectContaining({ path: "package.json", name: "sample-product" }),
    ]);
    expect(snapshot.languages).toContainEqual({ name: "TypeScript", files: 3 });
    expect(snapshot.checks.map((check) => check.name)).toEqual(["build", "lint", "test"]);
    expect(snapshot.ci).toEqual([".github/workflows/ci.yml"]);
    expect(snapshot.documentation).toContain("docs/ROADMAP.md");
    expect(snapshot.productSignals).toEqual(expect.arrayContaining(["IDEA.md", "docs/ROADMAP.md"]));
    expect(snapshot.testDirectories).toContain("tests");
    expect(snapshot.trustBoundaries.map((boundary) => boundary.kind)).toEqual(
      expect.arrayContaining(["authentication", "deployment", "secrets"])
    );
    expect(snapshot.inventory.filesObserved).not.toBeGreaterThan(12);
  });

  it("reports truncation instead of silently claiming full coverage", async () => {
    const root = await temporaryProject();
    const snapshot = await inspectRepository(root, { maxFiles: 2 });
    expect(snapshot.inventory).toMatchObject({ filesObserved: 2, truncated: true });
  });
});

describe("evidence registry", () => {
  it("deduplicates blobs while preserving distinct evidence occurrences", async () => {
    const root = await temporaryProject();
    const registry = new EvidenceRegistry(join(root, ".shipkit"), root);
    const first = await registry.registerJson("project-snapshot", { b: 2, a: 1 });
    const second = await registry.registerJson("decision-input", { a: 1, b: 2 });

    expect(first.digest).toBe(second.digest);
    expect(first.id).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(first.occurrenceId).not.toBe(second.occurrenceId);
    expect(first.kind).toBe("project-snapshot");
    expect(second.kind).toBe("decision-input");
    expect(first.storedPath).toBe(second.storedPath);
    await expect(registry.verify(first)).resolves.toBe(true);
    await expect(registry.verify(second)).resolves.toBe(true);
  });

  it("detects a changed blob during verification", async () => {
    const root = await temporaryProject();
    const registry = new EvidenceRegistry(join(root, ".shipkit"), root);
    const reference = await registry.registerJson("project-snapshot", { stable: true });
    await writeFile(join(root, ".shipkit", reference.storedPath), "tampered\n", "utf8");
    await expect(registry.verify(reference)).resolves.toBe(false);
  });

  it("captures bounded project files but refuses secrets and outside paths", async () => {
    const root = await temporaryProject();
    const outsideRoot = await mkdtemp(join(tmpdir(), "shipkit-outside-"));
    temporaryRoots.push(outsideRoot);
    await writeFile(join(outsideRoot, "outside.txt"), "outside\n", "utf8");
    const registry = new EvidenceRegistry(join(root, ".shipkit"), root);

    await expect(registry.registerFile("roadmap", "docs/ROADMAP.md")).resolves.toMatchObject({
      sourcePath: "docs/ROADMAP.md",
      mediaType: "text/markdown",
      occurrenceId: expect.stringMatching(/^occurrence:/),
    });
    await expect(registry.registerFile("secret", ".env")).rejects.toBeInstanceOf(
      EvidenceRegistryError
    );
    await expect(
      registry.registerFile("outside", join(outsideRoot, "outside.txt"))
    ).rejects.toThrow(/inside the project root/);
  });
});
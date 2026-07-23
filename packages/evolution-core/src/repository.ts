import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, readdir } from "node:fs/promises";
import { basename, extname, join, relative, resolve, sep } from "node:path";

const execFileAsync = promisify(execFile);

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".shipkit",
  ".next",
  ".turbo",
  ".cache",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "target",
  "vendor",
  ".venv",
  "venv",
]);

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".py": "Python",
  ".rs": "Rust",
  ".go": "Go",
  ".java": "Java",
  ".kt": "Kotlin",
  ".kts": "Kotlin",
  ".rb": "Ruby",
  ".php": "PHP",
  ".cs": "C#",
  ".cpp": "C++",
  ".cc": "C++",
  ".c": "C",
  ".h": "C/C++",
  ".swift": "Swift",
  ".dart": "Dart",
  ".vue": "Vue",
  ".svelte": "Svelte",
  ".sql": "SQL",
  ".sh": "Shell",
};

export type RepositoryManifest = {
  path: string;
  kind: string;
  name?: string;
  version?: string;
  workspaces: string[];
  scripts: Record<string, string>;
};

export type RepositoryCheck = {
  name: string;
  command: string;
  source: string;
};

export type RepositoryTrustBoundary = {
  kind: "authentication" | "database" | "deployment" | "secrets" | "payments";
  evidencePaths: string[];
  reason: string;
};

export type ProjectSnapshot = {
  schemaVersion: 1;
  projectName: string;
  scannedAt: string;
  git: {
    detected: boolean;
    branch: string | null;
    commit: string | null;
    dirty: boolean | null;
  };
  packageManagers: string[];
  manifests: RepositoryManifest[];
  languages: Array<{ name: string; files: number }>;
  checks: RepositoryCheck[];
  ci: string[];
  documentation: string[];
  sourceDirectories: string[];
  testDirectories: string[];
  productSignals: string[];
  trustBoundaries: RepositoryTrustBoundary[];
  inventory: {
    filesObserved: number;
    truncated: boolean;
    ignoredDirectories: string[];
  };
};

type WalkResult = {
  files: string[];
  truncated: boolean;
};

function portablePath(path: string): string {
  return path.split(sep).join("/");
}

async function walkFiles(root: string, maxFiles: number): Promise<WalkResult> {
  const files: string[] = [];
  const queue = [root];
  let truncated = false;

  while (queue.length > 0) {
    const directory = queue.shift();
    if (!directory) break;
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      continue;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (files.length >= maxFiles) {
        truncated = true;
        queue.length = 0;
        break;
      }
      if (entry.isSymbolicLink()) continue;
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name)) queue.push(absolute);
        continue;
      }
      if (entry.isFile()) files.push(portablePath(relative(root, absolute)));
    }
  }

  return { files, truncated };
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (value && typeof value === "object" && "packages" in value) {
    return asStringArray((value as { packages?: unknown }).packages);
  }
  return [];
}

async function readPackageManifest(root: string, path: string): Promise<RepositoryManifest | null> {
  try {
    const parsed = JSON.parse(await readFile(join(root, path), "utf8")) as Record<string, unknown>;
    const rawScripts = parsed.scripts;
    const scripts: Record<string, string> = {};
    if (rawScripts && typeof rawScripts === "object" && !Array.isArray(rawScripts)) {
      for (const [name, command] of Object.entries(rawScripts)) {
        if (typeof command === "string") scripts[name] = command;
      }
    }
    return {
      path,
      kind: "package.json",
      name: typeof parsed.name === "string" ? parsed.name : undefined,
      version: typeof parsed.version === "string" ? parsed.version : undefined,
      workspaces: asStringArray(parsed.workspaces),
      scripts,
    };
  } catch {
    return null;
  }
}

async function gitState(root: string): Promise<ProjectSnapshot["git"]> {
  const run = async (args: string[]) => {
    const result = await execFileAsync("git", ["-C", root, ...args], {
      timeout: 3_000,
      maxBuffer: 256 * 1024,
    });
    return result.stdout.trim();
  };

  try {
    await run(["rev-parse", "--is-inside-work-tree"]);
    const [branch, commit, status] = await Promise.all([
      run(["branch", "--show-current"]).catch(() => ""),
      run(["rev-parse", "HEAD"]).catch(() => ""),
      run(["status", "--porcelain"]).catch(() => ""),
    ]);
    return {
      detected: true,
      branch: branch || null,
      commit: commit || null,
      dirty: status.length > 0,
    };
  } catch {
    return { detected: false, branch: null, commit: null, dirty: null };
  }
}

function packageManagers(files: Set<string>): string[] {
  const managers: string[] = [];
  if (files.has("pnpm-lock.yaml")) managers.push("pnpm");
  if (files.has("yarn.lock")) managers.push("yarn");
  if (files.has("package-lock.json")) managers.push("npm");
  if (files.has("bun.lock") || files.has("bun.lockb")) managers.push("bun");
  if (files.has("uv.lock")) managers.push("uv");
  if (files.has("poetry.lock")) managers.push("poetry");
  if (files.has("Cargo.lock")) managers.push("cargo");
  if (files.has("go.sum")) managers.push("go");
  return managers;
}

function manifestKind(path: string): string | null {
  const name = basename(path);
  if (name === "pyproject.toml") return "pyproject.toml";
  if (name === "Cargo.toml") return "Cargo.toml";
  if (name === "go.mod") return "go.mod";
  if (name === "Gemfile") return "Gemfile";
  if (name === "composer.json") return "composer.json";
  return null;
}

function discoverChecks(manifests: RepositoryManifest[]): RepositoryCheck[] {
  const checks: RepositoryCheck[] = [];
  const accepted = /^(test|lint|typecheck|check|verify|build)(:|$)/i;
  for (const manifest of manifests) {
    for (const [name, command] of Object.entries(manifest.scripts)) {
      if (!accepted.test(name)) continue;
      checks.push({
        name,
        command,
        source: manifest.path,
      });
    }
  }
  return checks.sort((a, b) => `${a.source}:${a.name}`.localeCompare(`${b.source}:${b.name}`));
}

function pathsWith(files: string[], predicate: (path: string) => boolean, limit = 50): string[] {
  return files.filter(predicate).slice(0, limit);
}

function trustBoundaries(files: string[]): RepositoryTrustBoundary[] {
  const boundaries: RepositoryTrustBoundary[] = [];
  const add = (
    kind: RepositoryTrustBoundary["kind"],
    evidencePaths: string[],
    reason: string
  ) => {
    if (evidencePaths.length > 0) boundaries.push({ kind, evidencePaths, reason });
  };

  add(
    "authentication",
    pathsWith(files, (path) => /(^|\/)(auth|authentication)(\/|\.|-)|middleware\.(ts|js|py)$|login/i.test(path), 20),
    "Authentication and session code can change identity or authorization behavior."
  );
  add(
    "database",
    pathsWith(files, (path) => /(^|\/)(migrations?|schema|sql)(\/|\.)|\.sql$/i.test(path), 20),
    "Schema and migration changes can affect persistent data and isolation."
  );
  add(
    "deployment",
    pathsWith(files, (path) => /(^|\/)(infra|terraform|k8s|kubernetes|deploy)(\/|\.)|Dockerfile|vercel\.json|\.github\/workflows/i.test(path), 20),
    "Infrastructure and deployment definitions can affect shared or production environments."
  );
  add(
    "secrets",
    pathsWith(files, (path) => /(^|\/)\.env\.example$|secrets?\.example|credentials?\.example/i.test(path), 20),
    "Environment templates indicate secret-bearing configuration boundaries; secret values are not read."
  );
  add(
    "payments",
    pathsWith(files, (path) => /(^|\/)(billing|payments?|stripe)(\/|\.|-)/i.test(path), 20),
    "Billing and payment paths may create financial or entitlement side effects."
  );
  return boundaries;
}

export async function inspectRepository(
  projectRoot = process.cwd(),
  options: { maxFiles?: number; now?: string } = {}
): Promise<ProjectSnapshot> {
  const root = resolve(projectRoot);
  const walked = await walkFiles(root, options.maxFiles ?? 20_000);
  const fileSet = new Set(walked.files);

  const packageManifestPaths = walked.files.filter((path) => basename(path) === "package.json");
  const packageManifestResults = await Promise.all(
    packageManifestPaths.slice(0, 200).map((path) => readPackageManifest(root, path))
  );
  const manifests = packageManifestResults.filter(
    (manifest): manifest is RepositoryManifest => manifest !== null
  );
  for (const path of walked.files) {
    const kind = manifestKind(path);
    if (kind) manifests.push({ path, kind, workspaces: [], scripts: {} });
  }
  manifests.sort((a, b) => a.path.localeCompare(b.path));

  const languageCounts = new Map<string, number>();
  for (const path of walked.files) {
    const language = LANGUAGE_BY_EXTENSION[extname(path).toLowerCase()];
    if (language) languageCounts.set(language, (languageCounts.get(language) ?? 0) + 1);
  }

  const topLevelDirectories = new Set(
    walked.files.map((path) => path.split("/")[0]).filter((part): part is string => Boolean(part))
  );
  const knownSourceDirectories = ["src", "app", "apps", "packages", "lib", "server", "client", "cmd", "pkg"];
  const sourceDirectories = knownSourceDirectories.filter((directory) => topLevelDirectories.has(directory));
  const testDirectories = [...new Set(
    walked.files
      .filter((path) => /(^|\/)(__tests__|tests?|e2e)(\/|$)/i.test(path) || /\.(test|spec)\.[^.]+$/i.test(path))
      .map((path) => path.split("/").slice(0, -1).join("/") || ".")
  )].sort().slice(0, 50);

  const ci = pathsWith(
    walked.files,
    (path) => /^\.github\/workflows\/.*\.ya?ml$/i.test(path) || path === ".gitlab-ci.yml" || path === "Jenkinsfile" || /^\.circleci\//.test(path)
  );
  const documentation = pathsWith(
    walked.files,
    (path) => /(^|\/)(README|CONTRIBUTING|ARCHITECTURE|ROADMAP|CHANGELOG)(\.[^/]*)?$/i.test(path) || /^docs\/.*\.(md|mdx|rst)$/i.test(path)
  );
  const productSignals = pathsWith(
    walked.files,
    (path) => /(^|\/)(IDEA|PRODUCT|PRD|ROADMAP|CAPABILITIES|DECISIONS?|EXPERIMENTS?)(\.[^/]*)?$/i.test(path)
  );

  return {
    schemaVersion: 1,
    projectName: basename(root),
    scannedAt: options.now ?? new Date().toISOString(),
    git: await gitState(root),
    packageManagers: packageManagers(fileSet),
    manifests,
    languages: [...languageCounts.entries()]
      .map(([name, files]) => ({ name, files }))
      .sort((a, b) => b.files - a.files || a.name.localeCompare(b.name)),
    checks: discoverChecks(manifests),
    ci,
    documentation,
    sourceDirectories,
    testDirectories,
    productSignals,
    trustBoundaries: trustBoundaries(walked.files),
    inventory: {
      filesObserved: walked.files.length,
      truncated: walked.truncated,
      ignoredDirectories: [...IGNORED_DIRECTORIES].sort(),
    },
  };
}

import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, realpath, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { EvidenceRegistry } from "./evidence.js";
import { EvolutionStore, cycleStorageDirectoryName } from "./persistence.js";
import { authorizeAction } from "./policy.js";

const execFileAsync = promisify(execFile);
const MAX_OUTPUT_BYTES = 1024 * 1024;
const COMMAND_TIMEOUT_MS = 60_000;

export class DeliveryPublishError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryPublishError";
  }
}

type StepStatus = "not-run" | "passed" | "failed" | "unavailable";

export type DeliveryPublicationRecord = {
  schemaVersion: 1;
  recordType: "delivery-publication";
  recordId: string;
  cycleId: string;
  verificationRecordId: string;
  actor: string;
  startedAt: string;
  completedAt: string;
  remote: string;
  remoteUrlDigest: string;
  hostname: string;
  baseBranch: string;
  branchName: string;
  commitSha: string;
  titleDigest: string;
  bodyDigest: string;
  steps: {
    ghAvailable: StepStatus;
    ghAuthenticated: StepStatus;
    push: StepStatus;
    draftPr: StepStatus;
  };
  draftPrUrl: string | null;
  status: "published" | "rejected" | "inconclusive";
  unresolvedRisks: string[];
  limitations: string[];
};

type DeliveryControlFile = {
  schemaVersion: 1;
  integrityDigest: string;
  cycleId: string;
  projectRoot: string;
  worktreePath: string;
  execution: {
    runId: string;
    cycleId: string;
    branchName: string;
  };
  verification: {
    recordId: string;
    cycleId: string;
    executionRunId: string;
    verdict: "accepted" | "rejected" | "inconclusive";
    commitSha: string | null;
  } | null;
  publication?: DeliveryPublicationRecord | null;
  publicationEvidenceRef?: string | null;
  [key: string]: unknown;
};

export type PublishDeliveryInput = {
  store: EvolutionStore;
  cycleId: string;
  projectRoot: string;
  actor: string;
  draftPr: boolean;
  remote?: string;
  hostname?: string;
  baseBranch?: string;
  title?: string;
  body?: string;
  now?: string;
};

type CommandResult = {
  status: Exclude<StepStatus, "not-run">;
  stdout: string;
  stderr: string;
};

type PullRequestView = {
  url: string;
  isDraft: boolean;
  state: string;
  headRefName: string;
  headRefOid: string;
  baseRefName: string;
  number?: number;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function digestJson(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function safeEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    CI: "true",
    NO_COLOR: "1",
    GH_PROMPT_DISABLED: "1",
  };
  for (const key of ["PATH", "HOME", "USERPROFILE", "SYSTEMROOT", "TMPDIR", "TMP", "TEMP"]) {
    const value = process.env[key];
    if (value !== undefined) environment[key] = value;
  }
  return environment;
}

function deliveryDirectory(store: EvolutionStore, cycleId: string): string {
  return join(store.rootDir, "delivery", cycleStorageDirectoryName(cycleId));
}

function controlPath(store: EvolutionStore, cycleId: string): string {
  return join(deliveryDirectory(store, cycleId), "control.json");
}

async function atomicWriteJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, path);
}

async function loadControl(store: EvolutionStore, cycleId: string): Promise<DeliveryControlFile> {
  try {
    const value = JSON.parse(await readFile(controlPath(store, cycleId), "utf8")) as DeliveryControlFile;
    if (value.schemaVersion !== 1 || value.cycleId !== cycleId) {
      throw new DeliveryPublishError("delivery control file does not match the requested cycle");
    }
    const { integrityDigest, ...payload } = value;
    if (!/^[a-f0-9]{64}$/i.test(integrityDigest) || integrityDigest !== digestJson(payload)) {
      throw new DeliveryPublishError("delivery control integrity digest mismatch");
    }
    return value;
  } catch (error) {
    if (error instanceof DeliveryPublishError) throw error;
    throw new DeliveryPublishError(
      `cannot read delivery control for ${cycleId}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function writeControl(store: EvolutionStore, control: DeliveryControlFile): Promise<void> {
  const { integrityDigest: _discarded, ...payload } = control;
  await atomicWriteJson(controlPath(store, control.cycleId), {
    ...payload,
    integrityDigest: digestJson(payload),
  });
}

async function runProcess(executable: string, arguments_: string[], cwd: string): Promise<CommandResult> {
  try {
    const result = await execFileAsync(executable, arguments_, {
      cwd,
      env: safeEnvironment(),
      encoding: "utf8",
      maxBuffer: MAX_OUTPUT_BYTES,
      timeout: COMMAND_TIMEOUT_MS,
      windowsHide: true,
    });
    return {
      status: "passed",
      stdout: String(result.stdout ?? ""),
      stderr: String(result.stderr ?? ""),
    };
  } catch (error) {
    const failure = error as {
      code?: string | number;
      stdout?: string | Buffer;
      stderr?: string | Buffer;
    };
    return {
      status: failure.code === "ENOENT" ? "unavailable" : "failed",
      stdout: String(failure.stdout ?? ""),
      stderr: String(failure.stderr ?? (error instanceof Error ? error.message : error)),
    };
  }
}

async function runGit(cwd: string, arguments_: string[]): Promise<string> {
  const result = await runProcess("git", arguments_, cwd);
  if (result.status !== "passed") {
    throw new DeliveryPublishError(result.stderr.trim() || `git ${arguments_[0] ?? "command"} failed`);
  }
  return result.stdout.trim();
}

async function canonicalRepositoryRoot(projectRoot: string): Promise<string> {
  const requested = await realpath(resolve(projectRoot));
  const gitRoot = await realpath(await runGit(requested, ["rev-parse", "--show-toplevel"]));
  if (requested !== gitRoot) {
    throw new DeliveryPublishError(`project root must equal the git worktree root: ${gitRoot}`);
  }
  return gitRoot;
}

function portableName(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized || !/^[A-Za-z0-9._/-]+$/.test(normalized) || normalized.includes("..")) {
    throw new DeliveryPublishError(`${label} must be a portable git name`);
  }
  return normalized;
}

function resolveHostname(remoteUrl: string, explicit?: string): string {
  const requested = explicit?.trim();
  if (requested) {
    if (!/^[A-Za-z0-9.-]+$/.test(requested)) {
      throw new DeliveryPublishError("hostname must be a portable DNS hostname");
    }
    return requested;
  }
  const scp = remoteUrl.match(/^[^@\s]+@([^:\s]+):/);
  if (scp?.[1]) return scp[1];
  try {
    const parsed = new URL(remoteUrl);
    if (parsed.hostname) return parsed.hostname;
  } catch {
    // A local path or custom remote requires an explicit hostname.
  }
  throw new DeliveryPublishError("cannot derive GitHub hostname from the push remote; pass --hostname");
}

function cleanText(value: string | undefined, fallback: string, maximum: number, label: string): string {
  const resolved = value?.trim() || fallback.trim();
  if (!resolved || resolved.length > maximum) {
    throw new DeliveryPublishError(`${label} must contain 1-${maximum} characters`);
  }
  return resolved;
}

function parseJson<T>(value: string, label: string): T {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    throw new DeliveryPublishError(
      `${label} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function lastUrl(value: string): string | null {
  const candidate = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

async function persistPublication(
  input: PublishDeliveryInput,
  control: DeliveryControlFile,
  publication: DeliveryPublicationRecord
): Promise<string> {
  const evidence = await new EvidenceRegistry(input.store.rootDir, control.projectRoot).registerJson(
    "delivery-publication",
    publication
  );
  const evidenceRef = `evidence:${evidence.occurrenceId}`;
  await writeControl(input.store, {
    ...control,
    publication,
    publicationEvidenceRef: evidenceRef,
  });
  return evidenceRef;
}

export async function publishDelivery(input: PublishDeliveryInput) {
  if (!input.draftPr) {
    throw new DeliveryPublishError("draft PR publication requires the explicit --draft-pr opt-in");
  }
  const actor = input.actor.trim();
  if (!actor) throw new DeliveryPublishError("delivery publication actor is required");

  const cycle = await input.store.load(input.cycleId);
  if (cycle.stage !== "verified") {
    throw new DeliveryPublishError(`publish requires a verified cycle; current stage is ${cycle.stage}`);
  }
  const authorization = authorizeAction({
    autonomy: cycle.autonomy,
    risk: cycle.risk,
    action: "open-draft-pr",
    cycleId: cycle.cycleId,
    requiredScope: `cycle:${cycle.cycleId}:open-draft-pr`,
    approvals: cycle.approvals,
    now: input.now,
  });
  if (!authorization.allowed) throw new DeliveryPublishError(authorization.reason);

  const projectRoot = await canonicalRepositoryRoot(input.projectRoot);
  const control = await loadControl(input.store, input.cycleId);
  if (control.projectRoot !== projectRoot) {
    throw new DeliveryPublishError("delivery control project root does not match the requested repository");
  }
  const verification = control.verification;
  if (
    !verification ||
    verification.cycleId !== cycle.cycleId ||
    verification.executionRunId !== control.execution.runId ||
    verification.verdict !== "accepted" ||
    !verification.commitSha
  ) {
    throw new DeliveryPublishError("delivery control does not contain an accepted verified commit");
  }
  if (control.publication?.status === "published") {
    return {
      authorization,
      cycle,
      publication: control.publication,
      publicationEvidenceRef: control.publicationEvidenceRef ?? null,
      branchName: control.execution.branchName,
      worktreePath: control.worktreePath,
    };
  }

  const worktreePath = await realpath(control.worktreePath);
  const worktreeRoot = await realpath(await runGit(worktreePath, ["rev-parse", "--show-toplevel"]));
  if (worktreeRoot !== worktreePath) {
    throw new DeliveryPublishError("delivery worktree path is not its git worktree root");
  }
  const branchName = portableName(control.execution.branchName, "delivery branch");
  const commitSha = verification.commitSha;
  const [worktreeHead, branchHead, dirty] = await Promise.all([
    runGit(worktreePath, ["rev-parse", "HEAD"]),
    runGit(worktreePath, ["rev-parse", `refs/heads/${branchName}`]),
    runGit(worktreePath, ["status", "--porcelain=v1", "--untracked-files=all"]),
  ]);
  if (worktreeHead !== commitSha || branchHead !== commitSha) {
    throw new DeliveryPublishError("verified commit no longer matches the delivery branch and worktree HEAD");
  }
  if (dirty) throw new DeliveryPublishError("verified delivery worktree must be clean before publication");

  const remote = portableName(input.remote ?? "origin", "remote");
  const remoteUrl = await runGit(worktreePath, ["remote", "get-url", "--push", remote]);
  const hostname = resolveHostname(remoteUrl, input.hostname);
  const title = cleanText(input.title, cycle.objective, 256, "draft PR title");
  const body = cleanText(
    input.body,
    `## CycleWarden verified delivery\n\n- Cycle: \`${cycle.cycleId}\`\n- Verification: \`${verification.recordId}\`\n- Commit: \`${commitSha}\`\n\nThis draft PR was opened only after independent verification. CycleWarden did not merge or deploy it.`,
    64 * 1024,
    "draft PR body"
  );
  const startedAt = input.now ?? new Date().toISOString();
  const steps: DeliveryPublicationRecord["steps"] = {
    ghAvailable: "not-run",
    ghAuthenticated: "not-run",
    push: "not-run",
    draftPr: "not-run",
  };
  let baseBranch = input.baseBranch?.trim() || "unknown";

  const finish = async (
    status: DeliveryPublicationRecord["status"],
    unresolvedRisks: string[],
    draftPrUrl: string | null
  ) => {
    const completedAt = new Date().toISOString();
    const publication: DeliveryPublicationRecord = {
      schemaVersion: 1,
      recordType: "delivery-publication",
      recordId: `publication:${sha256(`${cycle.cycleId}|${actor}|${completedAt}|${randomUUID()}`).slice(0, 24)}`,
      cycleId: cycle.cycleId,
      verificationRecordId: verification.recordId,
      actor,
      startedAt,
      completedAt,
      remote,
      remoteUrlDigest: sha256(remoteUrl),
      hostname,
      baseBranch,
      branchName,
      commitSha,
      titleDigest: sha256(title),
      bodyDigest: sha256(body),
      steps: { ...steps },
      draftPrUrl,
      status,
      unresolvedRisks: [...new Set(unresolvedRisks)],
      limitations: [
        "publication is explicitly opt-in and only opens a draft pull request for an independently verified commit",
        "CycleWarden does not merge, deploy, write production, or approve its own output",
        "git and GitHub CLI credentials remain under the current operating-system user's trust boundary",
        "external product validation has not been established",
      ],
    };
    const publicationEvidenceRef = await persistPublication(input, control, publication);
    return { authorization, cycle, publication, publicationEvidenceRef, branchName, worktreePath };
  };

  const ghVersion = await runProcess("gh", ["--version"], worktreePath);
  steps.ghAvailable = ghVersion.status;
  if (ghVersion.status !== "passed") {
    return await finish("inconclusive", ["GitHub CLI is unavailable; nothing was pushed"], null);
  }
  const ghAuth = await runProcess("gh", ["auth", "status", "--hostname", hostname], worktreePath);
  steps.ghAuthenticated = ghAuth.status;
  if (ghAuth.status !== "passed") {
    return await finish("inconclusive", ["GitHub CLI authentication is unavailable; nothing was pushed"], null);
  }

  if (baseBranch === "unknown") {
    const baseResult = await runProcess(
      "gh",
      ["repo", "view", "--json", "defaultBranchRef", "--jq", ".defaultBranchRef.name"],
      worktreePath
    );
    if (baseResult.status !== "passed" || !baseResult.stdout.trim()) {
      return await finish("inconclusive", ["cannot resolve the repository default branch; nothing was pushed"], null);
    }
    baseBranch = baseResult.stdout.trim();
  }
  baseBranch = portableName(baseBranch, "base branch");

  const push = await runProcess(
    "git",
    ["push", "--porcelain", remote, `refs/heads/${branchName}:refs/heads/${branchName}`],
    worktreePath
  );
  steps.push = push.status;
  if (push.status !== "passed") {
    return await finish("inconclusive", ["verified branch push failed; no draft PR was opened"], null);
  }

  const remoteHead = await runProcess(
    "git",
    ["ls-remote", "--heads", remote, `refs/heads/${branchName}`],
    worktreePath
  );
  if (remoteHead.status !== "passed") {
    return await finish(
      "inconclusive",
      ["verified branch was pushed but its remote commit could not be confirmed"],
      null
    );
  }
  if ((remoteHead.stdout.trim().split(/\s+/)[0] ?? "") !== commitSha) {
    return await finish(
      "rejected",
      ["remote branch does not resolve to the independently verified commit"],
      null
    );
  }

  const listResult = await runProcess(
    "gh",
    [
      "pr",
      "list",
      "--head",
      branchName,
      "--state",
      "open",
      "--json",
      "url,isDraft,state,headRefName,headRefOid,baseRefName,number",
      "--limit",
      "10",
    ],
    worktreePath
  );
  if (listResult.status !== "passed") {
    return await finish(
      "inconclusive",
      ["verified branch was pushed but existing pull requests could not be inspected"],
      null
    );
  }
  let pullRequests: PullRequestView[];
  try {
    pullRequests = parseJson<PullRequestView[]>(listResult.stdout || "[]", "gh pr list");
  } catch (error) {
    return await finish("inconclusive", [error instanceof Error ? error.message : String(error)], null);
  }
  const existing = pullRequests.find((pullRequest) => pullRequest.headRefName === branchName);
  if (existing) {
    const matches =
      existing.isDraft &&
      existing.state.toUpperCase() === "OPEN" &&
      existing.baseRefName === baseBranch &&
      existing.headRefOid === commitSha;
    steps.draftPr = matches ? "passed" : "failed";
    return await finish(
      matches ? "published" : "rejected",
      matches
        ? []
        : ["an open pull request already exists but does not match the requested draft/base/commit combination"],
      existing.url
    );
  }

  const bodyPath = join(deliveryDirectory(input.store, cycle.cycleId), "draft-pr-body.md");
  await mkdir(dirname(bodyPath), { recursive: true });
  await writeFile(bodyPath, `${body}\n`, { encoding: "utf8", mode: 0o600 });
  const createResult = await runProcess(
    "gh",
    [
      "pr",
      "create",
      "--draft",
      "--base",
      baseBranch,
      "--head",
      branchName,
      "--title",
      title,
      "--body-file",
      bodyPath,
    ],
    worktreePath
  );
  steps.draftPr = createResult.status;
  const createdUrl = createResult.status === "passed" ? lastUrl(createResult.stdout) : null;
  if (!createdUrl) {
    return await finish(
      "inconclusive",
      ["verified branch was pushed but GitHub CLI did not return a draft PR URL"],
      null
    );
  }

  const viewResult = await runProcess(
    "gh",
    ["pr", "view", createdUrl, "--json", "url,isDraft,state,headRefName,headRefOid,baseRefName,number"],
    worktreePath
  );
  if (viewResult.status !== "passed") {
    return await finish(
      "inconclusive",
      ["draft PR was created but its final GitHub state could not be verified"],
      createdUrl
    );
  }
  let created: PullRequestView;
  try {
    created = parseJson<PullRequestView>(viewResult.stdout, "gh pr view");
  } catch (error) {
    return await finish(
      "inconclusive",
      [error instanceof Error ? error.message : String(error)],
      createdUrl
    );
  }
  const verifiedDraft =
    created.url === createdUrl &&
    created.isDraft &&
    created.state.toUpperCase() === "OPEN" &&
    created.headRefName === branchName &&
    created.headRefOid === commitSha &&
    created.baseRefName === baseBranch;
  return await finish(
    verifiedDraft ? "published" : "rejected",
    verifiedDraft ? [] : ["created pull request did not match the verified draft publication contract"],
    created.url || createdUrl
  );
}

export async function showDeliveryPublication(store: EvolutionStore, cycleId: string) {
  const control = await loadControl(store, cycleId);
  return {
    publication: control.publication ?? null,
    publicationEvidenceRef: control.publicationEvidenceRef ?? null,
  };
}

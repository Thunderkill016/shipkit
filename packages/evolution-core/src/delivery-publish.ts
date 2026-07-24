import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import {
  DeliveryError,
  loadDeliveryControl,
  writeDeliveryControl,
  type DeliveryPublicationRecord,
} from "./delivery.js";
import { EvidenceRegistry } from "./evidence.js";
import { EvolutionStore } from "./persistence.js";
import { authorizeAction } from "./policy.js";

const execFileAsync = promisify(execFile);
const GIT_MAX_BUFFER = 4 * 1024 * 1024;
const GH_MAX_BUFFER = 4 * 1024 * 1024;
const COMMAND_TIMEOUT_MS = 60_000;

export type PublishDeliveryInput = {
  store: EvolutionStore;
  cycleId: string;
  projectRoot: string;
  actor: string;
  remoteName?: string;
  baseBranch: string;
  title?: string;
  confirmPushAndDraftPr: boolean;
  now?: string;
};

type PullRequestView = {
  number: number;
  url: string;
  isDraft: boolean;
  state: string;
  headRefName: string;
  baseRefName: string;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeEnvironment(): NodeJS.ProcessEnv {
  const keys = ["PATH", "HOME", "USERPROFILE", "SYSTEMROOT", "TMPDIR", "TMP", "TEMP"];
  const environment: NodeJS.ProcessEnv = { CI: "true", NO_COLOR: "1" };
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined) environment[key] = value;
  }
  return environment;
}

async function runCommand(cwd: string, executable: string, args: string[]): Promise<string> {
  try {
    const result = await execFileAsync(executable, args, {
      cwd,
      env: safeEnvironment(),
      maxBuffer: executable === "git" ? GIT_MAX_BUFFER : GH_MAX_BUFFER,
      timeout: COMMAND_TIMEOUT_MS,
      windowsHide: true,
    });
    return result.stdout.trim();
  } catch (error) {
    const stderr =
      typeof error === "object" && error !== null && "stderr" in error
        ? String(error.stderr ?? "").trim()
        : "";
    throw new DeliveryError(stderr || (error instanceof Error ? error.message : String(error)));
  }
}

async function runGit(cwd: string, args: string[]): Promise<string> {
  return await runCommand(cwd, "git", args);
}

async function runGh(cwd: string, args: string[]): Promise<string> {
  try {
    return await runCommand(cwd, "gh", args);
  } catch (error) {
    throw new DeliveryError(
      `GitHub CLI failed for gh ${args.slice(0, 2).join(" ")}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

async function canonicalRepositoryRoot(projectRoot: string): Promise<string> {
  const requested = await realpath(resolve(projectRoot));
  const gitRoot = await realpath(await runGit(requested, ["rev-parse", "--show-toplevel"]));
  if (requested !== gitRoot) {
    throw new DeliveryError(`project root must equal the git worktree root: ${gitRoot}`);
  }
  return gitRoot;
}

function parseGitHubRepository(remoteUrl: string): string {
  const value = remoteUrl.trim().replace(/\/$/, "");
  const patterns = [
    /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i,
    /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i,
    /^ssh:\/\/git@github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/i,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1] && match[2]) return `${match[1]}/${match[2]}`;
  }
  throw new DeliveryError("draft PR publication currently requires a github.com remote URL");
}

function normalizedTitle(value: string): string {
  const title = value.replace(/\s+/g, " ").trim();
  if (!title || title.length > 160) {
    throw new DeliveryError("draft PR title must contain 1-160 characters");
  }
  return title;
}

function buildBody(input: {
  cycleId: string;
  executionRunId: string;
  verificationRecordId: string;
  commitSha: string;
  changedFiles: string[];
  checks: string[];
}): string {
  return [
    "## CycleWarden verified delivery",
    "",
    `- Cycle: ${input.cycleId}`,
    `- Execution: ${input.executionRunId}`,
    `- Verification: ${input.verificationRecordId}`,
    `- Verified commit: ${input.commitSha}`,
    "",
    "### Changed files",
    "",
    ...input.changedFiles.map((path) => `- ${path}`),
    "",
    "### Independent checks",
    "",
    ...input.checks.map((check) => `- ${check} passed`),
    "",
    "This pull request was opened as a draft after CycleWarden independent verification.",
    "It was not merged or deployed automatically.",
    "",
  ].join("\n");
}

async function persistPublication(input: {
  store: EvolutionStore;
  projectRoot: string;
  control: Awaited<ReturnType<typeof loadDeliveryControl>>;
  publication: DeliveryPublicationRecord;
}): Promise<string> {
  const evidence = await new EvidenceRegistry(input.store.rootDir, input.projectRoot).registerJson(
    "delivery-publication",
    input.publication
  );
  const evidenceRef = `evidence:${evidence.occurrenceId}`;
  input.control.publication = input.publication;
  input.control.publicationEvidenceRef = evidenceRef;
  await writeDeliveryControl(input.store, input.control);
  return evidenceRef;
}

export async function publishDelivery(input: PublishDeliveryInput) {
  if (!input.confirmPushAndDraftPr) {
    throw new DeliveryError("publish requires explicit --confirm-push-and-draft-pr acknowledgement");
  }
  const actor = input.actor.trim();
  if (!actor) throw new DeliveryError("delivery publisher actor is required");
  const baseBranch = input.baseBranch.trim();
  if (!baseBranch) throw new DeliveryError("draft PR base branch is required");
  const remoteName = input.remoteName?.trim() || "origin";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(remoteName)) {
    throw new DeliveryError("remote name must be a portable 1-64 character identifier");
  }

  const projectRoot = await canonicalRepositoryRoot(input.projectRoot);
  const cycle = await input.store.load(input.cycleId);
  if (cycle.stage !== "verified") {
    throw new DeliveryError(`publish requires a verified cycle; current stage is ${cycle.stage}`);
  }
  const control = await loadDeliveryControl(input.store, input.cycleId);
  if (control.publication) {
    throw new DeliveryError("delivery already has a recorded publication; duplicate PR creation is blocked");
  }
  if (control.projectRoot !== projectRoot) {
    throw new DeliveryError("delivery control project root does not match the requested repository");
  }
  const verification = control.verification;
  if (!verification || verification.verdict !== "accepted" || !verification.commitSha) {
    throw new DeliveryError("publish requires an accepted verification with an exact commit");
  }
  if (
    !control.verificationEvidenceRef ||
    !cycle.artifacts.verification.includes(control.verificationEvidenceRef)
  ) {
    throw new DeliveryError("delivery verification evidence is not linked from the verified cycle");
  }

  await runGit(projectRoot, ["check-ref-format", "--branch", baseBranch]);
  const branchName = control.execution.branchName;
  if (baseBranch === branchName) throw new DeliveryError("draft PR base and head branches must differ");
  const branchHead = await runGit(projectRoot, ["rev-parse", `refs/heads/${branchName}`]);
  const worktreeHead = await runGit(control.worktreePath, ["rev-parse", "HEAD"]);
  if (branchHead !== verification.commitSha || worktreeHead !== verification.commitSha) {
    throw new DeliveryError("local delivery branch no longer points to the independently verified commit");
  }
  const dirty = await runGit(control.worktreePath, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (dirty) throw new DeliveryError("verified delivery worktree must be clean before publication");
  await runGit(projectRoot, ["merge-base", "--is-ancestor", control.execution.baseCommit, verification.commitSha]);
  const commitCount = await runGit(projectRoot, [
    "rev-list",
    "--count",
    `${control.execution.baseCommit}..${verification.commitSha}`,
  ]);
  if (commitCount !== "1") {
    throw new DeliveryError("verified delivery publication requires exactly one commit after the recorded base");
  }

  const remoteUrl = await runGit(projectRoot, ["remote", "get-url", remoteName]);
  const pushUrl = await runGit(projectRoot, ["remote", "get-url", "--push", remoteName]);
  const repository = parseGitHubRepository(remoteUrl);
  const authorization = authorizeAction({
    autonomy: cycle.autonomy,
    risk: cycle.risk,
    action: "open-draft-pr",
    cycleId: cycle.cycleId,
    requiredScope: `cycle:${cycle.cycleId}:open-draft-pr:${repository}`,
    approvals: cycle.approvals,
    now: input.now,
  });
  if (!authorization.allowed) throw new DeliveryError(authorization.reason);

  await runGh(projectRoot, ["--version"]);
  await runGh(projectRoot, ["auth", "status", "--hostname", "github.com"]);
  const existingRemote = await runGit(projectRoot, [
    "ls-remote",
    "--heads",
    pushUrl,
    `refs/heads/${branchName}`,
  ]);
  if (existingRemote) {
    throw new DeliveryError("remote delivery branch already exists; refusing a duplicate or force publication");
  }

  await runGit(projectRoot, [
    "push",
    "--set-upstream",
    remoteName,
    `refs/heads/${branchName}:refs/heads/${branchName}`,
  ]);
  const remoteLine = await runGit(projectRoot, [
    "ls-remote",
    "--heads",
    pushUrl,
    `refs/heads/${branchName}`,
  ]);
  const remoteCommit = remoteLine.split(/\s+/)[0] ?? "";
  if (remoteCommit !== verification.commitSha) {
    throw new DeliveryError("remote branch does not match the independently verified commit after push");
  }

  const handoff = cycle.research?.executionHandoffs.at(-1);
  const title = normalizedTitle(input.title ?? `CycleWarden: ${handoff?.objective ?? cycle.objective}`);
  const body = buildBody({
    cycleId: cycle.cycleId,
    executionRunId: control.execution.runId,
    verificationRecordId: verification.recordId,
    commitSha: verification.commitSha,
    changedFiles: verification.changedFiles,
    checks: verification.checks.map((check) => check.id),
  });
  const bodyRoot = await mkdtemp(join(tmpdir(), "cyclewarden-draft-pr-"));
  const bodyPath = join(bodyRoot, "body.md");
  const createdAt = input.now ?? new Date().toISOString();

  try {
    await writeFile(bodyPath, body, { encoding: "utf8", mode: 0o600 });
    try {
      await runGh(control.worktreePath, [
        "pr",
        "create",
        "--draft",
        "--repo",
        repository,
        "--base",
        baseBranch,
        "--head",
        branchName,
        "--title",
        title,
        "--body-file",
        bodyPath,
      ]);
      const rawView = await runGh(control.worktreePath, [
        "pr",
        "view",
        branchName,
        "--repo",
        repository,
        "--json",
        "number,url,isDraft,state,headRefName,baseRefName",
      ]);
      let view: PullRequestView;
      try {
        view = JSON.parse(rawView) as PullRequestView;
      } catch {
        throw new DeliveryError("gh pr view returned invalid JSON");
      }
      if (
        !Number.isInteger(view.number) ||
        typeof view.url !== "string" ||
        !view.url.startsWith(`https://github.com/${repository}/pull/`) ||
        view.state !== "OPEN" ||
        view.isDraft !== true ||
        view.headRefName !== branchName ||
        view.baseRefName !== baseBranch
      ) {
        throw new DeliveryError("created pull request does not match the expected repository, open draft head/base");
      }
      const publication: DeliveryPublicationRecord = {
        schemaVersion: 1,
        recordType: "delivery-publication",
        recordId: `publication:${sha256(`${cycle.cycleId}|${verification.recordId}|${createdAt}`).slice(0, 24)}`,
        cycleId: cycle.cycleId,
        executionRunId: control.execution.runId,
        verificationRecordId: verification.recordId,
        actor,
        createdAt,
        remoteName,
        repository,
        baseBranch,
        headBranch: branchName,
        commitSha: verification.commitSha,
        authorization,
        push: { status: "pushed", remoteCommit },
        pullRequest: {
          status: "created",
          number: view.number,
          url: view.url,
          state: "OPEN",
          isDraft: true,
        },
        outcome: "published",
        unresolvedRisks: [],
        limitations: [
          "publication opens a draft PR only and never merges or deploys",
          "the first slice supports github.com remotes only",
          "trusted-local delivery and publication run with the current operating-system user's privileges",
          "external product validation has not been established",
        ],
      };
      const evidenceRef = await persistPublication({ store: input.store, projectRoot, control, publication });
      return { cycle, publication, publicationEvidenceRef: evidenceRef };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const publication: DeliveryPublicationRecord = {
        schemaVersion: 1,
        recordType: "delivery-publication",
        recordId: `publication:${sha256(`${cycle.cycleId}|${verification.recordId}|${createdAt}|failed`).slice(0, 24)}`,
        cycleId: cycle.cycleId,
        executionRunId: control.execution.runId,
        verificationRecordId: verification.recordId,
        actor,
        createdAt,
        remoteName,
        repository,
        baseBranch,
        headBranch: branchName,
        commitSha: verification.commitSha,
        authorization,
        push: { status: "pushed", remoteCommit },
        pullRequest: { status: "failed", errorDigest: sha256(message) },
        outcome: "inconclusive",
        unresolvedRisks: ["verified branch was pushed but draft PR creation or confirmation failed"],
        limitations: [
          "manual GitHub recovery may be required because the remote branch already exists",
          "no merge or deployment action was invoked",
        ],
      };
      await persistPublication({ store: input.store, projectRoot, control, publication });
      throw new DeliveryError(
        "verified branch was pushed but draft PR publication was inconclusive; inspect cyclewarden-deliver show"
      );
    }
  } finally {
    await rm(bodyRoot, { recursive: true, force: true });
  }
}

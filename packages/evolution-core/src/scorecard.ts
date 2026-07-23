import type { CheckReport } from "./check-runner.js";
import type { ProjectSnapshot } from "./repository.js";

export type ScorecardStatus = "pass" | "warn" | "fail" | "unknown";

export type ScorecardDimension = {
  id: "coverage" | "repository-state" | "verification" | "automation" | "product-context" | "risk-map";
  status: ScorecardStatus;
  summary: string;
  evidence: string[];
};

export type ProjectScorecard = {
  schemaVersion: 1;
  projectName: string;
  createdAt: string;
  readiness: "ready-for-research" | "needs-foundation" | "blocked";
  researchReadiness: "ready-for-research" | "needs-foundation" | "blocked";
  executionReadiness: "trusted-local-only" | "not-assessed" | "blocked";
  verificationReadiness: "ready" | "unknown" | "blocked";
  autonomyCeiling: "A0" | "A1" | "A2";
  evidenceConfidence: "low" | "medium" | "high";
  dimensions: ScorecardDimension[];
  strengths: string[];
  blockers: string[];
  unknowns: string[];
  nextActions: string[];
  checkSummary: CheckReport["summary"];
  limitations: string[];
};

function dimension(
  id: ScorecardDimension["id"],
  status: ScorecardStatus,
  summary: string,
  evidence: string[]
): ScorecardDimension {
  return { id, status, summary, evidence };
}

export function createProjectScorecard(
  snapshot: ProjectSnapshot,
  checks: CheckReport,
  options: { now?: string } = {}
): ProjectScorecard {
  const dimensions: ScorecardDimension[] = [];
  const strengths: string[] = [];
  const blockers: string[] = [];
  const unknowns: string[] = [];
  const nextActions: string[] = [];

  if (snapshot.inventory.truncated) {
    dimensions.push(
      dimension(
        "coverage",
        "fail",
        "Repository inventory reached the configured file limit.",
        [`files-observed:${snapshot.inventory.filesObserved}`]
      )
    );
    blockers.push("Repository coverage is truncated, so broad conclusions are unsafe.");
    nextActions.push("Increase the scan limit or split the repository into explicit scopes.");
  } else if (snapshot.inventory.filesObserved > 0) {
    dimensions.push(
      dimension(
        "coverage",
        "pass",
        "Repository inventory completed without truncation.",
        [`files-observed:${snapshot.inventory.filesObserved}`]
      )
    );
    strengths.push("Repository inventory completed without truncation.");
  } else {
    dimensions.push(dimension("coverage", "fail", "No repository files were observed.", []));
    blockers.push("No repository files were observed.");
  }

  if (!snapshot.git.detected) {
    dimensions.push(
      dimension("repository-state", "unknown", "No Git worktree was detected.", [])
    );
    unknowns.push("Version-control revision and dirty state are unknown.");
  } else if (snapshot.git.dirty) {
    dimensions.push(
      dimension(
        "repository-state",
        "warn",
        "The inspected worktree contains uncommitted changes.",
        [snapshot.git.commit ? `commit:${snapshot.git.commit}` : "commit:unknown"]
      )
    );
    nextActions.push("Separate or commit unrelated work before an implementation cycle.");
  } else {
    dimensions.push(
      dimension(
        "repository-state",
        "pass",
        "The inspected Git worktree is clean.",
        [snapshot.git.commit ? `commit:${snapshot.git.commit}` : "commit:unknown"]
      )
    );
    strengths.push("The inspected Git worktree is clean and attributable.");
  }

  const executed = checks.results.length;
  const passing = checks.summary.passed;
  const failing = checks.summary.failed + checks.summary.timedOut + checks.summary.unavailable;
  if (snapshot.checks.length === 0) {
    dimensions.push(
      dimension("verification", "unknown", "No standard verification scripts were discovered.", [])
    );
    unknowns.push("The repository has no discovered test, lint, typecheck, check, verify, or build script.");
    nextActions.push("Define at least one deterministic repository check before autonomous delivery.");
  } else if (executed === 0) {
    dimensions.push(
      dimension(
        "verification",
        "warn",
        "Verification scripts were discovered but none were executed.",
        snapshot.checks.map((check) => `${check.source}:${check.name}`)
      )
    );
    nextActions.push("Run one or more discovered checks in the temporary check workspace.");
  } else if (failing > 0) {
    dimensions.push(
      dimension(
        "verification",
        "fail",
        `${failing} executed check(s) failed, timed out, or were unavailable.`,
        checks.results.map((result) => `${result.source}:${result.name}:${result.status}`)
      )
    );
    blockers.push("The current technical baseline is not green for all executed checks.");
    nextActions.push("Diagnose failed checks before treating later changes as verified improvements.");
  } else {
    dimensions.push(
      dimension(
        "verification",
        "pass",
        `${passing} temporary-workspace repository check(s) passed.`,
        checks.results.map((result) => `${result.source}:${result.name}:${result.status}`)
      )
    );
    strengths.push(`${passing} temporary-workspace repository check(s) passed.`);
  }

  if (snapshot.ci.length > 0) {
    dimensions.push(
      dimension("automation", "pass", "Continuous-integration configuration was discovered.", snapshot.ci)
    );
    strengths.push("Continuous-integration configuration is present.");
  } else {
    dimensions.push(
      dimension("automation", "warn", "No continuous-integration configuration was discovered.", [])
    );
    nextActions.push("Add a repeatable CI gate before increasing execution autonomy.");
  }

  if (snapshot.productSignals.length > 0) {
    dimensions.push(
      dimension(
        "product-context",
        "pass",
        "Explicit product, roadmap, capability, decision, or experiment artifacts were discovered.",
        snapshot.productSignals
      )
    );
    strengths.push("Explicit product-development context is present in the repository.");
  } else if (snapshot.documentation.length > 0) {
    dimensions.push(
      dimension(
        "product-context",
        "warn",
        "Documentation exists, but no explicit product or experiment artifacts were discovered.",
        snapshot.documentation
      )
    );
    unknowns.push("Product mission, target user, desired outcomes, and current experiments are not explicit.");
    nextActions.push("Create a small evidence-backed product brief before opportunity selection.");
  } else {
    dimensions.push(
      dimension("product-context", "unknown", "No durable product or project documentation was discovered.", [])
    );
    unknowns.push("The repository does not expose enough durable context for autonomous product research.");
    nextActions.push("Record mission, users, constraints, and measurable outcomes in the repository.");
  }

  if (snapshot.trustBoundaries.length > 0) {
    dimensions.push(
      dimension(
        "risk-map",
        "pass",
        "Structural trust boundaries were identified for policy review.",
        snapshot.trustBoundaries.flatMap((boundary) =>
          boundary.evidencePaths.map((path) => `${boundary.kind}:${path}`)
        )
      )
    );
    strengths.push("Sensitive structural areas are visible to the policy layer.");
  } else {
    dimensions.push(
      dimension(
        "risk-map",
        "unknown",
        "No known authentication, database, deployment, secret-template, or payment boundary was detected.",
        []
      )
    );
    unknowns.push("Absence of detected trust boundaries is not proof that the project is low risk.");
  }

  const hasFail = dimensions.some((item) => item.status === "fail");
  const hasCoverage = dimensions.find((item) => item.id === "coverage")?.status === "pass";
  const hasContext = dimensions.find((item) => item.id === "product-context")?.status === "pass";
  const hasCleanGit = dimensions.find((item) => item.id === "repository-state")?.status === "pass";
  const researchReadiness = hasFail
    ? "blocked"
    : hasCoverage && hasContext
      ? "ready-for-research"
      : "needs-foundation";
  const verificationReadiness = failing > 0 ? "blocked" : executed > 0 ? "ready" : "unknown";
  const executionReadiness = failing > 0
    ? "blocked"
    : executed > 0
      ? "trusted-local-only"
      : "not-assessed";
  const autonomyCeiling = hasFail ? "A0" : researchReadiness === "ready-for-research" ? "A2" : "A1";
  const evidenceConfidence =
    hasCoverage && hasContext && hasCleanGit && verificationReadiness === "ready"
      ? "high"
      : !hasFail && hasCoverage
        ? "medium"
        : "low";

  if (researchReadiness === "ready-for-research") {
    nextActions.push("Start bounded internal and external research against one explicit product decision.");
  } else if (researchReadiness === "needs-foundation") {
    nextActions.push("Resolve the highest-impact context or verification gap before opportunity research.");
  }
  if (executionReadiness === "trusted-local-only") {
    nextActions.push(
      "Treat check execution as trusted-local-only until a backend proves filesystem, process, dependency and network containment."
    );
  }

  return {
    schemaVersion: 1,
    projectName: snapshot.projectName,
    createdAt: options.now ?? new Date().toISOString(),
    readiness: researchReadiness,
    researchReadiness,
    executionReadiness,
    verificationReadiness,
    autonomyCeiling,
    evidenceConfidence,
    dimensions,
    strengths: [...new Set(strengths)],
    blockers: [...new Set(blockers)],
    unknowns: [...new Set(unknowns)],
    nextActions: [...new Set(nextActions)],
    checkSummary: checks.summary,
    limitations: [
      "The scorecard reports observable repository readiness; it is not a universal quality score.",
      "Research readiness does not imply code-execution readiness.",
      "Temporary-workspace checks are not a security sandbox.",
      "Passing technical checks does not prove product value, user demand, security, or production safety.",
      "Trust-boundary discovery is structural and must be reviewed before higher-risk actions.",
    ],
  };
}
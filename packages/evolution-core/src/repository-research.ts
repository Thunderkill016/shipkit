import { createHash } from "node:crypto";
import { evaluatePreparedResearch, assertResearchReviewPassed } from "./research-review.js";
import { prepareResearchToExecution, type ResearchBundleInput } from "./research.js";
import type { ProjectSnapshot } from "./repository.js";
import type { ProjectScorecard } from "./scorecard.js";
import { transitionCycle } from "./state-machine.js";
import type {
  EvolutionCycle,
  ResearchBrief,
  ResearchBudget,
  ResearchEvaluationRecord,
  ResearchPlan,
  ResearchRunRecord,
} from "./types.js";

export type RepositoryResearchOptions = {
  actor: string;
  reviewerActor: string;
  now?: string;
  startedAt?: string;
  budget?: Partial<ResearchBudget>;
  evidenceRefs: {
    snapshot: string;
    checks: string;
    scorecard: string;
  };
};

export type CompletedRepositoryResearch = {
  outcome: "completed";
  bundle: ResearchBundleInput;
  diagnosed: EvolutionCycle;
  researched: EvolutionCycle;
  decided: EvolutionCycle;
  planned: EvolutionCycle;
  run: ResearchRunRecord;
  evaluation: ResearchEvaluationRecord;
  records: ReturnType<typeof prepareResearchToExecution>["records"];
};

export type InconclusiveRepositoryResearch = {
  outcome: "inconclusive";
  reason: string;
  diagnosed: EvolutionCycle;
  inconclusive: EvolutionCycle;
  run: ResearchRunRecord;
  evaluation: ResearchEvaluationRecord;
};

export type RepositoryResearchPreparation =
  | CompletedRepositoryResearch
  | InconclusiveRepositoryResearch;

const REQUIRED_QUESTIONS = [
  "Is repository coverage complete enough for a bounded decision?",
  "What deterministic verification evidence exists today?",
  "What durable product context is present or missing?",
  "Which automation and trust boundaries constrain the experiment?",
  "What important decision cannot repository evidence answer?",
];

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function recordId(kind: string, cycleId: string, payload: unknown): string {
  return `${kind}:${hash({ kind, cycleId, payload }).slice(0, 24)}`;
}

function normalizeBudget(input: Partial<ResearchBudget> = {}): ResearchBudget {
  const integer = (value: number | undefined, fallback: number, label: string) => {
    const normalized = value ?? fallback;
    if (!Number.isInteger(normalized) || normalized <= 0) {
      throw new Error(`${label} must be a positive integer`);
    }
    return normalized;
  };
  const maxCostUsd = input.maxCostUsd ?? 0;
  if (!Number.isFinite(maxCostUsd) || maxCostUsd < 0) {
    throw new Error("maxCostUsd must be a non-negative number");
  }
  return {
    maxQueries: integer(input.maxQueries, 8, "maxQueries"),
    maxSources: integer(input.maxSources, 8, "maxSources"),
    maxMinutes: integer(input.maxMinutes, 15, "maxMinutes"),
    maxCostUsd,
  };
}

function minutesBetween(startedAt: string, completedAt: string): number {
  const difference = Math.max(0, Date.parse(completedAt) - Date.parse(startedAt));
  return Math.max(1, Math.ceil(difference / 60_000));
}

function createRun(input: {
  cycle: EvolutionCycle;
  actor: string;
  now: string;
  startedAt: string;
  budget: ResearchBudget;
  evidenceRefs: string[];
  queries: number;
  sources: number;
  coverageGaps: string[];
  stopReason: string;
  outcome: ResearchRunRecord["outcome"];
}): ResearchRunRecord {
  const payload = {
    adapter: "repository-single-worker" as const,
    startedAt: input.startedAt,
    completedAt: input.now,
    budget: input.budget,
    usage: {
      queries: input.queries,
      sources: input.sources,
      minutes: minutesBetween(input.startedAt, input.now),
      costUsd: 0,
    },
    coverage: {
      required: REQUIRED_QUESTIONS,
      answered: input.outcome === "completed" ? REQUIRED_QUESTIONS : [],
      gaps: input.coverageGaps,
    },
    stopReason: input.stopReason,
    outcome: input.outcome,
  };
  return {
    recordId: recordId("research-run", input.cycle.cycleId, payload),
    cycleId: input.cycle.cycleId,
    actor: input.actor,
    createdAt: input.now,
    evidenceRefs: unique(input.evidenceRefs),
    kind: "research-run",
    ...payload,
  };
}

function createBriefAndPlan(input: {
  cycle: EvolutionCycle;
  actor: string;
  now: string;
  budget: ResearchBudget;
  evidenceRefs: string[];
}): { brief: ResearchBrief; plan: ResearchPlan } {
  const briefPayload = {
    decisionQuestion: `Which repository-grounded experiment should ${input.cycle.objective} prioritize next without claiming unobserved user demand?`,
    owner: input.actor,
    deadline: null,
    assumptions: [
      "The inspected checkout and scorecard represent the repository state used for this decision.",
    ],
    constraints: [
      "Repository-only research may identify readiness gaps but cannot establish user demand.",
      "Research may run bounded checks in temporary copies but may not mutate product code.",
    ],
    evidenceThreshold:
      "Every material claim must resolve to repository or scorecard evidence and expose uncertainty.",
    protectedOutcomes: [
      "Do not read secret-bearing files.",
      "Do not merge, deploy, spend, or write production data.",
    ],
  };
  const brief: ResearchBrief = {
    recordId: recordId("research-brief", input.cycle.cycleId, briefPayload),
    cycleId: input.cycle.cycleId,
    actor: input.actor,
    createdAt: input.now,
    evidenceRefs: unique(input.evidenceRefs),
    kind: "research-brief",
    ...briefPayload,
  };
  const planPayload = {
    briefId: brief.recordId,
    questions: REQUIRED_QUESTIONS,
    sourceStrategy: [
      "Fresh bounded repository inventory",
      "Temporary-workspace check report",
      "Deterministic project readiness scorecard",
    ],
    budget: input.budget,
    stopConditions: [
      "Stop when every repository-answerable question has a source-backed claim.",
      "Stop when remaining uncertainty requires direct user or external evidence.",
      "Return inconclusive when inventory or budget cannot support the minimum coverage map.",
    ],
  };
  const plan: ResearchPlan = {
    recordId: recordId("research-plan", input.cycle.cycleId, planPayload),
    cycleId: input.cycle.cycleId,
    actor: input.actor,
    createdAt: input.now,
    evidenceRefs: unique(input.evidenceRefs),
    kind: "research-plan",
    ...planPayload,
  };
  return { brief, plan };
}

function dimension(scorecard: ProjectScorecard, id: string) {
  return scorecard.dimensions.find((item) => item.id === id);
}

function createBundle(
  cycle: EvolutionCycle,
  snapshot: ProjectSnapshot,
  scorecard: ProjectScorecard,
  budget: ResearchBudget,
  evidenceRefs: RepositoryResearchOptions["evidenceRefs"]
): ResearchBundleInput {
  const coverage = dimension(scorecard, "coverage");
  const verification = dimension(scorecard, "verification");
  const productContext = dimension(scorecard, "product-context");
  const automation = dimension(scorecard, "automation");
  const riskMap = dimension(scorecard, "risk-map");
  const snapshotVersion = snapshot.git.commit ?? snapshot.scannedAt;

  const sources: ResearchBundleInput["sources"] = [
    {
      canonicalId: `repository-snapshot:${snapshotVersion}`,
      title: `${snapshot.projectName} repository snapshot`,
      publisher: snapshot.projectName,
      sourceClass: "repository",
      version: snapshot.git.commit,
      accessedAt: snapshot.scannedAt,
      license: null,
      authority: 1,
      directness: 1,
      freshness: 1,
      applicability: 1,
      independence: 0.2,
      conflictOfInterest: "Repository-maintained evidence may omit user or external context.",
      evidenceRefs: [evidenceRefs.snapshot],
    },
    {
      canonicalId: `check-report:${scorecard.createdAt}`,
      title: `${snapshot.projectName} temporary-workspace check report`,
      publisher: "Shipkit Evolution Core",
      sourceClass: "repository",
      version: snapshot.git.commit,
      accessedAt: scorecard.createdAt,
      license: null,
      authority: 0.9,
      directness: 1,
      freshness: 1,
      applicability: 0.9,
      independence: 0.4,
      conflictOfInterest: "Checks are selected from repository scripts and run by Shipkit.",
      evidenceRefs: [evidenceRefs.checks],
    },
    {
      canonicalId: `project-scorecard:${scorecard.createdAt}`,
      title: `${snapshot.projectName} readiness scorecard`,
      publisher: "Shipkit Evolution Core",
      sourceClass: "repository",
      version: snapshot.git.commit,
      accessedAt: scorecard.createdAt,
      license: null,
      authority: 0.8,
      directness: 0.9,
      freshness: 1,
      applicability: 1,
      independence: 0.4,
      conflictOfInterest: "The scorecard is a deterministic interpretation of repository evidence.",
      evidenceRefs: [evidenceRefs.scorecard],
    },
  ];

  const checksPassed = scorecard.checkSummary.passed;
  const verificationStatement =
    verification?.status === "pass"
      ? `${checksPassed} temporary-workspace check(s) passed in the current repository assessment.`
      : verification?.summary ?? "The verification baseline is unknown.";
  const productStatement =
    productContext?.status === "pass"
      ? `The repository exposes explicit product-development context through ${snapshot.productSignals.length} product signal file(s).`
      : productContext?.summary ?? "Durable product context is missing or unknown.";
  const automationStatement =
    automation?.status === "pass"
      ? `The repository contains ${snapshot.ci.length} continuous-integration configuration file(s).`
      : automation?.summary ?? "Continuous integration is not visible.";
  const riskStatement =
    riskMap?.status === "pass"
      ? `The repository exposes ${snapshot.trustBoundaries.length} structural trust boundary category record(s).`
      : riskMap?.summary ?? "Structural risk boundaries remain unknown.";

  const claims: ResearchBundleInput["claims"] = [
    {
      statement:
        coverage?.summary ??
        `Repository inventory observed ${snapshot.inventory.filesObserved} file(s); truncated=${snapshot.inventory.truncated}.`,
      claimType: snapshot.inventory.truncated ? "limitation" : "fact",
      confidence: snapshot.inventory.truncated ? 0.7 : 0.98,
      uncertainty: snapshot.inventory.truncated
        ? "The configured inventory limit prevents broad repository conclusions."
        : "Ignored directories and unreadable paths remain outside the inventory.",
      supportingSourceIndexes: [0],
      contradictingSourceIndexes: [],
      expiresAt: null,
    },
    {
      statement: verificationStatement,
      claimType: verification?.status === "pass" ? "fact" : "limitation",
      confidence: verification?.status === "pass" ? 0.95 : 0.8,
      uncertainty: "Passing repository checks does not establish security, usability, or product value.",
      supportingSourceIndexes: [1, 2],
      contradictingSourceIndexes: [],
      expiresAt: null,
    },
    {
      statement: productStatement,
      claimType: productContext?.status === "pass" ? "fact" : "limitation",
      confidence: 0.9,
      uncertainty: "Documentation presence does not prove that the product context is correct or current.",
      supportingSourceIndexes: [0, 2],
      contradictingSourceIndexes: [],
      expiresAt: null,
    },
    {
      statement: automationStatement,
      claimType: automation?.status === "pass" ? "fact" : "limitation",
      confidence: 0.95,
      uncertainty: "CI configuration presence does not prove every required gate is enforced.",
      supportingSourceIndexes: [0, 2],
      contradictingSourceIndexes: [],
      expiresAt: null,
    },
    {
      statement: riskStatement,
      claimType: riskMap?.status === "pass" ? "fact" : "limitation",
      confidence: riskMap?.status === "pass" ? 0.85 : 0.65,
      uncertainty: "Structural detection can miss dynamic or undocumented trust boundaries.",
      supportingSourceIndexes: [0, 2],
      contradictingSourceIndexes: [],
      expiresAt: null,
    },
    {
      statement:
        "Repository and check evidence alone cannot establish user demand, workflow severity, competitor behavior, or current external facts.",
      claimType: "limitation",
      confidence: 0.99,
      uncertainty: "Direct user research or external primary sources may change the opportunity ranking.",
      supportingSourceIndexes: [2],
      contradictingSourceIndexes: [],
      expiresAt: null,
    },
    {
      statement:
        "This repository assessment used the trusted-local path, which is not a security sandbox. Shipkit separately exposes a verified Docker sandbox baseline; its current capability limits must be read from the capability registry before any execution handoff.",
      claimType: "limitation",
      confidence: 0.98,
      uncertainty: "The selected assessment path and the available Docker backend provide different guarantees; neither establishes product value or authorizes agent execution.",
      supportingSourceIndexes: [1, 2],
      contradictingSourceIndexes: [],
      expiresAt: null,
    },
  ];

  const highestGap = scorecard.blockers[0] ?? scorecard.unknowns[0] ?? scorecard.nextActions[0] ??
    "The repository needs a smaller, explicit evidence-backed next action.";
  const gapExperiment = scorecard.nextActions[0] ??
    "Create one durable product brief and rerun repository assessment.";

  const opportunities: ResearchBundleInput["opportunities"] = [
    {
      title: "Close the highest repository-readiness gap",
      problem: highestGap,
      expectedOutcome: "Increase research readiness or evidence confidence on the next assessment.",
      evidenceClaimIndexes: [0, 1, 2, 3, 4],
      alternatives: ["Proceed despite the gap", "Collect broader external evidence first"],
      estimatedCost: "small-to-medium",
      risk: "low when limited to repository foundation",
      uncertainty: "The highest repository gap may not be the highest user-value opportunity.",
      learningValue: "Tests whether removing the visible foundation gap changes the next decision.",
      smallestExperiment: gapExperiment,
    },
    {
      title: "Publish a reproducible repository research audit",
      problem: "Repository observations, query paths, claims, limits, and stopping reasons are hard to reconstruct from raw assessment output alone.",
      expectedOutcome: "A reviewer can reproduce the internal evidence path without relying on researcher memory.",
      evidenceClaimIndexes: [0, 1, 2, 3, 4, 6],
      alternatives: ["Keep raw JSON only", "Write a one-off narrative report"],
      estimatedCost: "small",
      risk: "low",
      uncertainty: "A richer report may add complexity before users demonstrate a need for it.",
      learningValue: "Measures whether auditability improves review speed and trust.",
      smallestExperiment: "Render one repository research run and review verdict in the Evolution Workspace.",
    },
    {
      title: "Collect direct user evidence before feature expansion",
      problem: "The current evidence can rank repository-readiness work but cannot establish user demand or workflow severity.",
      expectedOutcome: "Replace assumption-driven product ranking with observed recent behavior and explicit uncertainty.",
      evidenceClaimIndexes: [2, 5],
      alternatives: ["Continue repository-only prioritization", "Use a broad preference survey"],
      estimatedCost: "small",
      risk: "low with consent and data minimization",
      uncertainty: "A small sample may reveal direction without estimating population prevalence.",
      learningValue: "Can confirm, change, or stop the next implementation decision before expensive work.",
      smallestExperiment: "Observe five recent target-user workflows and record consented atomic evidence.",
    },
  ];

  const selectedOpportunityIndex =
    scorecard.researchReadiness === "ready-for-research" && scorecard.blockers.length === 0 ? 2 : 0;
  const selected = opportunities[selectedOpportunityIndex]!;
  const directUserExperiment = selectedOpportunityIndex === 2;

  return {
    brief: {
      decisionQuestion: `Which repository-grounded experiment should ${snapshot.projectName} run next for: ${cycle.objective}?`,
      owner: "shipkit-researcher",
      deadline: null,
      assumptions: [
        "The inspected checkout is the intended project scope.",
        "Repository evidence is suitable for readiness decisions, not demand claims.",
      ],
      constraints: [
        "No product-code mutation during research.",
        "Do not read secrets or private sources without authorization.",
      ],
      evidenceThreshold:
        "Material claims require direct repository or scorecard evidence and explicit uncertainty.",
      protectedOutcomes: [
        "No secret capture",
        "No production writes",
        "No unsupported user-demand claim",
      ],
    },
    plan: {
      questions: REQUIRED_QUESTIONS,
      sourceStrategy: [
        "Repository snapshot",
        "Temporary-workspace check report",
        "Deterministic readiness scorecard",
      ],
      budget,
      stopConditions: [
        "All repository-answerable questions have source-backed claims.",
        "Remaining uncertainty requires direct user or external evidence.",
        "Marginal repository inspection would duplicate existing evidence.",
      ],
    },
    queries: [
      {
        query: "repository inventory coverage and truncation",
        rationale: REQUIRED_QUESTIONS[0]!,
        tool: "repository-inspector",
        parentQueryIndex: null,
        resultRefs: [evidenceRefs.snapshot],
      },
      {
        query: "discovered deterministic checks and current results",
        rationale: REQUIRED_QUESTIONS[1]!,
        tool: "temporary-check-runner",
        parentQueryIndex: null,
        resultRefs: [evidenceRefs.checks],
      },
      {
        query: "product roadmap decision experiment capability files",
        rationale: REQUIRED_QUESTIONS[2]!,
        tool: "repository-inspector",
        parentQueryIndex: null,
        resultRefs: [evidenceRefs.snapshot, evidenceRefs.scorecard],
      },
      {
        query: "ci authentication database deployment secrets payments boundaries",
        rationale: REQUIRED_QUESTIONS[3]!,
        tool: "repository-inspector",
        parentQueryIndex: null,
        resultRefs: [evidenceRefs.snapshot, evidenceRefs.scorecard],
      },
      {
        query: "repository evidence limitations user demand external facts",
        rationale: REQUIRED_QUESTIONS[4]!,
        tool: "research-boundary-review",
        parentQueryIndex: null,
        resultRefs: [evidenceRefs.scorecard],
      },
    ],
    sources,
    claims,
    contradictions: [
      {
        claimIndexes: [1, 6],
        summary:
          "Passing trusted-local checks can coexist with a separately available Docker sandbox baseline and different remaining limitations.",
        suspectedCause:
          "Technical correctness, the selected trusted-local path, and the available Docker containment capability answer different questions.",
        affectedDecision:
          "Whether the selected experiment may enter autonomous code execution.",
        status: "accepted-uncertainty",
      },
    ],
    opportunities,
    decision: {
      selectedOpportunityIndex,
      rejectedOpportunityIndexes: [0, 1, 2].filter((index) => index !== selectedOpportunityIndex),
      rationale:
        selectedOpportunityIndex === 2
          ? "The repository foundation is ready enough for research, while the largest decision-changing gap is direct user evidence."
          : "The current repository evidence shows a foundation gap that should be resolved before broader opportunity claims.",
    },
    experiment: {
      hypothesis: directUserExperiment
        ? "Five observed recent workflows will confirm, change, or stop the current opportunity ranking."
        : `Resolving “${selected.title}” will improve the next deterministic readiness assessment.`,
      method: directUserExperiment
        ? "Recruit five target users, obtain consent, observe a recent real workflow, extract atomic evidence, and rerun opportunity ranking."
        : `${selected.smallestExperiment} Then rerun inspect, checks, scorecard, and independent research review.`,
      successCriteria: directUserExperiment
        ? [
            "At least five consented workflow observations are recorded.",
            "Every user-problem claim links to direct user-research evidence.",
            "The resulting ranking records whether it changed, held, or became inconclusive.",
          ]
        : [
            "The targeted scorecard gap changes from fail/unknown/warn to a stronger state.",
            "Existing passing checks do not regress.",
          ],
      guardrails: [
        "No secrets or unnecessary personal data are captured.",
        "No merge, deployment, spending, or production write occurs.",
        "Repository-only evidence is not presented as proof of user demand.",
      ],
      rollbackPlan: directUserExperiment
        ? ["Delete non-required personal data while preserving anonymized decision evidence under policy."]
        : ["Revert the bounded repository change and retain the research and verification records."],
    },
    handoff: {
      allowedScope: directUserExperiment
        ? ["research/user-evidence", "docs/product-research"]
        : ["README.md", "IDEA.md", "ROADMAP.md", "docs/**", ".github/workflows/**", "package.json"],
      forbiddenScope: [
        "secrets",
        "production",
        "automatic merge",
        "automatic deploy",
        "unapproved personal data",
      ],
      acceptanceCriteria: directUserExperiment
        ? [
            "Consented evidence is represented as atomic source and claim records.",
            "The opportunity ranking is rerun with uncertainty and rejected alternatives visible.",
          ]
        : [
            "The selected repository-readiness gap is measurably reduced.",
            "The change remains reversible and does not widen trust boundaries without review.",
          ],
      verificationPlan: [
        "Rerun repository inspection and scorecard",
        "Run deterministic research review",
        "Preserve stop reason, limitations, and unresolved contradictions",
      ],
      rollbackPlan: directUserExperiment
        ? ["Remove unauthorized raw personal data and retain only approved anonymized evidence."]
        : ["Revert the bounded repository changes and rerun the baseline assessment."],
    },
  };
}

function createInconclusiveEvaluation(input: {
  cycle: EvolutionCycle;
  researcherActor: string;
  reviewerActor: string;
  now: string;
  reason: string;
  evidenceRefs: string[];
}): ResearchEvaluationRecord {
  const payload = {
    researcherActor: input.researcherActor,
    verdict: "inconclusive" as const,
    checks: [
      {
        id: "separate-reviewer" as const,
        passed: input.reviewerActor !== input.researcherActor,
        summary: "Reviewer and researcher actors must remain separate.",
        evidenceRefs: [],
      },
      {
        id: "budget-compliance" as const,
        passed: false,
        summary: input.reason,
        evidenceRefs: input.evidenceRefs,
      },
      {
        id: "stop-reason" as const,
        passed: true,
        summary: `Research stopped because: ${input.reason}`,
        evidenceRefs: input.evidenceRefs,
      },
    ],
    unsupportedClaimIds: [],
    unresolvedContradictionIds: [],
    stopReason: input.reason,
    limitations: ["The minimum repository research coverage map was not completed."],
  };
  return {
    recordId: recordId("research-evaluation", input.cycle.cycleId, payload),
    cycleId: input.cycle.cycleId,
    actor: input.reviewerActor,
    createdAt: input.now,
    evidenceRefs: unique(input.evidenceRefs),
    kind: "research-evaluation",
    ...payload,
  };
}

export function prepareRepositoryResearch(
  cycle: EvolutionCycle,
  snapshot: ProjectSnapshot,
  scorecard: ProjectScorecard,
  options: RepositoryResearchOptions
): RepositoryResearchPreparation {
  if (cycle.stage !== "modeled") {
    throw new Error(`repository research requires a modeled cycle; current stage is ${cycle.stage}`);
  }
  const actor = options.actor.trim();
  const reviewerActor = options.reviewerActor.trim();
  if (!actor || !reviewerActor) throw new Error("researcher and reviewer actors are required");
  if (actor === reviewerActor) throw new Error("reviewer actor must differ from researcher actor");

  const now = options.now ?? new Date().toISOString();
  const startedAt = options.startedAt ?? now;
  const budget = normalizeBudget(options.budget);
  const evidenceRefs = unique(Object.values(options.evidenceRefs));
  const minimumReason =
    snapshot.inventory.filesObserved === 0
      ? "No repository files were observed."
      : snapshot.inventory.truncated
        ? "Repository inventory was truncated, so broad opportunity ranking is unsafe."
        : budget.maxQueries < REQUIRED_QUESTIONS.length
          ? `Query budget ${budget.maxQueries} is below the ${REQUIRED_QUESTIONS.length}-question coverage map.`
          : budget.maxSources < 3
            ? "Source budget must allow snapshot, check report, and scorecard evidence."
            : budget.maxMinutes < 1
              ? "Research time budget is insufficient."
              : null;

  if (minimumReason) {
    const { brief, plan } = createBriefAndPlan({ cycle, actor, now, budget, evidenceRefs });
    const run = createRun({
      cycle,
      actor,
      now,
      startedAt,
      budget,
      evidenceRefs,
      queries: 0,
      sources: 0,
      coverageGaps: REQUIRED_QUESTIONS,
      stopReason: minimumReason,
      outcome: "inconclusive",
    });
    const evaluation = createInconclusiveEvaluation({
      cycle,
      researcherActor: actor,
      reviewerActor,
      now,
      reason: minimumReason,
      evidenceRefs,
    });
    const diagnosed = transitionCycle(cycle, "diagnosed", {
      actor,
      reason: "Framed repository research but could not satisfy the minimum evidence coverage map",
      now,
      addArtifacts: { diagnosis: evidenceRefs, candidates: evidenceRefs },
      appendResearch: { briefs: [brief], plans: [plan], runs: [run] },
    });
    const inconclusive = transitionCycle(diagnosed, "inconclusive", {
      actor: reviewerActor,
      reason: minimumReason,
      now,
      addArtifacts: { research: evidenceRefs },
      appendResearch: { evaluations: [evaluation] },
    });
    return { outcome: "inconclusive", reason: minimumReason, diagnosed, inconclusive, run, evaluation };
  }

  const bundle = createBundle(cycle, snapshot, scorecard, budget, options.evidenceRefs);
  const prepared = prepareResearchToExecution(cycle, bundle, {
    actor,
    now,
    evidenceRefs,
  });
  const stopReason =
    "Repository and scorecard evidence reached the bounded coverage map; remaining decision uncertainty requires user or external evidence.";
  const run = createRun({
    cycle,
    actor,
    now,
    startedAt,
    budget,
    evidenceRefs,
    queries: bundle.queries.length,
    sources: bundle.sources.length,
    coverageGaps: [
      "Direct user behavior",
      "Independent external corroboration",
      "Current competitor and market evidence",
    ],
    stopReason,
    outcome: "completed",
  });

  const researched = transitionCycle(prepared.diagnosed, "researched", {
    actor,
    reason: `Completed bounded repository research with ${bundle.queries.length} queries and ${bundle.sources.length} sources`,
    now,
    addArtifacts: { research: evidenceRefs },
    appendResearch: {
      runs: [run],
      queries: prepared.records.queries,
      sources: prepared.records.sources,
      claims: prepared.records.claims,
      contradictions: prepared.records.contradictions,
      opportunities: prepared.records.opportunities,
    },
  });
  const evaluation = evaluatePreparedResearch(prepared, {
    reviewerActor,
    now,
    evidenceRefs,
    run,
  });
  assertResearchReviewPassed(evaluation);
  const decided = transitionCycle(researched, "decided", {
    actor: reviewerActor,
    reason: "Independent research review passed before the selected opportunity was accepted",
    now,
    addArtifacts: { decision: evidenceRefs },
    appendResearch: {
      evaluations: [evaluation],
      decisions: [prepared.records.decision],
    },
  });
  const planned = transitionCycle(decided, "planned", {
    actor,
    reason: "Prepared the reviewed reversible experiment and parameter-bound execution handoff",
    now,
    addArtifacts: { plan: evidenceRefs, rollback: evidenceRefs },
    appendResearch: {
      experiments: [prepared.records.experiment],
      executionHandoffs: [prepared.records.executionHandoff],
    },
  });

  return {
    outcome: "completed",
    bundle,
    diagnosed: prepared.diagnosed,
    researched,
    decided,
    planned,
    run,
    evaluation,
    records: prepared.records,
  };
}

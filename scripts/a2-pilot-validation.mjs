const expectedPrimaryOutcomes = [
  "changed-decision",
  "materially-confirmed",
  "prevented-likely-waste",
  "no-decision-value",
];
const expectedDecisionValueOutcomes = expectedPrimaryOutcomes.slice(0, 3);
const expectedConsentItems = [
  "repository-ownership-or-permission",
  "exact-public-or-private-access-method",
  "secret-customer-and-unrelated-private-data-excluded",
  "inspection-scope-explicitly-approved",
  "no-mutation-merge-deploy-production-write-or-paid-call",
  "participant-may-stop-or-withdraw-raw-notes",
  "redacted-evidence-and-outcome-retention-approved",
];
const expectedPreAudit = [
  "recent-decision-context-and-deadline",
  "current-workflow-and-workaround",
  "alternatives-currently-considered",
  "preferred-decision-and-confidence",
  "evidence-already-used",
  "likely-action-without-cyclewarden",
  "estimated-cost-of-wrong-decision",
  "evidence-that-could-change-the-decision",
];
const expectedEligibility = [
  "solo-developer-or-active-open-source-maintainer",
  "used-coding-agent-on-real-repository-in-last-30-days",
  "authorized-to-use-selected-repository",
  "current-meaningful-prioritization-decision",
  "agrees-to-recent-behavior-not-hypothetical-preference",
];
const expectedExclusions = [
  "cyclewarden-audit-designer",
  "unscopable-secret-regulated-or-private-data",
  "enthusiasm-only-recruitment",
  "no-real-decision-due-during-pilot",
];
const expectedSecondaryMetrics = [
  "ranking-understood",
  "ranking-challengeable",
  "serious-evidence-failure",
  "privacy-safety-failure",
  "minutes-to-first-decision-changing-evidence",
  "recommendation-disposition",
  "contradictions",
  "false-positives",
  "missing-context",
  "rejected-recommendations",
  "later-experiment-survival",
  "repeat-use-intent",
];
const expectedProhibitedKeys = [
  "participantName",
  "email",
  "phone",
  "githubLogin",
  "repositoryUrl",
  "rawNotes",
  "secret",
  "credential",
  "customerData",
];
const expectedStopConditions = [
  "missing-or-ambiguous-consent",
  "participant-or-repository-ineligible",
  "scope-cannot-exclude-sensitive-data",
  "session-reaches-90-minutes",
  "participant-withdraws",
  "serious-evidence-privacy-or-safety-failure",
];
const sessionStatuses = new Set([
  "not-started",
  "scheduled",
  "in-progress",
  "completed",
]);
const technicalGateStatuses = new Set(["pending-merge", "ready"]);
const pilotStatuses = new Set(["not-started", "in-progress", "complete"]);
const technicalOutcomes = new Set(["passed", "failed", "inconclusive"]);
const recommendationDispositions = new Set([
  "accepted",
  "rejected",
  "inconclusive",
]);

function sameArray(actual, expected) {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}

function validIsoTimestamp(value) {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value;
}

function requireText(errors, value, path, minimum = 10) {
  if (typeof value !== "string" || value.trim().length < minimum) {
    errors.push(`${path} must contain at least ${minimum} characters`);
  }
}

function requireTextArray(
  errors,
  value,
  path,
  { minimumItems = 0, minimumText = 2 } = {}
) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }
  if (value.length < minimumItems) {
    errors.push(`${path} must contain at least ${minimumItems} item(s)`);
  }
  value.forEach((item, index) =>
    requireText(errors, item, `${path}[${index}]`, minimumText)
  );
}

function requireExactKeys(errors, value, path, expectedKeys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${path} must be an object`);
    return;
  }
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (!sameArray(actual, expected)) {
    errors.push(`${path} keys must remain separate and equal ${expected.join(", ")}`);
  }
}

function findProhibitedKeys(value, prohibited, path = "record", matches = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      findProhibitedKeys(item, prohibited, `${path}[${index}]`, matches)
    );
    return matches;
  }
  if (!value || typeof value !== "object") return matches;

  for (const [key, child] of Object.entries(value)) {
    if (prohibited.has(key)) matches.push(`${path}.${key}`);
    findProhibitedKeys(child, prohibited, `${path}.${key}`, matches);
  }
  return matches;
}

function findSensitiveStringContent(value, path = "record", matches = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      findSensitiveStringContent(item, `${path}[${index}]`, matches)
    );
    return matches;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      findSensitiveStringContent(child, `${path}.${key}`, matches);
    }
    return matches;
  }
  if (typeof value !== "string") return matches;
  if (path.endsWith(".issueUrl")) return matches;

  const patterns = [
    ["email address", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
    [
      "repository URL",
      /(?:https?:\/\/(?:www\.)?(?:github\.com|gitlab\.com|bitbucket\.org)\/[^/\s]+\/[^/\s]+|git@(?:github\.com|gitlab\.com|bitbucket\.org):[^/\s]+\/[^/\s]+)/i,
    ],
    [
      "secret-like token",
      /(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})/,
    ],
  ];
  for (const [label, pattern] of patterns) {
    if (pattern.test(value)) matches.push(`${path} contains ${label}`);
  }
  return matches;
}

function validateTemplateShape(template, errors) {
  if (template.schemaVersion !== 1) {
    errors.push("sessionTemplate.schemaVersion must equal 1");
  }
  if (template.participantId !== null || template.repositoryId !== null) {
    errors.push("sessionTemplate must not contain participant or repository identity");
  }

  const requiredTopLevel = [
    "schemaVersion",
    "protocolVersion",
    "participantId",
    "repositoryId",
    "eligibility",
    "consent",
    "recentBehavior",
    "preAuditDecision",
    "audit",
    "productOutcome",
    "experimentFollowup",
    "repeatUseIntent",
    "redactionReview",
  ];
  requireExactKeys(errors, template, "sessionTemplate", requiredTopLevel);
  requireExactKeys(errors, template.eligibility, "sessionTemplate.eligibility", [
    "soloDeveloperOrMaintainer",
    "recentCodingAgentUse",
    "repositoryAuthorized",
    "realDecisionDue",
    "recentBehaviorInterviewAccepted",
  ]);
  requireExactKeys(errors, template.consent, "sessionTemplate.consent", [
    "repositoryPermission",
    "accessMethodApproved",
    "sensitiveDataExcluded",
    "inspectionScopeApproved",
    "noMutationBoundaryAccepted",
    "withdrawalRightAccepted",
    "redactedRetentionAccepted",
  ]);
  requireExactKeys(
    errors,
    template.recentBehavior,
    "sessionTemplate.recentBehavior",
    ["decisionContext", "decisionDeadline", "currentWorkflow", "currentWorkaround"]
  );
  requireExactKeys(
    errors,
    template.preAuditDecision,
    "sessionTemplate.preAuditDecision",
    [
      "alternatives",
      "preferredAlternative",
      "confidence0To100",
      "evidenceAlreadyUsed",
      "likelyActionWithoutCycleWarden",
      "estimatedWrongDecisionCost",
      "decisionChangingEvidenceRequested",
      "capturedAt",
    ]
  );
  requireExactKeys(errors, template.audit, "sessionTemplate.audit", [
    "startedAt",
    "completedAt",
    "approvedInspectionScope",
    "technicalOutcome",
    "technicalLimitations",
  ]);
  requireExactKeys(errors, template.productOutcome, "sessionTemplate.productOutcome", [
    "classification",
    "specificEvidenceIds",
    "causalExplanation",
    "rankingUnderstood",
    "rankingChallengeable",
    "recommendationDisposition",
    "rejectionReason",
    "minutesToFirstDecisionChangingEvidence",
    "contradictions",
    "falsePositives",
    "missingContext",
    "rejectedRecommendations",
    "seriousEvidenceFailure",
    "privacySafetyFailure",
    "seriousFailureCategories",
  ]);
  requireExactKeys(errors, template.repeatUseIntent, "sessionTemplate.repeatUseIntent", [
    "wouldRunAnotherCycle",
    "reason",
  ]);
  requireExactKeys(
    errors,
    template.experimentFollowup,
    "sessionTemplate.experimentFollowup",
    ["experimentDefined", "recommendationSurvived", "wasteAvoidedEvidence"]
  );
  requireExactKeys(
    errors,
    template.redactionReview,
    "sessionTemplate.redactionReview",
    [
      "directIdentifiersRemoved",
      "repositoryIdentityRemoved",
      "sensitiveContentRemoved",
      "reviewedAt",
    ]
  );
}

export function validatePilotArtifacts({ protocol, state, sessionTemplate }) {
  const errors = [];

  requireExactKeys(errors, protocol, "protocol", [
    "schemaVersion",
    "protocolVersion",
    "issueUrl",
    "decision",
    "sample",
    "eligibility",
    "exclusions",
    "consentItems",
    "preAuditRequired",
    "primaryOutcomes",
    "decisionValueOutcomes",
    "secondaryMetrics",
    "decisionRule",
    "dataBoundary",
    "stopConditions",
  ]);
  if (protocol.schemaVersion !== 1) errors.push("protocol.schemaVersion must equal 1");
  if (protocol.protocolVersion !== "2026-07-24-v1") {
    errors.push("protocol.protocolVersion must remain 2026-07-24-v1");
  }
  if (protocol.issueUrl !== "https://github.com/Thunderkill016/cyclewarden/issues/14") {
    errors.push("protocol.issueUrl must reference issue #14");
  }
  if (
    protocol.decision !==
    "Determine whether one CycleWarden A2 Research Audit creates inspectable decision value for solo developers and open-source maintainers already using coding agents."
  ) {
    errors.push("protocol.decision changed from the precommitted decision");
  }

  const sample = protocol.sample ?? {};
  const fixedSample = {
    participants: 6,
    repositories: 6,
    primaryAuditsPerRepository: 1,
    maxDurationDays: 14,
    maxSessionMinutes: 90,
    retryMaximum: 1,
  };
  requireExactKeys(errors, sample, "protocol.sample", Object.keys(fixedSample));
  for (const [key, expected] of Object.entries(fixedSample)) {
    if (sample[key] !== expected) {
      errors.push(`protocol.sample.${key} must equal ${expected}`);
    }
  }

  if (!sameArray(protocol.primaryOutcomes, expectedPrimaryOutcomes)) {
    errors.push("protocol.primaryOutcomes changed from the precommitted set");
  }
  if (!sameArray(protocol.decisionValueOutcomes, expectedDecisionValueOutcomes)) {
    errors.push("protocol.decisionValueOutcomes changed from the precommitted set");
  }
  if (!sameArray(protocol.consentItems, expectedConsentItems)) {
    errors.push("protocol.consentItems changed from the fixed consent boundary");
  }
  if (!sameArray(protocol.preAuditRequired, expectedPreAudit)) {
    errors.push("protocol.preAuditRequired changed from the fixed baseline");
  }
  if (!sameArray(protocol.eligibility, expectedEligibility)) {
    errors.push("protocol.eligibility changed from the fixed participant criteria");
  }
  if (!sameArray(protocol.exclusions, expectedExclusions)) {
    errors.push("protocol.exclusions changed from the fixed participant criteria");
  }
  if (!sameArray(protocol.secondaryMetrics, expectedSecondaryMetrics)) {
    errors.push("protocol.secondaryMetrics changed from the fixed outcome form");
  }
  if (!sameArray(protocol.stopConditions, expectedStopConditions)) {
    errors.push("protocol.stopConditions changed from the fixed safety boundary");
  }
  requireExactKeys(errors, protocol.dataBoundary, "protocol.dataBoundary", [
    "committedRecords",
    "participantIdPattern",
    "repositoryIdPattern",
    "prohibitedCommittedKeys",
  ]);
  if (
    protocol.dataBoundary?.committedRecords !== "redacted-only" ||
    protocol.dataBoundary?.participantIdPattern !== "^P0[1-6]$" ||
    protocol.dataBoundary?.repositoryIdPattern !== "^R0[1-6]$" ||
    !sameArray(
      protocol.dataBoundary?.prohibitedCommittedKeys,
      expectedProhibitedKeys
    )
  ) {
    errors.push("protocol.dataBoundary changed from the redacted-only boundary");
  }

  const rule = protocol.decisionRule ?? {};
  requireExactKeys(errors, rule, "protocol.decisionRule", [
    "success",
    "inconclusive",
    "failure",
    "unclassified",
  ]);
  requireExactKeys(errors, rule.success, "protocol.decisionRule.success", [
    "decisionValueMinimum",
    "explainableAndChallengeableMinimum",
    "repeatedSeriousFailureAllowed",
  ]);
  requireExactKeys(
    errors,
    rule.inconclusive,
    "protocol.decisionRule.inconclusive",
    ["decisionValueExact", "repeatedSeriousFailureAllowed", "retryAllowed"]
  );
  requireExactKeys(errors, rule.failure, "protocol.decisionRule.failure", [
    "decisionValueMaximum",
    "repeatedSeriousFailureTriggersFailure",
  ]);
  requireExactKeys(
    errors,
    rule.unclassified,
    "protocol.decisionRule.unclassified",
    ["condition", "action"]
  );
  if (rule.success?.decisionValueMinimum !== 3) {
    errors.push("success decisionValueMinimum must equal 3");
  }
  if (rule.success?.explainableAndChallengeableMinimum !== 4) {
    errors.push("success explainableAndChallengeableMinimum must equal 4");
  }
  if (rule.inconclusive?.decisionValueExact !== 2) {
    errors.push("inconclusive decisionValueExact must equal 2");
  }
  if (rule.inconclusive?.retryAllowed !== 1) {
    errors.push("inconclusive retryAllowed must equal 1");
  }
  if (rule.failure?.decisionValueMaximum !== 1) {
    errors.push("failure decisionValueMaximum must equal 1");
  }
  if (
    rule.success?.repeatedSeriousFailureAllowed !== false ||
    rule.inconclusive?.repeatedSeriousFailureAllowed !== false ||
    rule.failure?.repeatedSeriousFailureTriggersFailure !== true
  ) {
    errors.push("repeated serious failure rules must remain fail-closed");
  }
  if (
    rule.unclassified?.condition !==
      "decision-value is at least 3, explainable-and-challengeable is below 4, and no repeated serious failure occurred" ||
    rule.unclassified?.action !==
      "stop-and-report-protocol-gap-without-changing-thresholds"
  ) {
    errors.push("unclassified decision-rule gap must remain explicit and fail-closed");
  }

  if (state.schemaVersion !== 1) errors.push("state.schemaVersion must equal 1");
  requireExactKeys(errors, state, "state", [
    "schemaVersion",
    "protocolVersion",
    "issueUrl",
    "status",
    "technicalGate",
    "clockStartedAt",
    "externalCompletedAudits",
    "finalDecision",
    "excludedAttempts",
    "sessions",
  ]);
  if (state.protocolVersion !== protocol.protocolVersion) {
    errors.push("state.protocolVersion must match protocol.protocolVersion");
  }
  if (state.issueUrl !== protocol.issueUrl) {
    errors.push("state.issueUrl must match protocol.issueUrl");
  }
  if (!pilotStatuses.has(state.status)) errors.push("state.status is not allowed");
  requireExactKeys(errors, state.technicalGate, "state.technicalGate", [
    "pullRequest",
    "status",
  ]);
  if (state.technicalGate?.pullRequest !== 31) {
    errors.push("state.technicalGate.pullRequest must equal 31");
  }
  if (!technicalGateStatuses.has(state.technicalGate?.status)) {
    errors.push("state.technicalGate.status is not allowed");
  }
  if (!Array.isArray(state.sessions) || state.sessions.length !== 6) {
    errors.push("state.sessions must contain exactly 6 slots");
  }

  const participantIds = new Set();
  const repositoryIds = new Set();
  const startedAtValues = [];
  let completed = 0;

  for (const [index, session] of (state.sessions ?? []).entries()) {
    requireExactKeys(errors, session, `state.sessions[${index}]`, [
      "participantId",
      "repositoryId",
      "status",
      "startedAt",
      "redactedRecord",
    ]);
    const expectedParticipant = `P0${index + 1}`;
    const expectedRepository = `R0${index + 1}`;
    if (session.participantId !== expectedParticipant) {
      errors.push(`state.sessions[${index}].participantId must equal ${expectedParticipant}`);
    }
    if (session.repositoryId !== expectedRepository) {
      errors.push(`state.sessions[${index}].repositoryId must equal ${expectedRepository}`);
    }
    if (participantIds.has(session.participantId)) {
      errors.push(`duplicate participantId ${session.participantId}`);
    }
    if (repositoryIds.has(session.repositoryId)) {
      errors.push(`duplicate repositoryId ${session.repositoryId}`);
    }
    participantIds.add(session.participantId);
    repositoryIds.add(session.repositoryId);

    if (!sessionStatuses.has(session.status)) {
      errors.push(`state.sessions[${index}].status is not allowed`);
    }
    if (session.status === "completed") completed += 1;
    if (["in-progress", "completed"].includes(session.status)) {
      if (!validIsoTimestamp(session.startedAt)) {
        errors.push(`state.sessions[${index}].startedAt must record the session start`);
      } else {
        startedAtValues.push(session.startedAt);
      }
    } else if (session.startedAt !== null) {
      errors.push(`state.sessions[${index}].startedAt must be null before session start`);
    }
    if (session.status === "completed") {
      const expectedRecord =
        `docs/evolution/pilot/sessions/${session.participantId}-${session.repositoryId}.json`;
      if (
        typeof session.redactedRecord !== "string" ||
        session.redactedRecord !== expectedRecord
      ) {
        errors.push(
          `state.sessions[${index}].redactedRecord must equal ${expectedRecord}`
        );
      }
    } else if (session.redactedRecord !== null) {
      errors.push(`state.sessions[${index}].redactedRecord must be null until completed`);
    }
  }

  if (!Array.isArray(state.excludedAttempts)) {
    errors.push("state.excludedAttempts must be an array");
  }
  const excludedIds = new Set();
  for (const [index, attempt] of (state.excludedAttempts ?? []).entries()) {
    requireExactKeys(errors, attempt, `state.excludedAttempts[${index}]`, [
      "attemptId",
      "status",
      "reason",
      "startedAt",
    ]);
    if (
      typeof attempt.attemptId !== "string" ||
      !/^X\d{2}$/.test(attempt.attemptId)
    ) {
      errors.push(`state.excludedAttempts[${index}].attemptId must match XNN`);
    } else if (excludedIds.has(attempt.attemptId)) {
      errors.push(`duplicate excluded attempt ${attempt.attemptId}`);
    } else {
      excludedIds.add(attempt.attemptId);
    }
    if (!["withdrawn", "ineligible"].includes(attempt.status)) {
      errors.push(`state.excludedAttempts[${index}].status is not allowed`);
    }
    requireText(
      errors,
      attempt.reason,
      `state.excludedAttempts[${index}].reason`,
      10
    );
    if (attempt.startedAt !== null) {
      if (!validIsoTimestamp(attempt.startedAt)) {
        errors.push(`state.excludedAttempts[${index}].startedAt must be null or ISO`);
      } else {
        startedAtValues.push(attempt.startedAt);
      }
    }
  }

  if (state.externalCompletedAudits !== completed) {
    errors.push("state.externalCompletedAudits must equal completed session count");
  }
  if (completed < 6 && state.finalDecision !== null) {
    errors.push("state.finalDecision must remain null before six completed audits");
  }
  if (
    completed === 6 &&
    !["success", "inconclusive", "failure", "protocol-gap"].includes(
      state.finalDecision
    )
  ) {
    errors.push("state.finalDecision is required after six completed audits");
  }
  const started = startedAtValues.length;
  if (state.technicalGate?.status !== "ready" && started > 0) {
    errors.push("sessions cannot start while PR #31 technical gate is pending");
  }
  if (started === 0) {
    if (state.clockStartedAt !== null) {
      errors.push("state.clockStartedAt must remain null before the first session");
    }
    if (state.status !== "not-started") {
      errors.push("state.status must be not-started before the first session");
    }
  } else {
    if (!validIsoTimestamp(state.clockStartedAt)) {
      errors.push("state.clockStartedAt must be an ISO timestamp after pilot start");
    } else {
      const earliestStart = [...startedAtValues].sort()[0];
      if (state.clockStartedAt !== earliestStart) {
        errors.push("state.clockStartedAt must equal the earliest started attempt");
      }
    }
    if (completed === 6 && state.status !== "complete") {
      errors.push("state.status must be complete after six completed audits");
    }
    if (completed < 6 && state.status !== "in-progress") {
      errors.push("state.status must be in-progress while fewer than six audits are complete");
    }
  }

  validateTemplateShape(sessionTemplate, errors);
  if (sessionTemplate.protocolVersion !== protocol.protocolVersion) {
    errors.push("sessionTemplate.protocolVersion must match protocol.protocolVersion");
  }

  const prohibited = new Set(protocol.dataBoundary?.prohibitedCommittedKeys ?? []);
  for (const match of findProhibitedKeys(state, prohibited, "state")) {
    errors.push(`prohibited committed key: ${match}`);
  }
  for (const match of findProhibitedKeys(
    sessionTemplate,
    prohibited,
    "sessionTemplate"
  )) {
    errors.push(`prohibited committed key: ${match}`);
  }
  for (const match of findSensitiveStringContent(state, "state")) {
    errors.push(`prohibited committed content: ${match}`);
  }
  for (const match of findSensitiveStringContent(
    sessionTemplate,
    "sessionTemplate"
  )) {
    errors.push(`prohibited committed content: ${match}`);
  }

  return { errors, completed, started };
}

export function validateSessionRecord(record, protocol) {
  const errors = [];
  const participantPattern = new RegExp(
    protocol.dataBoundary?.participantIdPattern ?? "^$"
  );
  const repositoryPattern = new RegExp(
    protocol.dataBoundary?.repositoryIdPattern ?? "^$"
  );
  requireExactKeys(errors, record, "session", [
    "schemaVersion",
    "protocolVersion",
    "participantId",
    "repositoryId",
    "eligibility",
    "consent",
    "recentBehavior",
    "preAuditDecision",
    "audit",
    "productOutcome",
    "experimentFollowup",
    "repeatUseIntent",
    "redactionReview",
  ]);

  if (record.schemaVersion !== 1) {
    errors.push("session.schemaVersion must equal 1");
  }
  if (!participantPattern.test(record.participantId ?? "")) {
    errors.push("session.participantId must be P01-P06");
  }
  if (!repositoryPattern.test(record.repositoryId ?? "")) {
    errors.push("session.repositoryId must be R01-R06");
  }
  if (record.protocolVersion !== protocol.protocolVersion) {
    errors.push("session.protocolVersion must match protocol");
  }

  for (const [key, value] of Object.entries(record.eligibility ?? {})) {
    if (value !== true) errors.push(`session.eligibility.${key} must be true`);
  }
  requireExactKeys(errors, record.eligibility, "session.eligibility", [
    "soloDeveloperOrMaintainer",
    "recentCodingAgentUse",
    "repositoryAuthorized",
    "realDecisionDue",
    "recentBehaviorInterviewAccepted",
  ]);
  for (const [key, value] of Object.entries(record.consent ?? {})) {
    if (value !== true) errors.push(`session.consent.${key} must be true`);
  }
  requireExactKeys(errors, record.consent, "session.consent", [
    "repositoryPermission",
    "accessMethodApproved",
    "sensitiveDataExcluded",
    "inspectionScopeApproved",
    "noMutationBoundaryAccepted",
    "withdrawalRightAccepted",
    "redactedRetentionAccepted",
  ]);

  requireText(errors, record.recentBehavior?.decisionContext, "session.recentBehavior.decisionContext");
  requireText(errors, record.recentBehavior?.decisionDeadline, "session.recentBehavior.decisionDeadline");
  requireText(errors, record.recentBehavior?.currentWorkflow, "session.recentBehavior.currentWorkflow");
  requireText(errors, record.recentBehavior?.currentWorkaround, "session.recentBehavior.currentWorkaround");
  requireExactKeys(errors, record.recentBehavior, "session.recentBehavior", [
    "decisionContext",
    "decisionDeadline",
    "currentWorkflow",
    "currentWorkaround",
  ]);

  const pre = record.preAuditDecision ?? {};
  requireExactKeys(errors, pre, "session.preAuditDecision", [
    "alternatives",
    "preferredAlternative",
    "confidence0To100",
    "evidenceAlreadyUsed",
    "likelyActionWithoutCycleWarden",
    "estimatedWrongDecisionCost",
    "decisionChangingEvidenceRequested",
    "capturedAt",
  ]);
  requireTextArray(errors, pre.alternatives, "session.preAuditDecision.alternatives", {
    minimumItems: 2,
  });
  requireText(errors, pre.preferredAlternative, "session.preAuditDecision.preferredAlternative", 2);
  if (
    Array.isArray(pre.alternatives) &&
    !pre.alternatives.includes(pre.preferredAlternative)
  ) {
    errors.push(
      "session.preAuditDecision.preferredAlternative must be one of alternatives"
    );
  }
  requireTextArray(
    errors,
    pre.evidenceAlreadyUsed,
    "session.preAuditDecision.evidenceAlreadyUsed"
  );
  if (
    typeof pre.confidence0To100 !== "number" ||
    pre.confidence0To100 < 0 ||
    pre.confidence0To100 > 100
  ) {
    errors.push("session.preAuditDecision.confidence0To100 must be 0-100");
  }
  requireText(errors, pre.likelyActionWithoutCycleWarden, "session.preAuditDecision.likelyActionWithoutCycleWarden");
  requireText(errors, pre.estimatedWrongDecisionCost, "session.preAuditDecision.estimatedWrongDecisionCost");
  requireText(errors, pre.decisionChangingEvidenceRequested, "session.preAuditDecision.decisionChangingEvidenceRequested");
  if (!validIsoTimestamp(pre.capturedAt)) {
    errors.push("session.preAuditDecision.capturedAt must be an ISO timestamp");
  }

  const audit = record.audit ?? {};
  requireExactKeys(errors, audit, "session.audit", [
    "startedAt",
    "completedAt",
    "approvedInspectionScope",
    "technicalOutcome",
    "technicalLimitations",
  ]);
  const auditTimesValid =
    validIsoTimestamp(audit.startedAt) && validIsoTimestamp(audit.completedAt);
  if (!auditTimesValid) {
    errors.push("session.audit start and completion must be ISO timestamps");
  } else {
    const durationMinutes =
      (new Date(audit.completedAt).valueOf() - new Date(audit.startedAt).valueOf()) /
      60_000;
    if (durationMinutes < 0 || durationMinutes > 90) {
      errors.push("session.audit duration must be between 0 and 90 minutes");
    }
    if (
      validIsoTimestamp(pre.capturedAt) &&
      new Date(pre.capturedAt).valueOf() > new Date(audit.startedAt).valueOf()
    ) {
      errors.push("session.preAuditDecision must be captured before audit start");
    }
  }
  requireTextArray(
    errors,
    audit.approvedInspectionScope,
    "session.audit.approvedInspectionScope",
    { minimumItems: 1 }
  );
  requireTextArray(
    errors,
    audit.technicalLimitations,
    "session.audit.technicalLimitations"
  );
  if (!technicalOutcomes.has(audit.technicalOutcome)) {
    errors.push("session.audit.technicalOutcome is not allowed");
  }

  const outcome = record.productOutcome ?? {};
  requireExactKeys(errors, outcome, "session.productOutcome", [
    "classification",
    "specificEvidenceIds",
    "causalExplanation",
    "rankingUnderstood",
    "rankingChallengeable",
    "recommendationDisposition",
    "rejectionReason",
    "minutesToFirstDecisionChangingEvidence",
    "contradictions",
    "falsePositives",
    "missingContext",
    "rejectedRecommendations",
    "seriousEvidenceFailure",
    "privacySafetyFailure",
    "seriousFailureCategories",
  ]);
  if (!protocol.primaryOutcomes.includes(outcome.classification)) {
    errors.push("session.productOutcome.classification is not allowed");
  }
  requireText(errors, outcome.causalExplanation, "session.productOutcome.causalExplanation", 20);
  requireTextArray(
    errors,
    outcome.specificEvidenceIds,
    "session.productOutcome.specificEvidenceIds"
  );
  const hasDecisionValue = protocol.decisionValueOutcomes.includes(
    outcome.classification
  );
  if (hasDecisionValue && outcome.specificEvidenceIds?.length === 0) {
    errors.push("decision value requires at least one specific evidence ID");
  }
  if (typeof outcome.rankingUnderstood !== "boolean") {
    errors.push("session.productOutcome.rankingUnderstood must be boolean");
  }
  if (typeof outcome.rankingChallengeable !== "boolean") {
    errors.push("session.productOutcome.rankingChallengeable must be boolean");
  }
  if (!recommendationDispositions.has(outcome.recommendationDisposition)) {
    errors.push("session.productOutcome.recommendationDisposition is not allowed");
  }
  if (
    outcome.minutesToFirstDecisionChangingEvidence !== null &&
    (typeof outcome.minutesToFirstDecisionChangingEvidence !== "number" ||
      outcome.minutesToFirstDecisionChangingEvidence < 0 ||
      outcome.minutesToFirstDecisionChangingEvidence > 90)
  ) {
    errors.push("minutesToFirstDecisionChangingEvidence must be null or 0-90");
  }
  if (
    hasDecisionValue &&
    typeof outcome.minutesToFirstDecisionChangingEvidence !== "number"
  ) {
    errors.push(
      "decision value requires minutesToFirstDecisionChangingEvidence"
    );
  }
  if (
    outcome.classification === "no-decision-value" &&
    outcome.minutesToFirstDecisionChangingEvidence !== null
  ) {
    errors.push(
      "no-decision-value requires minutesToFirstDecisionChangingEvidence to be null"
    );
  }
  if (
    auditTimesValid &&
    typeof outcome.minutesToFirstDecisionChangingEvidence === "number"
  ) {
    const durationMinutes =
      (new Date(audit.completedAt).valueOf() -
        new Date(audit.startedAt).valueOf()) /
      60_000;
    if (outcome.minutesToFirstDecisionChangingEvidence > durationMinutes) {
      errors.push(
        "minutesToFirstDecisionChangingEvidence cannot exceed audit duration"
      );
    }
  }
  for (const field of [
    "contradictions",
    "falsePositives",
    "missingContext",
    "rejectedRecommendations",
  ]) {
    requireTextArray(
      errors,
      outcome[field],
      `session.productOutcome.${field}`
    );
  }
  if (outcome.recommendationDisposition === "rejected") {
    requireText(
      errors,
      outcome.rejectionReason,
      "session.productOutcome.rejectionReason"
    );
  } else if (outcome.rejectionReason !== null) {
    errors.push(
      "session.productOutcome.rejectionReason must be null unless recommendation is rejected"
    );
  }
  if (
    typeof outcome.seriousEvidenceFailure !== "boolean" ||
    typeof outcome.privacySafetyFailure !== "boolean"
  ) {
    errors.push("session serious failure fields must be boolean");
  }
  if (!Array.isArray(outcome.seriousFailureCategories)) {
    errors.push("session.productOutcome.seriousFailureCategories must be an array");
  } else {
    for (const category of outcome.seriousFailureCategories) {
      if (
        typeof category !== "string" ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category)
      ) {
        errors.push("serious failure categories must be lowercase kebab-case");
      }
    }
    const hasSeriousFailure =
      outcome.seriousEvidenceFailure || outcome.privacySafetyFailure;
    if (hasSeriousFailure && outcome.seriousFailureCategories.length === 0) {
      errors.push("serious failures require at least one failure category");
    }
    if (!hasSeriousFailure && outcome.seriousFailureCategories.length > 0) {
      errors.push("failure categories require a serious failure flag");
    }
  }

  if (typeof record.repeatUseIntent?.wouldRunAnotherCycle !== "boolean") {
    errors.push("session.repeatUseIntent must remain a separate boolean signal");
  }
  requireExactKeys(errors, record.experimentFollowup, "session.experimentFollowup", [
    "experimentDefined",
    "recommendationSurvived",
    "wasteAvoidedEvidence",
  ]);
  requireExactKeys(errors, record.repeatUseIntent, "session.repeatUseIntent", [
    "wouldRunAnotherCycle",
    "reason",
  ]);
  if (typeof record.experimentFollowup?.experimentDefined !== "boolean") {
    errors.push("session.experimentFollowup.experimentDefined must be boolean");
  }
  if (
    record.experimentFollowup?.recommendationSurvived !== null &&
    typeof record.experimentFollowup?.recommendationSurvived !== "boolean"
  ) {
    errors.push(
      "session.experimentFollowup.recommendationSurvived must be null or boolean"
    );
  }
  if (
    record.experimentFollowup?.wasteAvoidedEvidence !== null &&
    (typeof record.experimentFollowup?.wasteAvoidedEvidence !== "string" ||
      record.experimentFollowup.wasteAvoidedEvidence.trim().length < 10)
  ) {
    errors.push(
      "session.experimentFollowup.wasteAvoidedEvidence must be null or descriptive text"
    );
  }
  requireText(
    errors,
    record.repeatUseIntent?.reason,
    "session.repeatUseIntent.reason"
  );
  requireExactKeys(errors, record.redactionReview, "session.redactionReview", [
    "directIdentifiersRemoved",
    "repositoryIdentityRemoved",
    "sensitiveContentRemoved",
    "reviewedAt",
  ]);
  for (const [key, value] of Object.entries(record.redactionReview ?? {})) {
    if (key === "reviewedAt") {
      if (!validIsoTimestamp(value)) {
        errors.push("session.redactionReview.reviewedAt must be an ISO timestamp");
      } else if (
        auditTimesValid &&
        new Date(value).valueOf() < new Date(audit.completedAt).valueOf()
      ) {
        errors.push(
          "session.redactionReview.reviewedAt cannot precede audit completion"
        );
      }
    } else if (value !== true) {
      errors.push(`session.redactionReview.${key} must be true`);
    }
  }

  const prohibited = new Set(protocol.dataBoundary?.prohibitedCommittedKeys ?? []);
  for (const match of findProhibitedKeys(record, prohibited, "session")) {
    errors.push(`prohibited committed key: ${match}`);
  }
  for (const match of findSensitiveStringContent(record, "session")) {
    errors.push(`prohibited committed content: ${match}`);
  }

  return { errors };
}

export function validatePilotRecordsAgainstState({ state, records, protocol }) {
  const errors = [];
  const recordsByParticipant = new Map(
    records.map((record) => [record.participantId, record])
  );
  const clockStartedAt = validIsoTimestamp(state.clockStartedAt)
    ? new Date(state.clockStartedAt).valueOf()
    : null;
  const deadline =
    clockStartedAt === null
      ? null
      : clockStartedAt + protocol.sample.maxDurationDays * 24 * 60 * 60 * 1000;

  for (const session of state.sessions ?? []) {
    if (session.status !== "completed") continue;
    const record = recordsByParticipant.get(session.participantId);
    if (!record) {
      errors.push(`${session.participantId} completed session record is missing`);
      continue;
    }
    if (record.repositoryId !== session.repositoryId) {
      errors.push(`${session.participantId} record repository ID does not match state`);
    }
    if (record.audit?.startedAt !== session.startedAt) {
      errors.push(`${session.participantId} audit start must match state.startedAt`);
    }
    if (
      deadline !== null &&
      validIsoTimestamp(record.audit?.completedAt) &&
      new Date(record.audit.completedAt).valueOf() > deadline
    ) {
      errors.push(
        `${session.participantId} audit completed after the ${protocol.sample.maxDurationDays}-day pilot deadline`
      );
    }
  }

  return { errors };
}

export function classifyPilot(records, protocol) {
  if (!Array.isArray(records) || records.length !== 6) {
    throw new Error("Pilot classification requires exactly 6 completed records");
  }

  const decisionValue = records.filter((record) =>
    protocol.decisionValueOutcomes.includes(
      record.productOutcome?.classification
    )
  ).length;
  const explainableAndChallengeable = records.filter(
    (record) =>
      record.productOutcome?.rankingUnderstood === true &&
      record.productOutcome?.rankingChallengeable === true
  ).length;
  const categoryCounts = new Map();
  for (const record of records) {
    for (const category of record.productOutcome?.seriousFailureCategories ?? []) {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
  }
  const repeatedSeriousFailure = [...categoryCounts.values()].some(
    (count) => count >= 2
  );

  let decision;
  if (
    decisionValue <= protocol.decisionRule.failure.decisionValueMaximum ||
    repeatedSeriousFailure
  ) {
    decision = "failure";
  } else if (
    decisionValue === protocol.decisionRule.inconclusive.decisionValueExact
  ) {
    decision = "inconclusive";
  } else if (
    decisionValue >= protocol.decisionRule.success.decisionValueMinimum &&
    explainableAndChallengeable >=
      protocol.decisionRule.success.explainableAndChallengeableMinimum
  ) {
    decision = "success";
  } else {
    decision = "protocol-gap";
  }

  return {
    decision,
    decisionValue,
    explainableAndChallengeable,
    repeatedSeriousFailure,
  };
}

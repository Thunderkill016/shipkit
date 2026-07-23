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
  "likely-action-without-shipkit",
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
  "shipkit-audit-designer",
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
}

export function validatePilotArtifacts({ protocol, state, sessionTemplate }) {
  const errors = [];

  if (protocol.schemaVersion !== 1) errors.push("protocol.schemaVersion must equal 1");
  if (protocol.protocolVersion !== "2026-07-24-v1") {
    errors.push("protocol.protocolVersion must remain 2026-07-24-v1");
  }
  if (protocol.issueUrl !== "https://github.com/Thunderkill016/shipkit/issues/14") {
    errors.push("protocol.issueUrl must reference issue #14");
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
  if (!pilotStatuses.has(state.status)) errors.push("state.status is not allowed");
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
      if (
        typeof session.redactedRecord !== "string" ||
        !/^docs\/evolution\/pilot\/sessions\/P0[1-6]-R0[1-6]\.json$/.test(
          session.redactedRecord
        )
      ) {
        errors.push(`state.sessions[${index}].redactedRecord must link a redacted session`);
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
    "likelyActionWithoutShipkit",
    "estimatedWrongDecisionCost",
    "decisionChangingEvidenceRequested",
    "capturedAt",
  ]);
  if (!Array.isArray(pre.alternatives) || pre.alternatives.length < 2) {
    errors.push("session.preAuditDecision.alternatives must contain at least 2 alternatives");
  }
  requireText(errors, pre.preferredAlternative, "session.preAuditDecision.preferredAlternative", 2);
  if (
    typeof pre.confidence0To100 !== "number" ||
    pre.confidence0To100 < 0 ||
    pre.confidence0To100 > 100
  ) {
    errors.push("session.preAuditDecision.confidence0To100 must be 0-100");
  }
  requireText(errors, pre.likelyActionWithoutShipkit, "session.preAuditDecision.likelyActionWithoutShipkit");
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
  if (!validIsoTimestamp(audit.startedAt) || !validIsoTimestamp(audit.completedAt)) {
    errors.push("session.audit start and completion must be ISO timestamps");
  } else {
    const durationMinutes =
      (new Date(audit.completedAt).valueOf() - new Date(audit.startedAt).valueOf()) /
      60_000;
    if (durationMinutes < 0 || durationMinutes > 90) {
      errors.push("session.audit duration must be between 0 and 90 minutes");
    }
  }
  if (!Array.isArray(audit.approvedInspectionScope) || audit.approvedInspectionScope.length === 0) {
    errors.push("session.audit.approvedInspectionScope must not be empty");
  }
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
  if (
    protocol.decisionValueOutcomes.includes(outcome.classification) &&
    (!Array.isArray(outcome.specificEvidenceIds) ||
      outcome.specificEvidenceIds.length === 0)
  ) {
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
  for (const field of [
    "contradictions",
    "falsePositives",
    "missingContext",
    "rejectedRecommendations",
  ]) {
    if (!Array.isArray(outcome[field])) {
      errors.push(`session.productOutcome.${field} must be an array`);
    }
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
      }
    } else if (value !== true) {
      errors.push(`session.redactionReview.${key} must be true`);
    }
  }

  const prohibited = new Set(protocol.dataBoundary?.prohibitedCommittedKeys ?? []);
  for (const match of findProhibitedKeys(record, prohibited, "session")) {
    errors.push(`prohibited committed key: ${match}`);
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

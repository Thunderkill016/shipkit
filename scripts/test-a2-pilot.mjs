import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyPilot,
  validatePilotArtifacts,
  validatePilotRecordsAgainstState,
  validateSessionRecord,
} from "./a2-pilot-validation.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}

const protocol = await readJson(
  "docs/evolution/pilot/A2_RESEARCH_AUDIT_PROTOCOL.json"
);
const state = await readJson("docs/evolution/pilot/PILOT_STATE.json");
const sessionTemplate = await readJson(
  "docs/evolution/pilot/SESSION_TEMPLATE.json"
);

function expectArtifactsValid(candidate = {}) {
  const result = validatePilotArtifacts({
    protocol: candidate.protocol ?? protocol,
    state: candidate.state ?? state,
    sessionTemplate: candidate.sessionTemplate ?? sessionTemplate,
  });
  if (result.errors.length) {
    throw new Error(`Expected pilot artifacts to pass:\n${result.errors.join("\n")}`);
  }
}

function expectArtifactsInvalid(candidate, expectedText) {
  const result = validatePilotArtifacts({
    protocol: candidate.protocol ?? protocol,
    state: candidate.state ?? state,
    sessionTemplate: candidate.sessionTemplate ?? sessionTemplate,
  });
  if (!result.errors.some((error) => error.includes(expectedText))) {
    throw new Error(
      `Expected artifact error containing "${expectedText}":\n${result.errors.join("\n")}`
    );
  }
}

function expectSessionInvalid(record, expectedText) {
  const result = validateSessionRecord(record, protocol);
  if (!result.errors.some((error) => error.includes(expectedText))) {
    throw new Error(
      `Expected session error containing "${expectedText}":\n${result.errors.join("\n")}`
    );
  }
}

function expectRecordsInvalid(candidateState, records, expectedText) {
  const result = validatePilotRecordsAgainstState({
    state: candidateState,
    records,
    protocol,
  });
  if (!result.errors.some((error) => error.includes(expectedText))) {
    throw new Error(
      `Expected record/state error containing "${expectedText}":\n${result.errors.join("\n")}`
    );
  }
}

function validSession() {
  const record = structuredClone(sessionTemplate);
  record.participantId = "P01";
  record.repositoryId = "R01";
  for (const key of Object.keys(record.eligibility)) record.eligibility[key] = true;
  for (const key of Object.keys(record.consent)) record.consent[key] = true;
  record.recentBehavior = {
    decisionContext: "Choose the next repository workstream before the next release.",
    decisionDeadline: "Within the current two-week planning cycle.",
    currentWorkflow: "Review issues, recent failures and implementation constraints manually.",
    currentWorkaround: "Maintain a handwritten shortlist and compare evidence in separate tabs.",
  };
  record.preAuditDecision = {
    alternatives: ["Improve reliability", "Add public discovery"],
    preferredAlternative: "Improve reliability",
    confidence0To100: 60,
    evidenceAlreadyUsed: ["issue:example-1"],
    likelyActionWithoutShipkit: "Implement the reliability change first.",
    estimatedWrongDecisionCost: "One week of implementation that may not affect the target decision.",
    decisionChangingEvidenceRequested: "A source-backed reason that discovery is the actual blocker.",
    capturedAt: "2026-07-24T01:00:00.000Z",
  };
  record.audit = {
    startedAt: "2026-07-24T01:05:00.000Z",
    completedAt: "2026-07-24T02:00:00.000Z",
    approvedInspectionScope: ["README.md", "docs/**", "package.json"],
    technicalOutcome: "passed",
    technicalLimitations: ["No private analytics or support data was available."],
  };
  record.productOutcome = {
    classification: "materially-confirmed",
    specificEvidenceIds: ["claim:example-1"],
    causalExplanation:
      "The cited failure evidence materially confirmed that reliability blocks the planned release.",
    rankingUnderstood: true,
    rankingChallengeable: true,
    recommendationDisposition: "accepted",
    rejectionReason: null,
    minutesToFirstDecisionChangingEvidence: 24,
    contradictions: [],
    falsePositives: [],
    missingContext: ["No direct user-support evidence was available."],
    rejectedRecommendations: ["Add public discovery before fixing release reliability."],
    seriousEvidenceFailure: false,
    privacySafetyFailure: false,
    seriousFailureCategories: [],
  };
  record.experimentFollowup = {
    experimentDefined: true,
    recommendationSurvived: null,
    wasteAvoidedEvidence: null,
  };
  record.repeatUseIntent = {
    wouldRunAnotherCycle: true,
    reason: "The participant wants to compare the next real decision separately.",
  };
  record.redactionReview = {
    directIdentifiersRemoved: true,
    repositoryIdentityRemoved: true,
    sensitiveContentRemoved: true,
    reviewedAt: "2026-07-24T02:10:00.000Z",
  };
  return record;
}

expectArtifactsValid();

const sampleDrift = structuredClone(protocol);
sampleDrift.sample.participants = 5;
expectArtifactsInvalid({ protocol: sampleDrift }, "participants must equal 6");

const thresholdDrift = structuredClone(protocol);
thresholdDrift.decisionRule.success.decisionValueMinimum = 2;
expectArtifactsInvalid(
  { protocol: thresholdDrift },
  "success decisionValueMinimum must equal 3"
);

const privacyDrift = structuredClone(protocol);
privacyDrift.dataBoundary.prohibitedCommittedKeys =
  privacyDrift.dataBoundary.prohibitedCommittedKeys.filter(
    (key) => key !== "email"
  );
expectArtifactsInvalid(
  { protocol: privacyDrift },
  "dataBoundary changed from the redacted-only boundary"
);

const stopConditionDrift = structuredClone(protocol);
stopConditionDrift.stopConditions.pop();
expectArtifactsInvalid(
  { protocol: stopConditionDrift },
  "stopConditions changed from the fixed safety boundary"
);

const templateDrift = structuredClone(sessionTemplate);
delete templateDrift.recentBehavior.decisionDeadline;
expectArtifactsInvalid(
  { sessionTemplate: templateDrift },
  "sessionTemplate.recentBehavior keys must remain separate"
);

const duplicateSlots = structuredClone(state);
duplicateSlots.sessions[1].participantId = "P01";
expectArtifactsInvalid({ state: duplicateSlots }, "participantId must equal P02");

const prematureStart = structuredClone(state);
prematureStart.technicalGate.status = "pending-merge";
prematureStart.sessions[0].status = "in-progress";
prematureStart.sessions[0].startedAt = "2026-07-24T01:00:00.000Z";
prematureStart.status = "in-progress";
prematureStart.clockStartedAt = "2026-07-24T01:00:00.000Z";
expectArtifactsInvalid(
  { state: prematureStart },
  "sessions cannot start while PR #31 technical gate is pending"
);

const lostWithdrawalClock = structuredClone(state);
lostWithdrawalClock.technicalGate.status = "ready";
lostWithdrawalClock.status = "in-progress";
lostWithdrawalClock.excludedAttempts = [
  {
    attemptId: "X01",
    status: "withdrawn",
    reason: "Participant withdrew after the audit session started.",
    startedAt: "2026-07-24T01:00:00.000Z",
  },
];
expectArtifactsInvalid(
  { state: lostWithdrawalClock },
  "clockStartedAt must be an ISO timestamp after pilot start"
);

const shiftedClock = structuredClone(lostWithdrawalClock);
shiftedClock.clockStartedAt = "2026-07-24T01:05:00.000Z";
expectArtifactsInvalid(
  { state: shiftedClock },
  "clockStartedAt must equal the earliest started attempt"
);

const directIdentity = structuredClone(sessionTemplate);
directIdentity.participantName = "Do not commit";
expectArtifactsInvalid(
  { sessionTemplate: directIdentity },
  "sessionTemplate keys must remain separate"
);

const completeRecord = validSession();
const validResult = validateSessionRecord(completeRecord, protocol);
if (validResult.errors.length) {
  throw new Error(`Expected session to pass:\n${validResult.errors.join("\n")}`);
}

const missingConsent = validSession();
missingConsent.consent.repositoryPermission = false;
expectSessionInvalid(missingConsent, "consent.repositoryPermission must be true");

const unexpectedIdentity = validSession();
unexpectedIdentity.realName = "Do not commit";
expectSessionInvalid(unexpectedIdentity, "session keys must remain separate");

const embeddedIdentity = validSession();
embeddedIdentity.repeatUseIntent.reason =
  "Contact participant@example.com to arrange another research cycle.";
expectSessionInvalid(embeddedIdentity, "contains email address");

const embeddedRepositoryUrl = validSession();
embeddedRepositoryUrl.recentBehavior.currentWorkaround =
  "Review https://github.com/example/private-repository manually before planning.";
expectSessionInvalid(embeddedRepositoryUrl, "contains repository URL");

const unsupportedDecisionValue = validSession();
unsupportedDecisionValue.productOutcome.specificEvidenceIds = [];
expectSessionInvalid(
  unsupportedDecisionValue,
  "decision value requires at least one specific evidence ID"
);

const metricConflation = validSession();
metricConflation.productOutcome.technicalOutcome = "passed";
expectSessionInvalid(metricConflation, "productOutcome keys must remain separate");

const overlongSession = validSession();
overlongSession.audit.completedAt = "2026-07-24T03:00:00.000Z";
expectSessionInvalid(overlongSession, "duration must be between 0 and 90 minutes");

const latePreAuditCapture = validSession();
latePreAuditCapture.preAuditDecision.capturedAt = "2026-07-24T01:06:00.000Z";
expectSessionInvalid(
  latePreAuditCapture,
  "preAuditDecision must be captured before audit start"
);

const missingDecisionEvidenceTime = validSession();
missingDecisionEvidenceTime.productOutcome.minutesToFirstDecisionChangingEvidence =
  null;
expectSessionInvalid(
  missingDecisionEvidenceTime,
  "decision value requires minutesToFirstDecisionChangingEvidence"
);

const contradictoryNoDecisionTime = validSession();
contradictoryNoDecisionTime.productOutcome.classification = "no-decision-value";
contradictoryNoDecisionTime.productOutcome.specificEvidenceIds = [];
expectSessionInvalid(
  contradictoryNoDecisionTime,
  "no-decision-value requires minutesToFirstDecisionChangingEvidence to be null"
);

const mismatchedRecordPath = structuredClone(state);
mismatchedRecordPath.technicalGate.status = "ready";
mismatchedRecordPath.status = "in-progress";
mismatchedRecordPath.clockStartedAt = "2026-07-24T01:05:00.000Z";
mismatchedRecordPath.externalCompletedAudits = 1;
mismatchedRecordPath.sessions[0] = {
  participantId: "P01",
  repositoryId: "R01",
  status: "completed",
  startedAt: "2026-07-24T01:05:00.000Z",
  redactedRecord: "docs/evolution/pilot/sessions/P01-R02.json",
};
expectArtifactsInvalid(
  { state: mismatchedRecordPath },
  "redactedRecord must equal docs/evolution/pilot/sessions/P01-R01.json"
);

function pilotRecords(decisionValueCount, explainableCount) {
  return Array.from({ length: 6 }, (_, index) => {
    const record = validSession();
    record.participantId = `P0${index + 1}`;
    record.repositoryId = `R0${index + 1}`;
    record.productOutcome.classification =
      index < decisionValueCount ? "materially-confirmed" : "no-decision-value";
    record.productOutcome.specificEvidenceIds =
      index < decisionValueCount ? [`claim:${index + 1}`] : [];
    record.productOutcome.rankingUnderstood = index < explainableCount;
    record.productOutcome.rankingChallengeable = index < explainableCount;
    return record;
  });
}

const completedState = structuredClone(state);
completedState.technicalGate.status = "ready";
completedState.status = "complete";
completedState.clockStartedAt = "2026-07-24T01:05:00.000Z";
completedState.externalCompletedAudits = 6;
completedState.finalDecision = "success";
completedState.sessions = completedState.sessions.map((session, index) => ({
  ...session,
  status: "completed",
  startedAt: "2026-07-24T01:05:00.000Z",
  redactedRecord:
    `docs/evolution/pilot/sessions/P0${index + 1}-R0${index + 1}.json`,
}));
const completedRecords = pilotRecords(3, 4);

const mismatchedStartRecords = structuredClone(completedRecords);
mismatchedStartRecords[0].audit.startedAt = "2026-07-24T01:06:00.000Z";
expectRecordsInvalid(
  completedState,
  mismatchedStartRecords,
  "audit start must match state.startedAt"
);

const lateRecords = structuredClone(completedRecords);
lateRecords[5].audit.startedAt = "2026-08-07T23:30:00.000Z";
lateRecords[5].audit.completedAt = "2026-08-08T01:06:00.000Z";
expectRecordsInvalid(
  completedState,
  lateRecords,
  "completed after the 14-day pilot deadline"
);

if (classifyPilot(pilotRecords(3, 4), protocol).decision !== "success") {
  throw new Error("Expected 3 decision-value and 4 explainable records to succeed");
}
if (classifyPilot(pilotRecords(2, 4), protocol).decision !== "inconclusive") {
  throw new Error("Expected exactly 2 decision-value records to be inconclusive");
}
if (classifyPilot(pilotRecords(1, 4), protocol).decision !== "failure") {
  throw new Error("Expected at most 1 decision-value record to fail");
}
if (classifyPilot(pilotRecords(3, 3), protocol).decision !== "protocol-gap") {
  throw new Error("Expected the uncovered 3/6 and 3/6 case to report protocol-gap");
}
const repeatedFailure = pilotRecords(4, 4);
for (const index of [0, 1]) {
  repeatedFailure[index].productOutcome.seriousEvidenceFailure = true;
  repeatedFailure[index].productOutcome.seriousFailureCategories = [
    "unsupported-primary-claim",
  ];
}
if (classifyPilot(repeatedFailure, protocol).decision !== "failure") {
  throw new Error("Expected a repeated serious failure category to fail");
}

console.log(
  "A2 pilot tests OK: protocol drift, privacy, consent, causality, separation and timebox gates behaved correctly."
);

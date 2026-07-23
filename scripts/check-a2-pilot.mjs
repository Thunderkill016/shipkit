import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyPilot,
  validatePilotArtifacts,
  validateSessionRecord,
} from "./a2-pilot-validation.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pilotRoot = resolve(root, "docs/evolution/pilot");

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolve(pilotRoot, relativePath), "utf8"));
}

const protocol = await readJson("A2_RESEARCH_AUDIT_PROTOCOL.json");
const state = await readJson("PILOT_STATE.json");
const sessionTemplate = await readJson("SESSION_TEMPLATE.json");
const result = validatePilotArtifacts({ protocol, state, sessionTemplate });
const errors = [...result.errors];
const completedRecords = [];

for (const session of state.sessions ?? []) {
  if (!session.redactedRecord) continue;
  const absolutePath = resolve(root, session.redactedRecord);
  if (!absolutePath.startsWith(`${pilotRoot}/`)) {
    errors.push(`${session.participantId} redacted record escapes pilot folder`);
    continue;
  }
  try {
    await access(absolutePath);
    const record = JSON.parse(await readFile(absolutePath, "utf8"));
    if (
      record.participantId !== session.participantId ||
      record.repositoryId !== session.repositoryId
    ) {
      errors.push(`${session.participantId} redacted record ID does not match state`);
    }
    errors.push(...validateSessionRecord(record, protocol).errors);
    if (session.status === "completed") completedRecords.push(record);
  } catch (error) {
    errors.push(`${session.participantId} redacted record cannot be read: ${error.message}`);
  }
}

if (completedRecords.length === 6 && errors.length === 0) {
  const classification = classifyPilot(completedRecords, protocol);
  if (state.finalDecision !== classification.decision) {
    errors.push(
      `state.finalDecision must equal derived decision ${classification.decision}`
    );
  }
}

if (errors.length) {
  console.error("A2 pilot validation failed.");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `A2 pilot OK: ${result.completed}/6 completed, ${result.started}/6 started, gate ${state.technicalGate.status}.`
);

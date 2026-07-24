const allowedGroups = new Set([
  "coding-agent",
  "durable-workflow",
  "evaluation",
  "interoperability",
  "policy-provenance",
  "research",
  "sandbox",
  "telemetry",
]);
const allowedDecisions = new Set([
  "adopt",
  "adapt",
  "integrate",
  "integrate-later",
  "defer",
  "reject",
  "reject-as-single-gate",
]);
const allowedSourceKinds = new Set([
  "official-doc",
  "official-product-post",
  "official-repo",
  "official-spec",
  "primary-audit",
  "primary-paper",
]);
const unsafeRevision = /^(required|latest|main|master|head|unknown)$/i;
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value) {
  if (typeof value !== "string" || !isoDate.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value);
}

function validHttpsUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function validateExternalSystems(registry, options = {}) {
  const errors = [];
  const effectiveDate =
    options.effectiveDate ?? new Date().toISOString().slice(0, 10);

  function requireText(value, path, minimum = 20) {
    if (typeof value !== "string" || value.trim().length < minimum) {
      errors.push(`${path} must contain at least ${minimum} characters`);
    }
  }

  if (registry.schemaVersion !== 1) errors.push("schemaVersion must equal 1");
  requireText(registry.decision, "decision");
  requireText(registry.scope, "scope");

  if (!validDate(registry.reviewedAt)) {
    errors.push("reviewedAt must be a valid YYYY-MM-DD date");
  }
  if (!validDate(registry.reviewBy)) {
    errors.push("reviewBy must be a valid YYYY-MM-DD date");
  }
  if (
    validDate(registry.reviewedAt) &&
    validDate(registry.reviewBy) &&
    registry.reviewBy <= registry.reviewedAt
  ) {
    errors.push("reviewBy must be later than reviewedAt");
  }
  if (!validDate(effectiveDate)) {
    errors.push("effectiveDate must be a valid YYYY-MM-DD date");
  } else if (
    validDate(registry.reviewedAt) &&
    registry.reviewedAt > effectiveDate
  ) {
    errors.push("reviewedAt cannot be later than the effective review date");
  } else if (validDate(registry.reviewBy) && effectiveDate > registry.reviewBy) {
    errors.push(
      `external-system review expired on ${registry.reviewBy}; current review date is ${effectiveDate}`
    );
  }

  if (!Array.isArray(registry.systems) || registry.systems.length < 12) {
    errors.push("systems must contain at least 12 current primary-source comparisons");
  }

  const seenIds = new Set();
  const seenSources = new Set();
  const groups = new Set();
  let sourceCount = 0;
  let deferredOrRejected = 0;

  for (const [index, system] of (registry.systems ?? []).entries()) {
    const prefix = `systems[${index}]`;

    if (
      typeof system.id !== "string" ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(system.id)
    ) {
      errors.push(`${prefix}.id must be lowercase kebab-case`);
    } else if (seenIds.has(system.id)) {
      errors.push(`${prefix}.id duplicates "${system.id}"`);
    } else {
      seenIds.add(system.id);
    }

    requireText(system.name, `${prefix}.name`, 2);
    if (!allowedGroups.has(system.group)) {
      errors.push(`${prefix}.group is not allowed`);
    } else {
      groups.add(system.group);
    }
    if (!allowedDecisions.has(system.decision)) {
      errors.push(`${prefix}.decision is not allowed`);
    }
    if (
      typeof system.decision === "string" &&
      (system.decision.startsWith("defer") ||
        system.decision.startsWith("reject"))
    ) {
      deferredOrRejected += 1;
    }

    requireText(system.mechanism, `${prefix}.mechanism`);
    requireText(system.cyclewardenBoundary, `${prefix}.cyclewardenBoundary`);
    requireText(system.limitation, `${prefix}.limitation`);
    requireText(system.falsificationTest, `${prefix}.falsificationTest`);

    if (!Array.isArray(system.sources) || system.sources.length === 0) {
      errors.push(`${prefix}.sources must contain at least one primary source`);
      continue;
    }

    for (const [sourceIndex, source] of system.sources.entries()) {
      const sourcePrefix = `${prefix}.sources[${sourceIndex}]`;
      sourceCount += 1;

      if (!allowedSourceKinds.has(source.kind)) {
        errors.push(`${sourcePrefix}.kind is not allowed`);
      }
      if (!validHttpsUrl(source.url)) {
        errors.push(`${sourcePrefix}.url must be an HTTPS primary-source URL`);
      }
      if (
        typeof source.revision !== "string" ||
        source.revision.trim().length < 3 ||
        unsafeRevision.test(source.revision.trim())
      ) {
        errors.push(
          `${sourcePrefix}.revision must pin a version, commit, publication, or access date`
        );
      }
      if (!validDate(source.reviewedAt)) {
        errors.push(`${sourcePrefix}.reviewedAt must be a valid YYYY-MM-DD date`);
      } else if (validDate(effectiveDate) && source.reviewedAt > effectiveDate) {
        errors.push(
          `${sourcePrefix}.reviewedAt cannot be later than the effective review date`
        );
      } else if (
        validDate(registry.reviewedAt) &&
        source.reviewedAt > registry.reviewedAt
      ) {
        errors.push(
          `${sourcePrefix}.reviewedAt cannot be later than the registry review`
        );
      }

      const sourceKey = `${source.url}@${source.revision}`;
      if (seenSources.has(sourceKey)) {
        errors.push(`${sourcePrefix} duplicates source revision "${sourceKey}"`);
      } else {
        seenSources.add(sourceKey);
      }
    }

    if (/\b(TODO|TBD|FIXME)\b|<[^>]+>/.test(JSON.stringify(system))) {
      errors.push(`${prefix} contains an unresolved placeholder`);
    }
  }

  if (groups.size < 5) {
    errors.push(`systems must cover at least 5 groups; found ${groups.size}`);
  }
  if (sourceCount < 12) {
    errors.push(`systems must cite at least 12 primary sources; found ${sourceCount}`);
  }
  if (deferredOrRejected === 0) {
    errors.push("registry must preserve at least one defer or reject decision");
  }

  if (
    !Array.isArray(registry.contradictions) ||
    registry.contradictions.length < 3
  ) {
    errors.push(
      "contradictions must preserve at least three material counter-signals"
    );
  }

  const contradictionIds = new Set();
  for (const [index, contradiction] of (
    registry.contradictions ?? []
  ).entries()) {
    const prefix = `contradictions[${index}]`;
    if (
      typeof contradiction.id !== "string" ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(contradiction.id)
    ) {
      errors.push(`${prefix}.id must be lowercase kebab-case`);
    } else if (contradictionIds.has(contradiction.id)) {
      errors.push(`${prefix}.id duplicates "${contradiction.id}"`);
    } else {
      contradictionIds.add(contradiction.id);
    }
    requireText(contradiction.claim, `${prefix}.claim`);
    requireText(contradiction.impact, `${prefix}.impact`);
    requireText(contradiction.resolution, `${prefix}.resolution`);

    const evidenceIds = new Set(contradiction.evidence ?? []);
    if (!Array.isArray(contradiction.evidence) || evidenceIds.size < 2) {
      errors.push(
        `${prefix}.evidence must reference at least two compared systems`
      );
    } else {
      for (const id of contradiction.evidence) {
        if (!seenIds.has(id)) {
          errors.push(`${prefix}.evidence references unknown system "${id}"`);
        }
      }
    }
  }

  return {
    errors,
    groupCount: groups.size,
    sourceCount,
    systemCount: registry.systems?.length ?? 0,
  };
}

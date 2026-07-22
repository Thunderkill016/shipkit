import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const files = [
  "WHITEPAPER.md",
  "spec/README.md",
  "spec/PRES-1.md",
  "spec/CONFORMANCE.md",
  "spec/GOVERNANCE.md",
  "spec/SHIPKIT-PROFILE.md",
  "spec/schema/pres-cycle.schema.json",
  "spec/examples/minimal-cycle.json",
];

const errors = [];

for (const file of files) {
  try {
    await access(resolve(root, file));
  } catch {
    errors.push(`missing required PRES file: ${file}`);
  }
}

let schema;
let example;
try {
  schema = JSON.parse(
    await readFile(resolve(root, "spec/schema/pres-cycle.schema.json"), "utf8")
  );
  example = JSON.parse(
    await readFile(resolve(root, "spec/examples/minimal-cycle.json"), "utf8")
  );
} catch (error) {
  errors.push(
    `PRES JSON could not be parsed: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
}

function typeMatches(value, expected) {
  if (expected === "array") return Array.isArray(value);
  if (expected === "null") return value === null;
  if (expected === "object") {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }
  return typeof value === expected;
}

function validate(value, rule, path = "$") {
  if (!rule || typeof rule !== "object") return;

  if (rule.const !== undefined && value !== rule.const) {
    errors.push(`${path} must equal ${JSON.stringify(rule.const)}`);
  }
  if (rule.enum && !rule.enum.includes(value)) {
    errors.push(`${path} is not in the allowed enum`);
  }

  if (rule.type) {
    const types = Array.isArray(rule.type) ? rule.type : [rule.type];
    if (!types.some((type) => typeMatches(value, type))) {
      errors.push(`${path} has the wrong type; expected ${types.join(" or ")}`);
      return;
    }
  }

  if (typeof value === "string") {
    if (rule.minLength && value.length < rule.minLength) {
      errors.push(`${path} is shorter than minLength`);
    }
    if (rule.pattern && !new RegExp(rule.pattern).test(value)) {
      errors.push(`${path} does not match ${rule.pattern}`);
    }
    if (rule.format === "date-time" && Number.isNaN(Date.parse(value))) {
      errors.push(`${path} is not a valid date-time`);
    }
  }

  if (Array.isArray(value)) {
    if (rule.minItems && value.length < rule.minItems) {
      errors.push(`${path} has fewer than ${rule.minItems} items`);
    }
    if (rule.items) {
      value.forEach((item, index) => validate(item, rule.items, `${path}[${index}]`));
    }
  }

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const key of rule.required ?? []) {
      if (!(key in value)) errors.push(`${path}.${key} is required`);
    }

    for (const [key, child] of Object.entries(value)) {
      if (rule.properties?.[key]) {
        validate(child, rule.properties[key], `${path}.${key}`);
      } else if (rule.additionalProperties === false) {
        errors.push(`${path}.${key} is not allowed`);
      }
    }

    if (rule.propertyNames?.pattern) {
      const pattern = new RegExp(rule.propertyNames.pattern);
      for (const key of Object.keys(value)) {
        if (!pattern.test(key)) errors.push(`${path} property name is invalid: ${key}`);
      }
    }
  }
}

if (schema && example) {
  if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
    errors.push("PRES schema must declare JSON Schema 2020-12");
  }
  validate(example, schema);
}

function normalizeMarkdown(content) {
  return content.replace(/[*_`]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

const whitepaper = normalizeMarkdown(
  await readFile(resolve(root, "WHITEPAPER.md"), "utf8").catch(() => "")
);
const core = normalizeMarkdown(
  await readFile(resolve(root, "spec/PRES-1.md"), "utf8").catch(() => "")
);
const conformance = normalizeMarkdown(
  await readFile(resolve(root, "spec/CONFORMANCE.md"), "utf8").catch(() => "")
);

for (const phrase of [
  "positive recursive evolution standard",
  "improved-improver evidence",
  "negative recursion",
  "shipkit currently maps to pres e2",
]) {
  if (!whitepaper.includes(phrase)) {
    errors.push(`WHITEPAPER.md missing required concept: ${phrase}`);
  }
}

for (const phrase of [
  "must not claim positive recursive evolution",
  "memory consumption requirement",
  "conformance claims",
]) {
  if (!core.includes(phrase)) {
    errors.push(`PRES-1.md missing normative concept: ${phrase}`);
  }
}

for (const level of ["e0", "e1", "e2", "e3", "e4"]) {
  if (!conformance.includes(level)) {
    errors.push(`CONFORMANCE.md missing level: ${level.toUpperCase()}`);
  }
}

if (errors.length) {
  console.error("PRES specification validation failed.");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  "PRES specification OK: documents present and example conforms to the committed schema subset."
);

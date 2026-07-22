#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = resolve(root, "product/slices.json");
const args = process.argv.slice(2);

function readArg(name) {
  const inline = args.find((arg) => arg.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3).trim();
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? String(args[index + 1] ?? "").trim() : "";
}

const id = readArg("id");
const title = readArg("title");
const description =
  readArg("description") ||
  `Capture and review ${title || id || "product"} signals with an owner-scoped workflow.`;

if (!/^[a-z][a-z0-9-]{1,47}$/.test(id)) {
  console.error("--id is required and must use lowercase kebab-case (2-48 characters)");
  process.exit(1);
}
if (!title || title.length > 80) {
  console.error("--title is required and must be at most 80 characters");
  process.exit(1);
}
if (description.length > 280) {
  console.error("--description must be at most 280 characters");
  process.exit(1);
}

const registry = JSON.parse(readFileSync(registryPath, "utf8"));
if (registry.schemaVersion !== 1 || !Array.isArray(registry.slices)) {
  console.error("product/slices.json has an unsupported shape");
  process.exit(1);
}
if (registry.slices.some((slice) => slice.id === id)) {
  console.error(`Slice already exists: ${id}`);
  process.exit(1);
}

registry.slices.push({
  id,
  title,
  description,
  submitLabel: `Add ${title.toLowerCase()}`,
  emptyState: `No ${title.toLowerCase()} records yet.`,
  fields: [
    {
      id: "summary",
      label: "Summary",
      type: "text",
      required: true,
      maxLength: 120,
      placeholder: `Describe the ${title.toLowerCase()}`,
    },
    {
      id: "details",
      label: "Details",
      type: "textarea",
      required: false,
      maxLength: 2000,
      placeholder: "Context and evidence",
    },
    {
      id: "status",
      label: "Status",
      type: "select",
      required: true,
      defaultValue: "new",
      options: [
        { value: "new", label: "New" },
        { value: "reviewed", label: "Reviewed" },
        { value: "done", label: "Done" },
      ],
    },
  ],
});

writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Created Product Slice "${title}" at /app/slices/${id}`);
console.log("Run pnpm test && pnpm build to verify the contract.");

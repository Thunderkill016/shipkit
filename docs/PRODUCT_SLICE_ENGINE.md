# Product Slice Engine

Shipkit can turn a small product contract into a working owner-scoped workflow
without a paid AI call or a hand-built CRUD page.

## Try the included slice

```bash
pnpm install
pnpm ready
pnpm dev
```

Open `/app/slices/feedback`.

The included Feedback Inbox supports create, list, and delete. The same
`product/slices.json` definition drives the form and server validation.

## Add a slice

```bash
pnpm slice:new -- --id=ideas --title="Idea Inbox"
pnpm test
pnpm build
```

Then open `/app/slices/ideas`.

The CLI adds an executable contract with text, textarea, and select fields. No
TypeScript edit is required for the first working workflow.

## Contract

```json
{
  "id": "feedback",
  "title": "Feedback Inbox",
  "description": "Capture product feedback.",
  "submitLabel": "Add feedback",
  "emptyState": "No feedback yet.",
  "fields": [
    {
      "id": "summary",
      "label": "Summary",
      "type": "text",
      "required": true,
      "maxLength": 120
    },
    {
      "id": "priority",
      "label": "Priority",
      "type": "select",
      "required": true,
      "defaultValue": "medium",
      "options": [
        { "value": "low", "label": "Low" },
        { "value": "medium", "label": "Medium" },
        { "value": "high", "label": "High" }
      ]
    }
  ]
}
```

## Guarantees in v1

- definitions fail fast when IDs, options, defaults, or limits are invalid;
- submitted records are validated on the server from the same definition;
- reads and deletes include both owner ID and slice ID;
- Postgres uses the `product_records` table and JSONB payloads;
- memory storage is used only when no database is configured;
- configured database errors are surfaced rather than silently downgraded;
- generated Shipkit projects inherit the engine and CLI.

## Supported fields

- `text`
- `textarea`
- `select`

## When to leave the engine

The engine is an idea-to-evidence layer, not a permanent no-code abstraction.
Promote a slice to custom tables and routes when it needs relationships,
transactions, files, background jobs, complex authorization, or query patterns
that deserve explicit schema design.

## Verification

```bash
pnpm test
pnpm test:slices
pnpm build

# with DATABASE_URL after migrations
pnpm test:slices:postgres
```

CI also runs a demo browser flow. The full Better Auth portable E2E path remains
tracked separately in issue #3.

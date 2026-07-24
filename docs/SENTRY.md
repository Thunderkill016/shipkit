# Sentry (optional)

Production error tracking without forcing Sentry on every install.

## Quick enable

1. Create a project at [sentry.io](https://sentry.io) → copy **DSN**.
2. Env:

```bash
SENTRY_DSN=https://xxxx@sentry.io/yyyy
SENTRY_TRACES_SAMPLE_RATE=0.1
```

3. Install Node SDK (optional peer):

```bash
pnpm --filter @cyclewarden/web add @sentry/node
```

4. Restart `pnpm dev` / redeploy.

## What CycleWarden wires

| Piece | Behavior |
|-------|----------|
| `apps/web/src/instrumentation.ts` | `Sentry.init` when DSN + package present |
| `@cyclewarden/logger` `error()` | Forwards to Sentry via dynamic import |
| No DSN | Zero overhead, no errors |

## Full Next wizard (optional)

For browser + edge tracing:

```bash
cd apps/web
npx @sentry/wizard@latest -i nextjs
```

Keep DSN in env only — never commit secrets.

## Doctor

```bash
pnpm doctor
# shows · Sentry DSN when unset, ✓ when set
```

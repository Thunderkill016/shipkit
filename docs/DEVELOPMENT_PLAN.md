# CycleWarden — Current state and development priorities

> Last verified: 2026-07-22  
> Current capability source: [`CAPABILITIES.json`](./CAPABILITIES.json)  
> Repository model: [`ai/PROJECT_MODEL.md`](./ai/PROJECT_MODEL.md)  
> Latest health report: [`ai/improvements/2026-07-22-health-report.md`](./ai/improvements/2026-07-22-health-report.md)

This document is a forward-looking plan. It does not duplicate every capability
claim. Current status belongs in `docs/CAPABILITIES.json`, where claims link to
repository evidence and are checked by CI.

## Product direction

CycleWarden is an open product foundation for AI-assisted builders who want a
working landing page, authentication, protected app shell, database patterns,
security defaults, and deploy paths without rebuilding the foundation for every
idea.

The current north-star hypothesis is:

> A builder can go from an edited `IDEA.md` to a verified first product slice in
> less than 60 minutes without an agent breaking the chosen stack.

This outcome is not yet backed by a recent measured TTFP artifact.

## Verified current state

The registry currently records:

- localized landing, login, and app shell;
- email/password AuthPort implementation;
- env-gated OAuth support without a live-provider CI path;
- Postgres-backed notes with a demo memory fallback and user-scoped operations;
- profile, storage, welcome-mail, and env-gated Stripe billing patterns;
- health endpoint, deploy recipes, diagnostics, and project generator;
- repository-first AI delivery, research, review, and improvement workflows.

Important caveat: `E2E / portable-pg` failed on the initial PR #1 run and failed
again on the failed-job rerun. Issue #3 owns diagnosis. Do not describe the
portable auth/isolation path as currently verified until that issue passes its
acceptance criteria.

## Ranked development backlog

The durable backlog lives in
[`ai/improvements/INDEX.md`](./ai/improvements/INDEX.md).

### P0 — Trust and reliability

1. **Diagnose repeated portable-pg E2E failure** — issue #3.
2. **Make configured database failures explicit** instead of silently falling
   back to in-memory notes.
3. **Keep capability claims mechanically traceable** through
   `CAPABILITIES.json` and `pnpm check:ai`.
4. **Align local and remote completion gates** so CI and `pnpm verify` do not
   drift.

### P1 — Product clarity and measured speed

5. Replace the demo-oriented root `IDEA.md` with a deliberate definition of
   CycleWarden itself, while keeping generated projects seeded with a blank product
   idea.
6. Measure time-to-first-product for demo, portable-pg, and Supabase paths.
7. Use the measurement to remove the slowest setup or decision step.
8. Publish the generator as a supported `create-cyclewarden` entry point only after
   the generated-project integration test remains stable.

### P2 — Production depth

9. Record and test observable mail delivery behavior without making signup
   depend on the provider.
10. Complete the Stripe lifecycle only when webhook, idempotency, and
    subscription-state verification are included.
11. Add failure artifacts and useful logs to critical CI paths.
12. Expand security checks only from concrete threat models and incidents.

### Later

- A second app adapter remains optional and should not precede a reliable,
  measured primary path.
- Admin, team/multi-tenant, and broader SaaS features require explicit product
  demand rather than competitor parity alone.

## Definition of done for a trustworthy v1.0

- [ ] Current required checks pass, including portable-pg auth and isolation.
- [ ] Capability registry and active docs agree with code and verification.
- [ ] Generated-project integration test is stable.
- [ ] TTFP is measured and under the selected target for at least one primary
      setup path.
- [ ] A generated project can implement and verify one domain slice from an
      issue without modifying protected foundation boundaries.
- [ ] Production claims distinguish implemented code, configured integrations,
      and behavior verified in a live environment.

## Planning rule

Every sprint must start from an outcome and evidence. Promote one bounded
candidate to an issue; do not turn this document into permission for a broad
cleanup PR.

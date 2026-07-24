# Project health report — 2026-07-22

Objective: prove the autonomous workflow can make CycleWarden more truthful and agent-legible<br>
Autonomy level: A3  
Project model: `../PROJECT_MODEL.md`  
Baseline commit: `7e9daac94f83c84cf5a3305eadcd1a3894200fec`

## Coverage

- Repository/branch: `Thunderkill016/cyclewarden`, `agent/ai-engineering-workflow`.
- Journeys traced: generator, signup/session, notes isolation, localization,
  billing, health endpoint, and CI.
- Baseline evidence: GitHub Actions, repository files, PR #1, issue #2.
- Systems unavailable: production, analytics, live third-party services.
- Overall confidence: high for documentation drift and repository tooling;
  medium for uninspected runtime/integration areas.

## Baseline

| Check | Result | Evidence | Pre-existing failure? |
|---|---|---|---|
| Unit tests | Pass | CI run 22, Test & Build | No observed failure |
| Build | Pass | CI run 22, Test & Build | No |
| Demo E2E | Pass | CI run 22 | No |
| AI workflow | Pass | AI workflow check run 7 | No |
| Portable-pg E2E | Failed on initial run and failed-job rerun | CI run 22 / issue #3 | Reproducible on this branch; root cause remains unconfirmed |
| Typecheck/lint | Required by `pnpm verify`; not separate main-CI steps | package/workflow comparison | Coverage gap |

## Findings

| ID | Dimension | Observation | Impact | Evidence | Confidence | Class |
|---|---|---|---|---|---|---|
| F1 | Documentation/DX | Current docs contradict code and each other | AI may plan obsolete work or repeat completed features | `ROADMAP.md`, `docs/DEVELOPMENT_PLAN.md`, current routes/stores | High | Repair |
| F2 | Reliability/data | Notes catch all database failures and silently use memory | Hidden persistence failure and possible data loss expectation | `apps/web/src/lib/notes-store.ts` | High | Reduce risk |
| F3 | Reliability/test | Portable auth/isolation E2E failed twice | Weakens trust in the most important non-demo path | GitHub Actions run 22 | High | Research/repair |
| F4 | Product | `IDEA.md` describes a demo product, while README/roadmap position CycleWarden itself as the product | Discovery and prioritization can target the wrong product | `IDEA.md`, `README.md`, `ROADMAP.md` | High | Simplify |
| F5 | Verification | Main CI does not execute the documented `pnpm verify` command | Local/agent completion gate and PR gate can diverge | `package.json`, `.github/workflows/ci.yml` | High | Reduce risk |
| F6 | Outcome | TTFP goal is not backed by a current measured run artifact | Cannot verify the main product promise | roadmap/development docs | Medium | Research |

## Ranked candidates

| Rank | Candidate | Expected outcome | Impact | Confidence | Urgency | Effort | Risk | Reversibility | Next action |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | Machine-verifiable capability registry and docs truth repair | Agents receive one current structured status and CI catches unsupported evidence paths | High | High | High | Medium | Low | High | Deliver in issue #2 |
| 2 | Make configured database failures explicit instead of silent memory fallback | Prevent false persistence and surface operational errors | High | High | High | Medium | Medium | High | Separate data/reliability issue |
| 3 | Diagnose portable-pg E2E failure and add failure artifacts | Stable merge signal and actionable failure evidence | High | High | High | Medium | Low | High | Focused issue #3 |
| 4 | Align CI with `pnpm verify` | One completion gate locally and remotely | Medium | High | Medium | Low | Low | High | Follow-up issue after lint compatibility check |
| 5 | Rewrite `IDEA.md` as CycleWarden's actual product definition | Better product research and prioritization | Medium | High | Medium | Low | Low | High | Human product decision |
| 6 | Measure time-to-first-product | Evidence for primary product promise | High | Medium | Medium | Medium | Low | High | Research/experiment |

## Selected candidate

- Candidate: machine-verifiable capability registry and docs truth repair.
- Why now: this repository is being turned into the memory and control system for
  AI agents; contradictory status documents directly corrupt every later cycle.
- Scope: structured registry, evidence-path checker, generated-project handling,
  current project model, corrected development/architecture docs, CI integration.
- Non-goals: product behavior, database/auth changes, dependency upgrades, deploy.
- Human approval: PR review only; no merge/deploy.

## Parked candidates

F2–F6 remain in the improvement index. They must not be silently bundled into
issue #2.

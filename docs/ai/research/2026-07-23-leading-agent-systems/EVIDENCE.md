# Evidence ledger — leading external systems for Shipkit

Status: complete for the architecture decision; user validation remains absent
Decision date: 2026-07-23
Machine-readable source record: [`../../../evolution/EXTERNAL_SYSTEMS.json`](../../../evolution/EXTERNAL_SYSTEMS.json)

## Hypotheses

| ID | Hypothesis | Confidence | What would falsify it? |
|---|---|---|---|
| H1 | Shipkit should own durable decision, policy, evidence, and outcome semantics while integrating interchangeable runtimes. | High for architecture; low for market value | A compatible system provides the complete job with lower cost and users prefer it. |
| H2 | “Agent control plane” is not a differentiated product position by itself. | High | Competitor scope proves materially narrower and users identify Shipkit's generic control-plane layer as the missing job. |
| H3 | Current research evidence needs machine-enforced freshness, revisions, contradictions, and falsification tests. | High for repository consistency; unproven for user value | The check creates recurring maintenance cost without preventing a decision or implementation error. |
| H4 | The next high-value product integration is a provider-neutral research adapter followed by one coding-agent handoff consumer. | Medium | Real users rank another bottleneck higher or a cheaper non-product workflow performs better. |

## Evidence

| ID | Observation or claim | Source and dates | Level | Relation | Kind | Confidence | Notes / next check |
|---|---|---|---:|---|---|---|---|
| E1 | Shipkit already implements the deterministic state machine, policy, durable store, content-addressed evidence, Docker execution backend, and bounded research; external user decision value and coding-agent handoff consumption remain unproved. | [`docs/CAPABILITIES.json`](../../../CAPABILITIES.json), verified 2026-07-23 | 5 | Supports H1, limits H4 | Repository fact | High | Capability claims are mechanically checked; user value is explicitly excluded. |
| E2 | The existing comparison recorded every external revision as “Required” and retained stale pre-implementation Shipkit status. | [`docs/evolution/COMPARATIVE_ANALYSIS.md`](../../../evolution/COMPARATIVE_ANALYSIS.md), reviewed 2026-07-23 | 5 | Supports H3 | Repository fact | A current narrative can still drift after a merge. |
| E3 | Temporal guarantees resumption after crashes and infrastructure failures; the TypeScript SDK revision reviewed was `2fd61e9`. | [Temporal docs](https://docs.temporal.io/), [revision](https://github.com/temporalio/sdk-typescript/commit/2fd61e99ddd7cf83d475d23c823d877ae0e7004a), reviewed 2026-07-23 | 4 | Supports H1 | Source fact | It does not define repository or product-evidence semantics. |
| E4 | LangGraph persists graph state for indefinite interrupt/resume, but resumes by restarting the interrupted node. | [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts), reviewed 2026-07-23 | 4 | Supports H1 | Source fact | Adapter activities must remain idempotent. |
| E5 | Pydantic AI exposes Temporal, DBOS, Prefect, and Restate as durable-execution integrations. | [Pydantic AI durable execution](https://pydantic.dev/docs/ai/capabilities/durable_execution/overview/), reviewed 2026-07-23 | 4 | Contradicts a custom-runtime moat | Source fact | Distributed durability is an integration market, not an empty category. |
| E6 | OpenHands Enterprise calls itself an “Agent Control Plane” and claims orchestration, policies, sandboxing, audit, cost attribution, and optimization. | [OpenHands product post](https://www.openhands.dev/blog/openhands-enterprise-agent-control-plane), published 2026-05-06 | 3 | Supports H2; contradicts older positioning | First-party claim | High that overlap exists; low confidence in unverified outcome/scale claims. |
| E7 | OpenHands separates its backend from an action-execution server inside a Docker runtime and uses version/source/lock hashes for runtime images. | [OpenHands runtime architecture](https://docs.openhands.dev/openhands/usage/architecture/runtime), reviewed 2026-07-23 | 4 | Supports H1 | Source fact | Candidate execution adapter; not lifecycle authority. |
| E8 | Current Codex guidance uses repository instructions, skills, sandbox permissions, hooks, and context-isolated specialist agents; write-heavy parallel work carries coordination cost. | [Codex docs](https://developers.openai.com/codex/), manual fetched 2026-07-23; [repo revision](https://github.com/openai/codex/commit/205d37a20f742b0bf8e191622bd07c43f567ea49) | 4 | Supports H1, H4 | Source interpretation | An adapter must preserve scope and permit cross-agent resume. |
| E9 | GitHub Copilot `preToolUse` hooks can allow, deny, or modify calls; command failures fail closed, but timeouts fail open. | [GitHub hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference), reviewed 2026-07-23 | 4 | Supports policy adapters; limits hook trust | Source fact | Timeout semantics need explicit parity fixtures. |
| E10 | mini-SWE-agent provides a minimal loop and environment baseline. | [mini-SWE-agent revision](https://github.com/SWE-agent/mini-swe-agent/commit/a83fcae82d2a08f0ee0c688f9d137b3566c097f8), reviewed 2026-07-23; [SWE-agent paper](https://arxiv.org/abs/2405.15793) | 4 | Limits orchestration complexity | Primary implementation/paper | Medium | New layers should beat a minimal baseline on protected measures. |
| E11 | Daytona sandboxes expose dedicated kernel/filesystem/network/resource boundaries plus snapshot, pause/resume, and fork capabilities. | [Daytona sandboxes](https://www.daytona.io/docs/en/sandboxes/), docs v0.200 reviewed 2026-07-23 | 3 | Supports H1 | First-party technical claim | Hosted integration adds credentials, cost, and provider-trust gates. |
| E12 | MCP defines client/server interoperability and draft elicitation rules; form mode must not request secrets. | [MCP elicitation draft](https://modelcontextprotocol.io/specification/draft/client/elicitation), reviewed 2026-07-23 | 4 | Supports H1 | Draft specification | Protocol compliance is not authorization or tool trust. |
| E13 | A2A 1.0.0 defines capability discovery and long-running interaction among opaque agents. | [A2A 1.0 specification](https://a2a-protocol.org/latest/), [repo revision](https://github.com/a2aproject/A2A/commit/0ef1b02547e959d770ebf3460d058f5c3421641c), reviewed 2026-07-23 | 4 | Supports H1; defers H4 | Specification | No use case exists until Shipkit has real agent adapters. |
| E14 | OPA decision logs carry decision ID, input/result, bundle revision, trace correlation, metrics, and masking metadata. | [OPA decision logs](https://www.openpolicyagent.org/docs/management-decision-logs), reviewed 2026-07-23 | 4 | Supports H1 | Source fact | Adapt record shape; do not add Rego without shared-policy demand. |
| E15 | SLSA v1.2 provides provenance and verification-summary formats with build and source assurance tracks. | [SLSA v1.2](https://slsa.dev/spec/v1.2/), reviewed 2026-07-23 | 4 | Supports H1 | Specification | Provenance cannot establish correctness or user value. |
| E16 | OpenTelemetry semantic conventions are at 1.43.0; GenAI conventions moved to another repository and include development-status fields. | [OpenTelemetry semantic conventions](https://opentelemetry.io/docs/specs/semconv/), reviewed 2026-07-23 | 4 | Supports optional integration; limits early coupling | Specification | Telemetry must not become authoritative state. |
| E17 | OpenAI Responses web search exposes search actions, inline citations, complete sources, domain/live-access controls, and token budgets. | [OpenAI web search guide](https://developers.openai.com/api/docs/guides/tools-web-search), reviewed 2026-07-23 | 3 | Supports H4 | First-party technical docs | Adapt provider-neutral fields first; API cost/credentials require approval. |
| E18 | BrowseComp uses hard-to-find but easy-to-verify tasks; its authors explicitly warn short answers do not represent open-ended user queries. | [BrowseComp](https://openai.com/index/browsecomp/), published 2025-04-10 | 4 | Supports multi-part evaluation; limits benchmark generalization | Primary paper/post | Use verification asymmetry, not its task distribution as product proof. |
| E19 | A February 2026 audit found material test or task issues in 59.4% of 138 reviewed SWE-bench Verified problems. | [SWE-bench Verified audit](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/), published 2026-02-23 | 4 | Contradicts benchmark-as-proof | Primary audit | The audited subset focused on inconsistent failures; do not generalize the percentage to all tasks. |
| E20 | A July 2026 audit estimated roughly 27–34% broken tasks in SWE-Bench Pro depending on review method. | [SWE-Bench Pro audit](https://openai.com/index/separating-signal-from-noise-coding-evaluations/), published 2026-07-08 | 4 | Contradicts benchmark-as-proof | Primary audit | Evaluation datasets need their own quality checks and revisions. |
| E21 | No interviews, observed behavior, product analytics, or paid pilot in this cycle establishes that users value Shipkit's decision governance. | Research scope and [`BRIEF.md`](./BRIEF.md), 2026-07-23 | 5 | Limits H1 and H4 | Evidence gap | High | Issue #14 remains the product gate. |

## Contradictions and gaps

| Topic | Supporting | Contradicting | Missing | Decision impact |
|---|---|---|---|---|
| Shipkit is differentiated as a control plane | E1 | E6, E14, E16 | Direct user comparison | Stop leading with the generic label; focus on decision-to-outcome proof. |
| More custom durable infrastructure creates advantage | E1 | E3, E4, E5 | Measured distributed use case | Preserve local kernel; integrate rather than rebuild distributed execution. |
| A public coding score proves quality | E10 | E18, E19, E20 | Shipkit-specific outcome suite | Reject a single benchmark gate. |
| Protocol adoption provides safety | E12, E13 | E9, E15 | Threat-model and parity fixtures | Keep authorization/evidence outside transport. |
| Web research integration is the immediate build | E17 | E21 | User value, provider approval, cost ceiling | Prepare provider-neutral records; do not add the paid adapter in this cycle. |

## Source limitations

- Twenty-eight primary-source records across sixteen systems and eight groups met
  the architecture stop condition; this is not a claim to have reviewed every
  project or all market alternatives.
- Product documentation establishes declared behavior and interfaces, not
  independent safety, adoption, reliability, or outcome proof.
- Repository commits pin the reviewed moving implementation but do not imply that
  every file in each repository was audited.
- Benchmark audits may have selection effects; they justify skepticism and
  dataset quality gates, not a universal failure rate.
- Current standards and APIs can change. The machine registry expires on
  2026-10-23 and must be re-reviewed before then.
- No direct user evidence was collected, so architecture fit must not be
  translated into product-market validation.

## Synthesis

The sources stopped changing the top three decisions:

1. keep Shipkit's portable deterministic decision/evidence kernel;
2. integrate external runtimes, protocols, policy, and telemetry through narrow
   adapters instead of rebuilding them;
3. make decision-to-outcome evidence and honest evaluation the differentiator,
   while retaining issue #14 as the user-value gate.

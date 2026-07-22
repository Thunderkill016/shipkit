# Evidence ledger — Evolution Engine product

Date: 2026-07-23  
Issue: #9

| ID | Observation | Source | Implication | Confidence |
|---|---|---|---|---|
| E1 | Codex CLI is a local coding agent that can read, modify, and run code with explicit approval modes | OpenAI Codex CLI official docs, accessed 2026-07-23 | Shipkit should coordinate agents, not rebuild a vendor-specific coder | High |
| E2 | OpenHands offers model-agnostic CLI, SDK, sandbox runtime, GUI, and cloud | OpenHands official product/docs, accessed 2026-07-23 | Agent execution/runtime is an established adjacent layer | High |
| E3 | LangGraph emphasizes durable execution, persistence, debugging, and human-in-the-loop stateful workflows | LangGraph official docs, accessed 2026-07-23 | Durable resumable state should be a core engine property | High |
| E4 | LangSmith and Langfuse focus on tracing, monitoring, datasets, experiments, and evaluations | Official LangSmith/Langfuse product docs, accessed 2026-07-23 | Shipkit must not position itself as another trace viewer | High |
| E5 | MCP defines a client-host-server protocol with tools and resources for agent-neutral integration | Official MCP architecture/specification, accessed 2026-07-23 | MCP should be an adapter over one core, not the core itself | High |
| E6 | Current Shipkit stores rules, prompts, plans, research, and checks but lacks a user-invokable persistent state machine | Shipkit repository inspection, 2026-07-23 | The immediate product gap is executable lifecycle control | High |
| E7 | The previous Studio issue optimized onboarding/output rather than the evolution mechanism | Issue #8, closed not planned | Product scope must remain the core engine | High |

## Contradictions

- A deterministic state machine can become bureaucracy; commands must create value at A0/A1 without an LLM and keep artifacts concise.
- Agent-neutrality can produce weak integrations; the core needs a strict adapter contract and at least two real clients later.
- Local-first reduces adoption friction for developers but limits team visibility; hosted collaboration is deferred until core evidence exists.
- A full autonomous runner is attractive but unsafe before persistence, policy, verification, and rollback are proven.

## Decision

Build the local persistent core and CLI first. Treat MCP, GitHub, dashboards, and model/agent integrations as adapters that cannot duplicate lifecycle logic.

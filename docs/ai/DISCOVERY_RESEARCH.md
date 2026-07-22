# Evidence-driven discovery research

Use this protocol to find or validate a product idea, technical upgrade, or
improvement before committing to a large build.

Research exists to change a decision. It is not a contest to produce the
longest report or the most exciting feature list.

## Required research folder

```text
docs/ai/research/YYYY-MM-DD-short-topic/
├── BRIEF.md
├── EVIDENCE.md
├── OPPORTUNITY.md
├── EXPERIMENT.md
└── RETROSPECTIVE.md
```

Copy the templates from `docs/ai/templates/` and update
`docs/ai/research/INDEX.md` when the cycle ends.

## 1. Frame the decision

Write:

- the decision this research must change;
- target user, buyer, or subsystem;
- desired user, business, or engineering outcome;
- current belief and confidence;
- constraints and non-goals;
- evidence that would support, weaken, or reverse the belief;
- timebox and stop condition.

“Research AI tutors” is a topic. “Decide whether post-session pronunciation
coaching can improve seven-day speaking practice retention” is a decision.

## 2. Inspect internal evidence first

Before the public web, inspect what the project already knows:

- product docs, repository model, roadmap, ADRs, issues, PRs, and changelog;
- analytics, funnels, search logs, incidents, support, sales, and cancellation
  reasons when access is available;
- previous research and experiments;
- code, architecture, cost, latency, quality, security, and operational limits.

Never invent internal evidence. Absence of measurement is a finding.

## 3. Plan research streams

| Stream | Questions |
|---|---|
| User | Who has the problem, in what context, how often, and what happens now? |
| Outcome | Which behavior, quality, cost, time, access, or business result should change? |
| Alternatives | Competitors, substitutes, manual work, people, spreadsheets, or doing nothing |
| Technology | Capability, quality, latency, cost, integration, version, and failure modes |
| Business | Acquisition, retention, willingness to pay, margin, and support burden |
| Risk | Security, privacy, safety, accessibility, regulation, abuse, and trust |
| Strategic fit | Why this project can win and what asset compounds over time |

For every stream define queries, preferred sources, and when to stop.

## 4. Use a source ladder

Prefer stronger evidence:

1. unsupported summary or model memory;
2. community discussion, review, forum, or social signal;
3. credible synthesis with transparent sources and method;
4. primary external evidence: official docs, regulations, original datasets,
   peer-reviewed research, first-party product behavior;
5. direct behavioral evidence: analytics, observation, reproducible experiment,
   or a concrete past-behavior user story.

Weak signals generate hypotheses. They do not validate an opportunity alone.
Record source date and access date because product, API, price, law, and model
capability can change.

## 5. Search with multiple lenses

Use separate queries for:

- problem language users use;
- current behavior and workarounds;
- failure, complaints, cancellation, and limitations;
- competitor flows, pricing, changelogs, and reviews;
- adjacent domains solving the same underlying job;
- technology frontier, cost curve, or new distribution capability;
- counter-evidence and failed approaches;
- “why now” changes in behavior, regulation, platform, or economics.

Prefer official and primary sources for technical decisions. Test competitor
behavior directly when legal and practical. Keep a query log so a future agent
can reuse or challenge the search path.

## 6. Maintain an evidence ledger

For every material claim record:

- evidence ID;
- observation or claim;
- source and date;
- source level;
- target context;
- fact, user statement, source interpretation, or agent inference;
- whether it supports, contradicts, or limits a hypothesis;
- confidence and reason;
- next verification action.

Count sources that repeat the same original evidence only once. Search
specifically for contradiction. A report containing only supportive evidence is
probably advocacy.

## 7. Map opportunities before solutions

Start with an outcome and map needs or obstacles:

```text
Desired outcome
├── Opportunity A [E1, E4]
│   ├── Sub-opportunity A1 [E7]
│   └── Sub-opportunity A2 [gap]
└── Opportunity B [E3, E9]
```

An opportunity is not a feature.

Bad: “Add an AI coach.”

Better: “Learners cannot identify which speaking mistake most reduces
comprehensibility, so they spend practice time correcting low-impact details.”

## 8. Generate a portfolio of mechanisms

Diverge before choosing. Generate concepts using at least four mechanisms:

- remove a step or decision;
- automate or delegate work;
- compress time-to-value;
- personalize the next action;
- deliver feedback at the moment of need;
- make progress or quality visible;
- coordinate people or systems;
- unlock a newly available capability;
- serve an ignored segment or constraint;
- change onboarding, distribution, pricing, or service instead of adding a
  feature.

Include a conservative concept and a non-feature alternative. Borrow mechanisms
from adjacent domains, not merely visual designs.

## 9. Evaluate breakthrough candidates

A breakthrough means a plausible step change in outcome, not novelty alone.
Assess:

- evidence that the opportunity is real and recurring;
- possible outcome delta in time, quality, cost, access, confidence, or success;
- causal mechanism;
- why now;
- narrow initial wedge;
- strategic fit and defensibility;
- feasibility of the riskiest component;
- expansion path;
- privacy, safety, misuse, support, and opportunity cost.

A scorecard helps discussion but is not proof. Keep evidence beside each score.

## 10. Rank assumptions

List assumptions under:

- desirability;
- usability;
- feasibility;
- viability;
- integrity and trust.

Rank by importance and uncertainty. Define success and kill criteria before the
experiment.

## 11. Run the cheapest useful experiment

| Unknown | Lower-cost evidence |
|---|---|
| Problem exists | Past-behavior interview, support analysis, journey observation |
| Interest | Fake door, message test, landing page, waitlist |
| Workflow value | Concierge or Wizard-of-Oz service |
| Comprehension | Clickable prototype and task test |
| Technical feasibility | Timeboxed spike or benchmark |
| Willingness to pay | Price conversation, paid pilot, commitment test |
| Repeated value | Limited cohort or repeated-use prototype |
| Safety | Threat model, abuse cases, red-team exercise |

Build only enough realism to elicit trustworthy evidence. Do not build the full
backend to test whether users understand a value proposition.

## 12. End with an explicit decision

Choose one:

- reject;
- park;
- research further;
- prototype;
- technical spike;
- promote to a bounded delivery issue.

State what evidence would change the decision.

## 13. Make research improve itself

Complete `RETROSPECTIVE.md`:

- strongest query, source, or method;
- stale, repetitive, or misleading sources;
- biggest belief change;
- most important contradiction;
- decision-critical evidence still missing;
- process lesson the next agent should reuse;
- whether a repeated lesson deserves a prompt, template, rule, script, or CI
  update.

Research reduces uncertainty; it does not guarantee product success.

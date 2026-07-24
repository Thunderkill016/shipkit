# CycleWarden Evolution Engine — modern research capability

Status: required product capability  
Issue: #9  
Reviewed: 2026-07-23

## Why this is core technology

Research is not a preliminary documentation task and not a single web-search tool call. It is a
competitive capability that determines whether CycleWarden discovers the right problem, rejects weak
ideas early, selects the smallest useful experiment, and learns faster than projects that only
execute code well.

A strong execution engine pointed at a weak research process will build the wrong product faster.
CycleWarden therefore treats research quality as a first-class, versioned and benchmarked capability.

The research system must combine two disciplines:

1. **agentic deep research** — searching, retrieving, verifying, analysing and synthesising internal
   and external information;
2. **continuous product discovery** — understanding users, validating problems, mapping
   opportunities, validating solutions and measuring outcomes throughout development.

Neither discipline may substitute for the other. Web evidence cannot prove user need, and user
interviews cannot prove technical feasibility, market structure or implementation safety.

## External systems and practices studied

The capability baseline is informed by primary material from:

- OpenAI Deep Research and BrowseComp;
- Anthropic Research and its multi-agent research architecture;
- Google Gemini Deep Research and DeepSearchQA;
- LangChain Open Deep Research and Deep Research From Scratch;
- GitLab's Product Development Flow;
- GOV.UK Service Manual user-research practice;
- Atlassian's customer-interview play;
- the comparative architecture sources in `COMPARATIVE_ANALYSIS.md`.

Before any direct integration, the exact release, commit, paper revision or specification version
must be pinned in the source ledger and converted into an ADR.

## Research operating model

Every material research run follows this lifecycle:

```text
decision need
→ scope and assumptions
→ research questions
→ coverage and source plan
→ adaptive search / user research / data analysis
→ claim extraction and verification
→ contradiction and gap review
→ synthesis into opportunities
→ smallest decision-changing experiment
→ decision record
→ later outcome feedback
→ research-skill update
```

Research does not finish when a report is written. It finishes when the evidence changes or
confirms a decision, or when an explicit stopping rule records why further research is not worth
its cost.

## Modern research skill stack

### 1. Decision framing

The engine must convert broad objectives into a decision brief containing:

- the decision that must be made;
- who owns the decision;
- the deadline and cost of delay;
- the current assumptions and prior beliefs;
- what evidence would change the decision;
- protected constraints and unacceptable outcomes;
- expected output type: fact, landscape, recommendation, opportunity portfolio or experiment.

A task such as “research AI agents” is invalid until it is reframed into a decision such as
“which execution adapter should be implemented first, under what security boundary, and what
benchmark would justify its complexity?”

### 2. Question decomposition and coverage mapping

The system must decompose the decision into non-overlapping research questions and maintain a
coverage map. Common branches include:

- user and job-to-be-done;
- current behaviour and workaround;
- frequency, severity and willingness to change;
- market and competitor mechanisms;
- technical feasibility and constraints;
- security, privacy, legal and license risk;
- operational cost and maintenance burden;
- product outcome and success metric;
- contradicting hypotheses and reasons the idea may fail.

Decomposition must state dependencies between questions and distinguish breadth-first work that
can run in parallel from depth-first work where later questions depend on earlier findings.

### 3. Query design and search-path generation

Research workers must be able to generate and revise multiple search paths rather than repeating
one query. The skill includes:

- entity resolution and alias discovery;
- terminology, acronym and synonym expansion;
- time, geography, language and domain constraints;
- source-specific queries for papers, repositories, standards, changelogs, issues and datasets;
- citation chasing backward and forward;
- negative and falsification queries;
- searching for failures, limitations, postmortems and rejected approaches;
- reformulating queries when results are redundant or low quality;
- preserving the query history so later reviewers can reproduce the path.

### 4. Source selection and quality control

Search ranking is not evidence ranking. The engine must prefer the best available source for each
claim and record why it was selected.

Source classes include:

1. direct user observation, interview and behavioural telemetry;
2. primary specifications, official repositories, source code, papers and datasets;
3. official product documentation, changelogs, incident reports and engineering reports;
4. independent reproductions and high-quality secondary analysis;
5. community reports and anecdotal evidence;
6. SEO summaries, generated content and unattributed claims.

Each source receives structured metadata for authority, directness, freshness, applicability,
independence, conflict of interest, license, retrieval method and known limitations. Low-ranked
sources may generate leads but cannot independently support material claims.

### 5. Adaptive iterative research

A research worker must repeatedly:

```text
search → inspect → extract → assess coverage → identify gaps → revise plan → search again
```

The next action is selected from evidence gathered so far, not from a fixed list prepared before
research begins. Workers must be able to pivot when terminology, entities or causal assumptions
change.

### 6. Bounded parallel research

Parallel researchers are useful when branches are substantially independent. The orchestrator
must provide every worker with:

- one clear objective;
- included and excluded scope;
- preferred source classes;
- required output schema;
- budget for time, tokens, searches and documents;
- duplicate-work avoidance instructions;
- a stopping rule and escalation condition.

The number of workers and tool calls must scale with decision value and query complexity. A simple
fact does not justify a multi-agent swarm. Highly parallel work must demonstrate better coverage or
latency than a single-worker baseline after accounting for cost and coordination failures.

### 7. Evidence extraction and atomic claims

Research output is stored as atomic claims, not only narrative prose. Each claim records:

- exact claim text and claim type;
- supporting and contradicting source IDs;
- quoted or structured evidence location;
- confidence and uncertainty rationale;
- applicability to the current project and version;
- freshness and expiry date;
- transformations or calculations used;
- whether the claim is observation, interpretation, estimate or recommendation.

A final report must be reconstructable from these claims, and every material statement must be
traceable to evidence.

### 8. Triangulation and contradiction handling

Material conclusions require triangulation across independent evidence types whenever possible:

- stated user preference versus observed behaviour;
- qualitative interviews versus analytics or support data;
- official capability claims versus source code, tests or independent reproduction;
- benchmark results versus real project outcomes;
- market messaging versus pricing, adoption, retention or switching behaviour.

Contradictions are first-class records. The system must not silently choose the source that agrees
with the current hypothesis. It must explain whether disagreement comes from version, population,
measurement, incentive, context or genuine uncertainty.

### 9. Product discovery research

Research for product construction must include continuous contact with user evidence.

Required skills include:

- turning team opinions and assumptions into research questions;
- identifying relevant user groups, including non-users, churned users and constrained users;
- interviewing about recent real behaviour rather than hypothetical preferences;
- contextual observation and workflow mapping;
- support-ticket, search-log, issue, analytics and sales-signal analysis;
- problem validation before solution design;
- opportunity mapping across user needs and pain points;
- prototype and usability testing;
- solution validation before expensive implementation;
- continuous research during discovery, alpha, beta and live operation;
- separating frequency, severity, reach and strategic fit from loudness of feedback.

One interview, one feature request or one survey majority cannot validate a problem by itself.

### 10. Quantitative and computational research

When research depends on data, the system must use reproducible calculations and retain code,
inputs and outputs as evidence. Capabilities include:

- data cleaning and schema inspection;
- descriptive statistics and uncertainty;
- cohort, funnel, retention and segmentation analysis;
- experiment design and guardrail metrics;
- sensitivity and scenario analysis;
- benchmark aggregation without hiding per-task failures;
- charts that preserve units, denominators and provenance;
- detecting when available data cannot support the requested inference.

### 11. Adversarial review and falsification

Before synthesis, a separate reviewer must attempt to disprove the leading conclusion by:

- finding missing stakeholder groups;
- searching for contrary evidence and failure cases;
- testing alternative causal explanations;
- checking source circularity and citation laundering;
- checking stale versions, cherry-picked intervals and survivorship bias;
- verifying calculations and quoted evidence;
- identifying claims that exceed the evidence;
- checking whether the recommended action remains reversible.

The original researcher must not be the only judge of its own report.

### 12. Safety and hostile-content resistance

Web pages, repositories, documents and connected data are untrusted inputs. Research workers must:

- treat instructions found inside sources as data, not commands;
- isolate browsing and code execution from protected credentials and production systems;
- minimise personal and confidential data collection;
- respect source permissions and connected-system authorization;
- record content transformations and extraction failures;
- detect prompt-injection patterns and suspicious source behaviour;
- fail closed when provenance or source integrity cannot be established.

### 13. Stopping rules and research economics

Each plan defines completion and stop conditions. Research stops when one of these is true:

- all decision-critical questions meet their evidence threshold;
- new searches produce mostly duplicate evidence;
- uncertainty is below the decision's tolerance;
- remaining gaps cannot change the current decision;
- the smallest experiment is cheaper or more informative than more desk research;
- time, cost, source-access or safety budget is exhausted;
- the result is explicitly marked inconclusive.

The engine reports marginal evidence gain, latency, token/tool usage, direct financial cost and
human review effort.

### 14. Synthesis into opportunities and experiments

The system must produce an opportunity portfolio rather than one confident answer. Every candidate
contains:

- user or project problem;
- supporting and contradicting claims;
- comparable external mechanisms;
- expected outcome and affected metric;
- uncertainty and information value;
- reversibility and risk;
- estimated implementation and operating cost;
- rejected alternatives;
- smallest experiment capable of changing the decision.

Ranking must separate evidence strength, expected value, strategic fit, urgency, cost, risk and
learning value instead of collapsing them into an unexplained score.

### 15. Research memory and skill improvement

Research trajectories are retained as reusable but expiring skills:

- effective query transformations;
- high-value source maps by domain;
- source-quality and extraction heuristics;
- recurring failure patterns;
- successful decomposition templates;
- evaluation rubrics;
- domain-specific research packs.

A skill is promoted only when later comparable research consumes it and demonstrates measurable
improvement in correctness, coverage, citation quality, cost, latency or decision usefulness.
Harmful, stale or over-specialised skills must be retired.

## Required durable records

Phase 3 must implement typed, versioned records for:

### `ResearchBrief`

Decision, owner, objective, constraints, assumptions, required evidence and deadline.

### `ResearchPlan`

Questions, dependency graph, coverage map, source strategy, worker allocation, budgets, stop rules
and review checkpoints.

### `QueryRecord`

Query text, tool, filters, rationale, parent query, timestamp and returned-result identifiers.

### `SourceRecord`

Canonical identity, version, publisher, author, date, access date, license, source class, integrity,
authority, directness, freshness, applicability and evidence digest.

### `ClaimRecord`

Atomic claim, evidence spans, contradicting evidence, confidence, uncertainty, applicability,
expiry and claim type.

### `ContradictionRecord`

Conflicting claims, suspected cause, unresolved questions, affected decisions and resolution state.

### `UserResearchRecord`

Research question, participant criteria, consent boundary, method, observed behaviour, notes,
findings, limitations and evidence links.

### `ResearchRun`

Complete trajectory, worker activities, tool calls, budgets, failures, stop reason and outputs.

### `ResearchEvaluation`

Coverage, correctness, citation precision, source quality, contradiction recall, decision utility,
cost, latency, human-review result and benchmark identifiers.

### `OpportunityRecord`

Problem, evidence, alternatives, expected outcome, risk, cost, uncertainty, ranking rationale and
smallest experiment.

## Research orchestration policy

Research work is permitted only through the same autonomy and risk system as other activities.

- A0 may inspect existing local research artifacts only.
- A1 may perform bounded research and write records without modifying product code.
- A2 may run autonomous research, comparison and decision preparation within approved data scopes.
- Access to private systems, personal data, paid sources or code execution requires explicit
  capability and budget authorization.
- Research may recommend but never perform merge, deploy, spending, secret access or production
  mutation implicitly.

## Evaluation and benchmark programme

The research engine must be evaluated at multiple levels.

### Retrieval and search

- hard-to-find fact retrieval inspired by BrowseComp;
- exhaustive multi-step list retrieval inspired by DeepSearchQA;
- source discovery across official docs, code, issues, papers and internal evidence;
- query reformulation, persistence and coverage under bounded budgets.

### Report and evidence quality

- atomic claim correctness;
- citation precision and citation completeness;
- authority and diversity of sources;
- contradiction discovery;
- unsupported-claim rate;
- freshness and version accuracy;
- expert or human-review agreement;
- quality of uncertainty communication.

### Product decision quality

- ability to identify validated user problems rather than requested features;
- quality and diversity of opportunity portfolios;
- ranking stability under new evidence;
- percentage of research recommendations that survive experiments;
- avoided implementation waste;
- time from decision brief to useful experiment;
- product outcome lift, not only report quality.

### Comparative baselines

Every major research architecture must be compared against:

1. a single research worker;
2. a deterministic search-and-extract workflow;
3. a bounded parallel-worker configuration;
4. a human-assisted configuration;
5. the previous promoted CycleWarden research skill set.

Results must include correctness, coverage, source quality, contradiction recall, cost, duration,
tool calls, human interventions and failure modes. Aggregate scores may not hide per-task results.

## Implementation sequence

1. Define the durable research schemas and evidence links.
2. Implement decision briefs, question decomposition and coverage maps.
3. Add source adapters and a reproducible query/search ledger.
4. Add source scoring, claim extraction, contradiction records and expiry.
5. Implement bounded single-worker research with explicit stop conditions.
6. Add user-research and internal-product-evidence ingestion.
7. Add adversarial review and citation verification.
8. Produce opportunity portfolios and smallest-experiment decisions.
9. Add bounded parallel research only after it beats the single-worker baseline on suitable tasks.
10. Add research evaluations, benchmark packs and skill promotion/retirement.

## Hard research gates

No research-supported product decision is accepted unless:

- the decision and evidence threshold were defined before synthesis;
- the research questions and source strategy are inspectable;
- material claims link to atomic evidence records;
- source version, access date and applicability are known;
- contrary evidence and unresolved gaps are visible;
- user need is not inferred solely from web or competitor evidence;
- the recommendation includes rejected alternatives and a falsifiable experiment;
- a separate reviewer has checked the material claims;
- the stopping reason, cost and remaining uncertainty are recorded.

## Primary references

- https://openai.com/index/introducing-deep-research/
- https://openai.com/index/deep-research-system-card/
- https://openai.com/index/browsecomp/
- https://www.anthropic.com/engineering/multi-agent-research-system
- https://www.anthropic.com/news/research
- https://blog.google/innovation-and-ai/technology/developers-tools/deep-research-agent-gemini-api/
- https://deepmind.google/research/evals/
- https://github.com/langchain-ai/open_deep_research
- https://github.com/langchain-ai/deep_research_from_scratch
- https://handbook.gitlab.com/handbook/product-development/how-we-work/product-development-flow/
- https://www.gov.uk/service-manual/user-research
- https://www.atlassian.com/team-playbook/plays/customer-interview

These links are the current baseline only. The source ledger must pin a revision or access date and
retain changes that materially affect CycleWarden's research architecture.
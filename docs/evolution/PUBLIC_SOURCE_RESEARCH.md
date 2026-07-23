# Public source research baseline

Shipkit's first external-source adapter is a bounded, manifest-driven HTTP retriever. It extends the repository research baseline with real public-source capture and exact citation verification while deliberately stopping short of unrestricted web search.

## Flow

```text
modeled cycle
→ explicit public-source manifest
→ URL and DNS safety checks
→ bounded sequential HTTP retrieval
→ normalized immutable source text
→ hostile-content screening
→ exact quote offsets
→ independent citation review
→ planned or inconclusive
```

The adapter never executes text found in a source. Retrieved content is evidence, not instructions.

## Command

```bash
pnpm research:public -- <cycle-id> \
  --manifest public-research.json \
  --root .shipkit \
  --project-root . \
  --actor shipkit-public-researcher \
  --reviewer shipkit-citation-reviewer
```

The cycle must already be at `modeled` and must permit the `research` action. The manifest's `ResearchBudget` controls source count, retrieval-query count, elapsed minutes and cost. The current adapter has zero provider cost and does not call a model.

## Manifest shape

The manifest contains the same brief, plan, contradictions, opportunities, decision, experiment and execution handoff used by the existing typed research bundle. Public source and claim entries use this additional shape:

```json
{
  "sources": [
    {
      "url": "https://example.org/specification",
      "title": "Example specification",
      "publisher": "Example Standards Body",
      "sourceClass": "official-documentation",
      "version": "2026-07",
      "license": null,
      "authority": 1,
      "directness": 1,
      "freshness": 1,
      "applicability": 1,
      "independence": 0.8,
      "conflictOfInterest": null,
      "rationale": "Primary specification for the decision"
    }
  ],
  "claims": [
    {
      "statement": "The specification requires exact citation verification.",
      "claimType": "fact",
      "confidence": 0.95,
      "uncertainty": "The requirement may differ in another version.",
      "supportingCitations": [
        {
          "sourceIndex": 0,
          "quote": "Material claims require exact citation verification.",
          "occurrence": 0
        }
      ],
      "contradictingCitations": [],
      "expiresAt": null
    }
  ]
}
```

`sourceClass: user-research` is intentionally rejected by this adapter. Direct user evidence requires consent, provenance and data-minimization records rather than relabeling a public webpage.

## Retrieval controls

For every initial URL and redirect destination, Shipkit:

- permits only HTTP or HTTPS;
- rejects embedded credentials;
- permits only standard ports 80 and 443;
- rejects localhost and local/internal hostnames;
- resolves DNS before retrieval and rejects private, loopback, link-local, reserved, multicast and documentation addresses;
- manually follows at most five redirects and repeats destination validation at every hop;
- enforces per-source timeout and byte limits;
- accepts only HTML, plain text, Markdown and JSON;
- fetches sequentially as a single-worker baseline.

These controls materially reduce SSRF exposure. They do not yet provide a network sandbox or a cryptographically pinned DNS connection, so the adapter must remain outside secret-bearing environments.

## Source capture

HTML executable and non-content elements are removed before text normalization. Plain text, Markdown and JSON are normalized directly. Shipkit stores:

- normalized source text as a content-addressed evidence blob;
- capture metadata as a separate contextual occurrence;
- requested and final URLs;
- redirect chain;
- media type and byte length;
- normalized-content SHA-256 digest;
- transformation version;
- safety verdict and detected signals.

Offsets refer to the captured normalized text, not the original DOM.

## Hostile-content screening

The baseline quarantines documents containing direct patterns such as:

- attempts to override prior/system/developer instructions;
- requests to reveal or transmit secrets, credentials or API keys;
- agent-directed tool, shell or function commands that attempt to bypass controls;
- explicit system/developer/assistant role impersonation.

A quarantined source is retained as inert evidence but may not support a decision. The cycle becomes `inconclusive` and records the failed safety check.

Pattern screening is not a complete prompt-injection defense. Obfuscation, images, encoded payloads and indirect social engineering remain open work.

## Exact citation spans

Every declared supporting or contradicting citation becomes a durable `CitationSpanRecord` containing:

- claim and source record IDs;
- supporting or contradicting relation;
- normalized-text start and end offsets;
- requested occurrence index;
- exact normalized quote and quote digest;
- captured source-content digest;
- transformation version;
- verification result and explicit error when verification fails.

A quote must contain at least 12 normalized characters and must occur at the requested occurrence. Missing or ambiguous manifest support cannot silently become a valid claim.

## Independent review

The citation reviewer is distinct from the researcher and adds four fail-closed checks to the existing research review:

1. `source-safety` — every source was captured and none was quarantined;
2. `citation-integrity` — every claim has exact verified supporting text;
3. `source-strength` — material claims use official documentation, primary technical evidence or an independent reproduction;
4. `source-deduplication` — canonical source URLs are not duplicated.

The evaluation preserves verified and unverified citation-span IDs plus quarantined source IDs. Any failed check produces a durable `inconclusive` cycle instead of `decided` or `planned`.

## Verified scope

Tests cover:

- private-network resolution blocked before fetch;
- redirect to private address blocked;
- clean HTML and text capture;
- exact quote offset verification;
- content-addressed evidence persistence;
- independent review and planned lifecycle persistence;
- hostile instruction fixture producing `inconclusive`;
- missing quote producing `inconclusive`;
- CLI journal reload retaining run, evaluation and citation spans.

## Honest boundary

This slice does **not** yet implement:

- search-engine discovery or ranking;
- adaptive query reformulation;
- backward or forward citation chasing;
- browser rendering or JavaScript execution;
- PDF extraction;
- entity, version, language or geography resolution;
- circular citation and citation-laundering detection across the wider graph;
- calculation or transformation provenance beyond normalized text;
- user-research ingestion;
- paid/model-backed research budgets;
- a network sandbox or DNS pinning;
- proof that retrieved research improves a real user's decision.

The next research slice should add one reproducible discovery adapter and compare it against this manifest baseline before adding parallel workers.

# Minimal public search discovery

CycleWarden's first reproducible search provider is `github-repository-search`, backed by the public GitHub Repository Search API.

This is deliberately narrower than general web search. It exists to prove the discovery contract before adding more providers.

## Contract

A search manifest declares:

- one provider ID;
- at least one support query;
- at least one falsification query;
- a maximum result count for every query;
- exact ranked results to retrieve;
- the normal public-source claims, citations, opportunities, decision, experiment and handoff;
- the existing query, source, time and zero-cost budgets.

Each persisted search response records:

- provider;
- exact query;
- search timestamp;
- provider response content digest;
- provider-reported total and completeness status;
- contiguous rank;
- canonical and retrieval URLs;
- result title, snippet, score and update timestamp;
- result digest and response digest.

Selected results are fetched again through the existing public-source boundary. DNS, private-network, redirect, media-type, byte, timeout and hostile-content checks therefore remain in force. Exact normalized-text citation spans and independent review are still required before a decision can pass.

## Fail-closed behavior

The cycle becomes `inconclusive` when:

- the provider is unsupported;
- a provider request fails, redirects unexpectedly, is quarantined or returns malformed JSON;
- the provider reports incomplete results;
- a response is stale or has invalid timestamps;
- ranks are non-contiguous;
- result or response digests do not verify;
- duplicate ranked or selected canonical URLs appear;
- a selected rank does not exist;
- support and falsification evidence are not both represented;
- search plus retrieval operations exceed the query budget;
- selected sources exceed the source budget;
- bounded source capture, exact citation verification or independent review fails.

## Current limitations

- Only public GitHub repository search is implemented.
- No general web index, paper/PDF search, browser rendering, private source or paid provider is included.
- No adaptive query reformulation or citation chasing is included.
- Provider ranking may change between runs. CycleWarden preserves what was observed; it does not claim future runs will return the same order.
- Search evidence does not establish user demand. External decision value remains governed by the fixed six-participant pilot in issue #14.

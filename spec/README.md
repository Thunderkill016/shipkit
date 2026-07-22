# PRES specification

PRES is the **Positive Recursive Evolution Standard** for governed,
evidence-driven improvement of projects and products.

## Documents

- [`../WHITEPAPER.md`](../WHITEPAPER.md) — thesis, motivation, architecture, economics, and limits.
- [`PRES-1.md`](PRES-1.md) — normative Core specification.
- [`CONFORMANCE.md`](CONFORMANCE.md) — Evolution Levels and claim requirements.
- [`GOVERNANCE.md`](GOVERNANCE.md) — versioning and open change process.
- [`SHIPKIT-PROFILE.md`](SHIPKIT-PROFILE.md) — reference implementation mapping.
- [`schema/pres-cycle.schema.json`](schema/pres-cycle.schema.json) — portable cycle manifest schema.
- [`examples/minimal-cycle.json`](examples/minimal-cycle.json) — minimal valid example.

## Status

Version 0.1.0 is an Editor's Draft. It is not yet a consensus recommendation or
certification scheme.

## Design goals

- vendor, model, framework, and domain neutrality;
- evidence over self-assertion;
- portable durable memory;
- bounded autonomy and explicit risk;
- independent verification appropriate to impact;
- open implementation and extension;
- measurable distinction between iteration and positive recursion.

Run:

```bash
pnpm check:pres
```

to validate the committed schema, example, cross-document references, and basic
normative consistency.

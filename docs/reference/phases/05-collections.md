# Phase 5 — Catalog and Collections

## Goal

Use a reusable template for every collection, with accurate product cards and complete state handling.

## Read first

[Collections](../pages/02-collections.md), [Data](../engineering/02-data-and-assets.md), and filter/sort captures.

## Tasks

1. Finish ProductCard, Price, and sale-badge presentation against the reference.
2. Build collection headings/counts, toolbar, grid, and description.
3. Implement confirmed filter schema/options, query encoding, and reset behavior.
4. Implement actual sort options, stable ordering, cursor/load-more, and deduplication.
5. Distinguish initial loading, loading-more, ready, empty, error, and exhausted states.
6. Map the nine audited collections and add any newly discovered in the manifest.
7. Test changing queries during pending requests, back/forward navigation, and reloads.

## Deliverables

Collection template, product cards, query functions, URL codec, filter panel, and pagination behavior.

## Acceptance

- Counts are data-derived rather than hard-coded snapshots.
- Empty messages do not appear alongside populated results.
- Load-more never duplicates products; filter/sort changes reset correctly.
- Cards contain correct images/prices/SKUs and do not generate nested relative paths.
- Mobile panels, grids, and cards match captures; otherwise visual status remains unverified.

## Implementation prompt

```text
Execute Phase 5 with a shared collection template and ProductCard.
Derive filters, sort options, and URL behavior from evidence; do not invent s=off
semantics. Check request races, pagination deduplication, numeric pricing, and
back/forward navigation. The 24 cards in a text extraction do not establish the
runtime page size.
```

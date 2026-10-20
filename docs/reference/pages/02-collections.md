# Collections, Filtering, and Sorting

See [coverage](../audit/01-coverage-and-routes.md) for routes and displayed counts at the audit date. Use a shared template for the nine observed collections, with slug-based content configuration.

## Observations

The text contains a collection heading, design count, filter button, sort select, product cards with identifiers/prices, an empty-result message, a load-more button, and collection introduction text. Most extracts contain the first 24 cards. This does not verify whether the runtime loads 24 items per batch or the tool only extracts part of the DOM.

Collection copy mentions filtering by price, occasion, and flower type. Exact facets, query keys, sort options, and panel presentation have not been tested directly.

## Proposed contract

```typescript
type CatalogQuery = {
  collectionSlug: string;
  text?: string;
  minPriceVnd?: number;
  maxPriceVnd?: number;
  occasions?: string[];
  flowerTypes?: string[];
  sort: 'curated' | 'price-asc' | 'price-desc' | 'newest';
  cursor?: string;
};
type CatalogResult = {
  products: ProductSummary[];
  totalMatching: number;
  nextCursor: string | null;
};
```

The sort enum above is **PROPOSED**, not an observed list of options in the current interface. Expose options only after capture confirms them. Do not treat options from legacy cached pages as evidence for the new interface.

## Proposed implementation rules

1. Start with collection membership, then apply attribute filters, stable sorting, and pagination.
2. Use OR within a facet and AND across facets; verify this proposed rule against the original behavior.
3. Reset the cursor and appended items when filters or sort change.
4. Use request IDs or cancellation so stale results cannot overwrite newer state.
5. Derive counts from query results rather than snapshot constants.
6. Support URL-state round trips if the reference does. Isolate the codec while behavior remains unknown.
7. Preserve `s=off` in the compatibility parser without inventing its meaning.
8. Product links must be origin-relative paths, not `products/` appended to the current collection URL.

## Product card

A card receives product ID, slug, SKU, title, primary image, pricing mode, price range, comparison price, and availability. Pricing rules are defined in [data and assets](../engineering/02-data-and-assets.md).

Do not assume a card layout, hover button, or secondary hover image without visual evidence. Reuse the card consistently across the homepage, collections, and PDP recommendations.

## Minimum state machine

| State | Condition | Rendering |
|---|---|---|
| Initial loading | No result yet | Skeleton preserving geometry |
| Ready | Products available | Grid and count |
| Loading more | Appending for the same query | Keep existing grid; disable load-more |
| Empty | Successful request with zero products | Message, reset action, contact |
| Error | Request failed | Retry rather than a false empty state |
| Exhausted | No next cursor | Hide/disable load-more according to the reference |

The extraction may include hidden empty-state markup alongside cards. In the application, these states must be mutually exclusive.

## Acceptance

- Filters/sort survive back/forward navigation if the reference preserves them.
- Pagination never appends duplicate products; new queries clear old results.
- VND prices are sorted numerically, not as formatted strings.
- The mobile filter opens/closes correctly, with proper scrolling and focus.
- Unknown prices do not become zero.
- Every imported product link resolves, or has an explicitly verified unavailable state.

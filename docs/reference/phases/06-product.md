# Phase 6 — Product Pages

## Goal

Implement accurate PDP data, gallery, variants, and ordering configuration without pricing errors when sizes change.

## Read first

[Product](../pages/03-product.md), [Data](../engineering/02-data-and-assets.md), and PDP captures.

## Tasks

1. Build breadcrumbs, gallery, summary, description, and recommendations.
2. Implement the actual variant control, default selection, and confirmed URL behavior.
3. Map price, comparison price, availability, and images to variants.
4. Add quantity and ordering configuration where observed.
5. Handle quote-only, unavailable, and fixed-price products separately.
6. Connect add actions to CartStore or a mock cart adapter until phase 7.
7. Verify SSR/deep links, related-product navigation, and missing products.

## Deliverables

PDP template, gallery, variant selector, ordering configuration, and verified variant fixtures.

## Acceptance

- A0302 and A0015 switch to their correct prices.
- Unavailable sizes cannot be selected when confirmed availability forbids them.
- Card starting prices and PDP prices use consistent rules.
- Added lines retain correct configuration; quote-only never creates a zero-price line.
- Image placement and mobile/desktop order follow the reference rather than developer preference.

## Implementation prompt

```text
Execute Phase 6 using pages/03-product and PDP evidence.
Build gallery, summary, and variants from shared data. Verify prices with A0302/A0015.
Do not infer slugs from SKUs or assume image counts/CTA placement without captures.
Connect the cart through an interface and record which interactions were verified.
```

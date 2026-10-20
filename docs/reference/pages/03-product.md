# Product Details

Expected template: `/products/:slug/`. Only two current PDPs were read, so do not assume identical variants or forms across all products.

## Direct evidence

| Route | SKU | Observed sizes and prices |
|---|---|---|
| `/products/bo-hoa-mini-xinh/` | A0302 | `Vừa` (medium): 380,000 VND; `To` (large): 700,000 VND |
| `/products/bo-hoa-cuc-tana-20-10-a037/` | A0015 | `Vừa` (medium): 750,000 VND; `To` (large): 1,100,000 VND |

Sources S11/S12. The extracts contain a breadcrumb, image, collection label, title, SKU, starting price, description, and recommendations. They do not establish the rendered variant selector, gallery thumbnails, or add-to-cart controls.

## Proposed component requirements

- Breadcrumbs use actual links and the appropriate collection context.
- Gallery images follow the asset manifest order; do not substitute similar products.
- The summary includes title, SKU, price, description, and variant selection where applicable.
- Position order configuration and CTAs according to actual captures rather than designing a different flow and calling it a clone.
- Recommendations use the shared catalog and pricing source.

## Variant logic

1. Each size has a stable ID, VND price, optional comparison price, availability, and optional image override.
2. Selection updates price, availability, CTA, and image where the reference does so.
3. Single-variant products should not have redundant selectors.
4. Quote-only products use a price-inquiry action rather than entering a purchase flow at zero.
5. Unavailable products cannot be added; a contact action may remain if the reference provides one.
6. Capture default selection and URL-update behavior. Do not impose a `variant` query simply because another commerce platform uses it.

## Delivery configuration

Collection content mentions selecting delivery dates/slots on the product page, but the actual controls were not observed. Keep `DeliverySelection` separate from layout so it can be placed on the PDP or checkout once verified. Card/banner messages belong to the line or order according to the actual flow.

## States to capture

| State | Record |
|---|---|
| Initial | Default size, gallery index, price, CTA |
| Variant changed | Which prices, images, or text change |
| Image opened | Whether zoom, lightbox, or swipe exists |
| Invalid date/slot | Message, placement, CTA disabled state |
| Add item | Toast, badge, drawer, or navigation |
| Quote-only | Price presentation and contact destination |
| Out of stock | Availability text and remaining actions |

## Acceptance

- A0302/A0015 prices change correctly using the fixtures above.
- SKU is not treated as a slug; slugs are not reconstructed from renamed titles.
- Added lines contain the correct variant, quantity, delivery selection, and message.
- Deep-link reload works; missing products have an explicit state.
- Related cards do not generate nested `/products/.../products/...` URLs.
- Mobile retains the CTA and entered configuration when returning from the cart.

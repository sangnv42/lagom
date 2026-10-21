# Content Ownership Register (COVER-01)

Maps every public route and shared surface to the element a visitor sees, the CMS entity that would
own it, the field, the rendering template, and the permission a change needs. Evidence column names
the current source of the value in this repository.

Permission names come from `permission-matrix.md`. `Owner/Admin` means either role; scope rules
apply on top.

Status key:

- **CMS** — editable through the admin in this build.
- **CMS-deferred** — has a CMS entity planned, editor arrives in a later phase. Stays source-owned until then.
- **Calculated** — derived at request time. Never hand-editable (COVER-04).
- **Source-owned** — needs application code by design, with the reason stated.

## Homepage `/`

| Visible element | CMS entity | Field | Template | Permission | Evidence today | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Document title, meta description | SiteSettings | `seo.homeTitle`, `seo.homeDescription` | — | `settings:edit` | `index.html:24`, `HomePage.tsx:114` | CMS-deferred |
| Hero image, eyebrow, heading, body, CTA | Page(home) section | `hero.*` | home | `page:edit` | `HomePage.tsx` hero block | CMS-deferred (phase 4) |
| Campaign / 20-10 countdown banner | Announcement | `enabled`, `startsAt`, `endsAt`, `message` | header | `global:edit` | `business.ts` `CAMPAIGN` | CMS-deferred (phase 7) |
| Product group headings and picks | Page(home) section | `grid.title`, `grid.source`, `grid.count` | home | `page:edit` | `HomePage.tsx:297` | CMS-deferred; prices stay catalog-bound (BLOCK-08) |
| florist story heading, paragraphs, image, alt | Page(home) section | `story.*` | home | `page:edit` | `HomePage.tsx:617-641` | CMS-deferred (phase 4) |
| Delivery/service benefit items | Page(home) section | `benefits[]` | home | `page:edit` | `HomePage.tsx:509` | CMS-deferred (phase 4) |

## All products `/collections/all/` and each collection `/collections/{slug}/`

| Visible element | CMS entity | Field | Template | Permission | Evidence today | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Collection name in heading and breadcrumb | Collection | `title` | collection | `collection:edit` | `catalog.ts` `REAL_COLLECTIONS` | CMS |
| Intro paragraph, SEO title/description/body | Collection | `seo.*`, `intro` | collection | `collection:edit` | `collection-seo.json` | CMS |
| Banner / cover image | Collection | `coverAssetId`, `bannerAssetId` | collection | `collection:edit` | none rendered today | CMS |
| Membership of the collection | Collection | `membershipMode`, `manualIds[]`, `rules` | collection | `collection:edit` | `catalog.ts` — all 60 in every collection | CMS |
| Filter chips and labels | Collection | `visibleFilters[]` | collection | `settings:edit` | `business.ts` `BANDS_F` | CMS-deferred (phase 7) |
| Sort options and page size | SiteSettings | `sortOptions[]`, `pageSize` | collection | `settings:edit` | `business.ts` `SORT_OPTIONS`, `PAGE_SIZE` | CMS-deferred (phase 7) |
| Product card title, image, price, badge | Product / ProductVariant | `title`, `imageIds[]`, `priceVnd` | collection | `catalog:read` | `ProductCard.tsx` | Calculated |
| "Từ" prefix with multiple priced variants | — | derived from variant prices | collection | — | `money.ts` `fromPriceVnd` | Calculated (CAT-05) |
| Empty-state copy | Collection | `emptyStateMode`, `emptyStateText` | collection | `collection:edit` | `CollectionPage.tsx` | CMS |

## Product detail `/products/{slug}/`

| Visible element | CMS entity | Field | Template | Permission | Evidence today | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Name, slug | Product | `title`, `slug` | product | `catalog:edit` | `catalog.ts` `toProduct()` | CMS |
| Gallery, per-image alt, focal point | Product + MediaAsset | `imageIds[]`, `altText`, `focal` | product | `catalog:edit` / `media:edit` | `catalog.ts` `imagePaths` | CMS |
| Description, care notes, substitution note | Product | `description`, `careNotes` | product | `catalog:edit` | empty for all 60 today | CMS |
| Variant name, option values, availability | ProductVariant | `label`, `availability`, `leadHours` | product | `catalog:edit` | `catalog.ts` single "Tiêu chuẩn" variant | CMS |
| Price, compare-at, sale window | ProductVariant | `priceVnd`, `compareAtVnd`, `salePriceVnd`, `saleStart`, `saleEnd` | product | `catalog:price` (field group) | `flower-prices.json` | CMS, price-gated (PERM-05) |
| Displayed payable amount | — | effective price from published variant + server time | product | — | `ProductPage.tsx` | Calculated (CAT-04/07) |
| Delivery slots, lead time, holiday slot | SiteSettings | `delivery.slots`, `leadHours`, `holidaySlot`, `holidays` | product | `settings:edit` | `business.ts` `DELIVERY` | CMS-deferred (phase 7) |
| Ward/district options | SiteSettings | `serviceAreas` | product | `settings:edit` | `wards.json` | CMS-deferred (phase 7) |
| Related products | Product | `relatedIds[]` | product | `catalog:edit` | derived today | CMS |
| Badges, featured, display priority | Product | `badges[]`, `featured`, `priority` | product | `catalog:edit` | `ProductCard.tsx` | CMS |
| Structured data `Product`/`Offer` | — | published price and availability | product | — | `ProductPage.tsx:235` | Calculated (SEO-03) |
| Printed price visible inside the photograph | MediaAsset | `embeddedPriceVnd`, `containsPrintedPrice` | product | `media:edit` | `public/img/hoa/*.jpg` | CMS, warning only (IMPORT-05) |

## Cart drawer, order handoff, confirmation

| Visible element | CMS entity | Field | Template | Permission | Evidence today | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Headings, labels, empty state, help text | UIString | keyed strings | cart | `copy:edit` | `CartDrawer.tsx` (10 literals) | CMS-deferred (phase 4) |
| Line quantity validation, merge identity, subtotal | — | cart domain | cart | — | `features/cart/cart.ts` | Source-owned: line identity and totals are application behaviour (§6). |
| Zalo handoff instructions and paste steps | UIString | keyed strings | handoff | `copy:edit` | `ZsSheet.tsx` (9 literals) | CMS-deferred (phase 4) |
| Generated order message body | UIString templates | `order.single`, `order.multi` | handoff | `copy:edit` | `order/messages.ts` (10 literals) | CMS-deferred; placeholders stay typed (COPY-03) |
| Contact channels, phone, Zalo link | SiteSettings | `contact.*` | global | `settings:edit` | `business.ts` `SHOP` | CMS |
| Shipping amount line | — | always "shop confirms" | cart | — | `cart.ts` `SHIPPING_UNKNOWN` | Calculated, never zero (BIZ-04) |

## Policies, FAQ `/pages/{slug}/`

| Visible element | CMS entity | Field | Template | Permission | Evidence today | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Policy title, body sections, effective date | Page(policy) | `sections[]`, `effectiveDate` | policy | `page:edit` | `policies.json` | CMS-deferred (phase 4) |
| Policy SEO title/description | Page(policy) | `seo.*` | policy | `page:edit` | `policies.json` | CMS-deferred |
| Policy list and slugs | Route registry | routes | policy | `route:edit` | `business.ts` `POLICY_ROUTES` | CMS-deferred |

## Global header, mobile menu, footer, floating contact

| Visible element | CMS entity | Field | Template | Permission | Evidence today | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Logo wordmark text, aria-label | GlobalContent(header) | `logoText`, `logoAssetId` | global | `global:edit` | `SiteHeader.tsx:55-57` | CMS-deferred (phase 7) |
| Primary nav items and order | Navigation(header) | `items[]` (entity references) | global | `global:edit` | `SiteHeader.tsx:9-13` | CMS-deferred (phase 7) |
| Cart button label and aria-label | UIString | `cart.open`, `cart.aria` | global | `copy:edit` | `SiteHeader.tsx:82,95` | CMS-deferred |
| Footer columns, links, legal group | GlobalContent(footer) | `columns[]` | global | `global:edit` | `SiteFooter.tsx` JSX text | CMS-deferred (phase 7) |
| Copyright and "designed by" line | GlobalContent(footer) | `copyright` | global | `global:edit` | `SiteFooter.tsx:125` | CMS-deferred |
| Address, phone, map link, social links | SiteSettings | `business.*` | global | `settings:edit` | `business.ts` `SHOP` | CMS |
| Google review count and score | SiteSettings | `reviews.count`, `reviews.score` | global | `settings:edit` | `business.ts` `SHOP` | CMS — values only; never invented (SEO-03) |
| Floating contact channels and position | GlobalContent(floating) | `channels[]`, `position` | global | `global:edit` | `ZsSheet.tsx:94` | CMS-deferred (phase 7) |

## Error and system states

| Visible element | CMS entity | Field | Template | Permission | Evidence today | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 404 heading, explanation, recovery CTAs | Page(404) | `title`, `body`, `ctas[]` | 404 | `page:edit` | `NotFoundPage.tsx:11-21` | CMS-deferred (phase 4) |
| HTTP 404 response code | — | server response | 404 | — | static host fallback | Source-owned: an editable 404 page must still return not-found (SEO-08). |
| Reserved admin and API route prefixes | Route registry | `kind = reserved` | — | `route:edit` | `/admin`, `/api` | CMS |

## Theme and appearance

| Visible element | CMS entity | Field | Permission | Evidence today | Status |
| --- | --- | --- | --- | --- | --- |
| All colour, type, spacing, radius, shadow tokens | ThemeRevision | token map | `theme:edit` | `src/theme/lagom.theme.json` → generated `src/styles/tokens.css` | CMS-deferred (phase 5) |
| Font files and fallbacks | ThemeRevision | `fonts[]` | `theme:edit` | `src/styles/fonts.css`, `public/fonts/` | CMS-deferred (phase 5) |
| Admin interface styling | — | separate stylesheet | — | `src/admin/admin.css` | Source-owned on purpose: storefront theme changes must not make admin unreadable (THEME-11). |

## Calculated values that are deliberately not editable

Recording these closes COVER-04: editing copy must never change what a state means.

| Value | Rule | Location |
| --- | --- | --- |
| Effective price | published sale price inside its window, else published regular price; compare-at is display only | `server/pricing.ts` |
| Sale window | start inclusive, end exclusive, business timezone | `server/pricing.ts` |
| "Từ" starting price | minimum among priced variants | `src/lib/money.ts` |
| Delivery date eligibility | slots, lead hours, holidays, overrides | `src/features/order/delivery.ts` |
| Cart subtotal | recomputed from current published prices, never from stored snapshots | `src/features/cart/cart.ts` |
| Shipping quote | unknown until the shop confirms, never zero | `src/features/cart/cart.ts` |

## Source-owned by design

| Item | Reason |
| --- | --- |
| Section component implementations and the section library | New component types are application work (§1.1, §11 phase 4 note). |
| Variant selection and purchase controls | Protected regions; staff may rearrange slots but not remove the only price or purchase control (BLOCK-04). |
| Breakpoint structure | Arbitrary breakpoint creation is an engineering change (THEME-08). |
| Trailing-slash canonicalization and legacy query redirects | Route behaviour, not content (`App.tsx`). |
| `--af-*` token names and the `af.cart.v1`/`archC_cart` storage keys | Internal identifiers deliberately stable across the rebrand. |

## Known unreferenced legacy data

Found during the inventory; not read by any current source file. Recorded rather than silently
deleted, because they are provenance for the earlier Arch Flowers reconstruction.

| File | Note |
| --- | --- |
| `src/data/observed-data.json` | Captured reference-storefront evidence, including the old brand and 280-product catalog. |
| `src/data/owner-products.json` | 16 legacy Arch product records, superseded by the 60-item price list. |
| `src/data/text-fixes.json` | Copy overrides keyed by retired Arch slugs. |

## Register result

Every public surface above resolves to a CMS entity, a calculated rule, or a stated source-owned
reason, so COVER-01 and COVER-02 are satisfied for the surfaces that exist today.

Gap to keep visible: CMS-deferred rows are the phase 4, 5 and 7 work. Until those editors exist the
homepage, policy, cart and handoff copy stays hardcoded, which is the honest state rather than a
half-built editor behind a menu item.

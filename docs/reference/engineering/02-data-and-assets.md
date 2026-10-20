# Data, Pricing, and Assets

The model below is PROPOSED. Label observed data and synthetic fixtures separately.

## Domain types

```typescript
type MoneyVnd = number; // integer >= 0; validate at boundaries
type ProductVariant = {
  id: string;
  label: string;
  priceVnd: MoneyVnd | null;
  compareAtVnd: MoneyVnd | null;
  available: boolean;
  imageId?: string;
};
type Product = {
  id: string;
  sku: string;
  slug: string;
  title: string;
  descriptionBlocks: ContentBlock[];
  collectionSlugs: string[];
  primaryCollectionSlug: string;
  flowerTypes: string[];
  occasions: string[];
  imageIds: string[];
  pricingMode: 'fixed' | 'variants' | 'quote';
  variants: ProductVariant[];
  evidence: { sourceUrl?: string; verifiedAt?: string; isFixture: boolean };
};
type ProductSummary = Pick<Product, 'id' | 'sku' | 'slug' | 'title' | 'pricingMode'> & {
  imageId: string | null;
  fromPriceVnd: MoneyVnd | null;
  compareAtVnd: MoneyVnd | null;
  available: boolean;
};
type Collection = {
  slug: string;
  title: string;
  descriptionBlocks: ContentBlock[];
  productIds: string[];
  defaultOrder: string[];
};
type ContentBlock = {
  type: 'paragraph' | 'heading' | 'list';
  text?: string;
  items?: string[];
};
type Asset = {
  id: string;
  sourceUrl: string;
  localPath: string | null;
  width: number | null;
  height: number | null;
  alt: string;
  role: 'logo' | 'hero' | 'product' | 'icon' | 'editorial' | 'font';
  productId?: string;
  variants?: { width: number; url: string }[];
};
type DeliverySlot = {
  id: string;
  label: string;
  startLocal: string;
  endLocal: string;
  cutoffLocal?: string;
  leadTimeMinutes?: number;
};
type OrderDraft = {
  lines: CartLine[];
  buyer: { name: string; phone: string };
  recipient: { name: string; phone: string; address: string };
  paymentMethod: 'cod' | 'bank-transfer';
};
```

Import `CartLine` from the cart domain. Do not invent missing source values and set `isFixture: false`. Unverified availability may require an `unknown` enum value; the example boolean is a minimal contract for already-confirmed data.

## Evidence-backed fixtures

| SKU | Slug | Medium price, VND | Large price, VND | Source |
|---|---|---:|---:|---|
| A0302 | bo-hoa-mini-xinh | 380000 | 700000 | S11 |
| A0015 | bo-hoa-cuc-tana-20-10-a037 | 750000 | 1100000 | S12 |

Product titles can change while slugs retain older names. Store SKU as a string to preserve leading zeros. Do not infer SKU A0037 from `a037` in a URL.

Create separate **synthetic** fixtures for fixed-price, quote-only, unavailable, multiple-image, long-title, and multi-collection cases. Exclude synthetic products from reference-fidelity snapshots.

## Pricing and discounts

- Store integer VND amounts and calculate before formatting.
- `null` means unknown, not zero or free.
- Starting price is the minimum eligible variant price; treatment of unavailable variants requires capture.
- Comparison prices must belong to the same variant as the sale price being compared.
- Proposed discount formula: `Math.round((compare - price) / compare * 100)`, only when `compare > price > 0`.
- Some extracted cards have comparison prices without visible badges. The display threshold is unverified. Separate `badgePolicy` from the formula rather than applying an unsupported universal rule.
- Use `vi-VN` formatting, then verify exact whitespace and currency suffix against the rendered reference. The text snapshot uses periods as thousands separators and `đ`.

Arithmetic check: 2 × 380000 + 1 × 750000 = 1510000 before shipping. This subtotal does not establish an amount paid.

## Two verified image-link URLs

| Role | URL |
|---|---|
| Homepage hero | <https://archflowers.com/archflowers-export/opt/800/bf66b560-5b08-4ceb-870f-aa600cc93779_91130f9f12de4d71858e504f5726f7c3.webp> |
| A0302 primary image | <https://archflowers.com/archflowers-export/opt/800/d4f8fdc7-8b5a-494a-bf35-58f604ebbf65_b22f123d0a20481eb0858caf15a91d2e.webp> |

The web tool opened these image links. This package does not contain a downloaded asset collection. The URL segment `800` does not establish every image's actual dimensions; inspect `naturalWidth/naturalHeight` or file metadata.

## Asset import workflow

1. Collect `currentSrc`, `src`, `srcset`, CSS backgrounds, and font requests from the rendered reference.
2. Map assets to product IDs and roles, retaining gallery order.
3. Import suitable source files when available and record source URLs, hashes, dimensions, and local paths.
4. Preserve the reference's focal points; store role-specific `object-position` where needed.
5. Responsive variants must not distort images. Do not replace large images with blurry thumbnails.
6. Prefer original SVG logos/icons over emoji or newly drawn substitutes.
7. Load correct font weights/subsets with explicit fallbacks.

## Previously cropped user photos

The earlier ZIP contains 60 flower photos with their own numbers and prices. They have not been established as this website's catalog images. Using them for the user's shop is a separate catalog-import task: assign separate SKUs, confirm prices, and take metadata from those images. That dataset would no longer support data-fidelity comparisons against Arch Flowers.

## Catalog completeness

Maintain a manifest of every imported SKU/slug, its source, URL-access status, and image count. Completion requires reconciliation of product IDs and collection membership, not merely creating 292 placeholder records to match a displayed total.

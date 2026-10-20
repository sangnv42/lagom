# Homepage

Route: `/`; similar content was also retrieved at `/index.html`. Source: S01 in the [evidence register](../audit/02-evidence-and-decisions.md).

## Observed content structure

The extracted content includes primary navigation; an October 20 campaign hero with an image and countdown; service commitments; occasion discovery; a featured collection; popular products; budget-based navigation; reviews; delivery coverage; bespoke arrangements; and the brand story. This is the order in the text extraction, not a measured layout.

Readable CTAs lead to collections, Zalo, or Maps. The popular-products area links to `/collections/all/?s=off`; whether that query controls sorting or another behavior remains unknown. Do not implement it as sales-based sorting before verification.

## Proposed implementation requirements

Represent each section as a configurable block with `id`, `type`, `enabled`, `content`, `assetRefs`, and `linkTargets`. Preserve the confirmed order. Homepage products must use the same catalog as other pages rather than separate copies that can develop inconsistent prices.

| Block | Required data | Behavior to verify |
|---|---|---|
| Header | Logo, navigation, contact | Stickiness, mobile menu, cart entry |
| Hero | Correct image, content, CTA, campaign dates | Hydrated countdown; mobile crop |
| Service facts | Verified commitments | Icons/links versus text only |
| Occasion discovery | Collection references | List, images, layout, order |
| Featured collection | Product/collection IDs | Carousel versus grid |
| Popular products | Ordered product IDs | Meaning of `s=off` and actual order |
| Budget navigation | Bucket bounds, labels | Actual values and destination queries |
| Reviews | Rating data, review content, source | Slider versus static; do not invent reviews |
| Delivery | Areas, hours, free-delivery rule | Presentation and CTA |
| Bespoke request | Contact destination, service types | Actual anchor; whether Zalo links prefill a message |
| Story | Content, optional images | Typography, width, imagery |
| Footer | Captured content | Rendered evidence still missing |

Final headings and marketing copy must come from an authorized export or owner-provided content. Do not write replacement copy and label it as the original.

## Countdown

The crawl shows a remaining-day value, but this does not establish correct live behavior. Proposed configuration: `startsAt`, `endsAt`, `timezone`, and `expiredBehavior`. Calculate from the clock, clamp at zero, and switch to configured expired content. Test before and after the deadline. Do not hard-code the number of days in the text snapshot.

## Proposed data contract

```typescript
type HomeBlock = {
  id: string;
  type: 'hero' | 'service-facts' | 'collections' | 'products'
      | 'budget' | 'reviews' | 'delivery' | 'bespoke' | 'story';
  enabled: boolean;
  contentKey: string;
  assetIds: string[];
  collectionSlugs?: string[];
  productIds?: string[];
};
```

## Acceptance

- Every section has evidence, mapped assets, and recorded link destinations.
- Headings, imagery, and spacing are not arbitrarily replaced with template defaults.
- Expired banners do not display negative or frozen countdowns.
- Every product card opens the correct PDP from the homepage and on URL reload.
- Loading preserves section height; the hero image is not stretched.
- Desktop/mobile comparisons are completed before visual acceptance is marked done.

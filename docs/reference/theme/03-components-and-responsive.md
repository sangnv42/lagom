# UI Components and Responsive Behavior

Status: the component decomposition below is **PROPOSED**. Dimensions must come from captures. A UI kit's default appearance is not evidence of the original website's styling.

## Component contracts

| Component | Inputs | Required states | Measurements needed |
|---|---|---|---|
| SiteHeader | Logo, links, contact, cart count if present | Desktop, open mobile menu, scrolling | Height, stickiness, logo placement, border |
| SiteFooter | Policies, contact, verified links | Desktop/mobile | Actual layout; not visible in the newer text extraction |
| Hero | Image, heading, CTA, campaign | Active/expired campaign | Ratio, crop, alignment, overlay |
| SectionHeading | Eyebrow, title, introduction, link | With/without link | Font, wrapping, spacing |
| ProductCard | Product summary | Sale, multiple prices, fixed price, quote-only | Image ratio, badge, title, price, spacing |
| Price | Variant or starting price | Sale, regular, quote-only | Font, currency notation, strike-through |
| CollectionToolbar | Count, filters, sort | Default, active filters | Position, width, select/menu |
| FilterPanel | Filter schema | Open, selected, empty, reset | Actual sidebar/drawer/modal presentation |
| VariantSelector | Variants, selected ID | Available, unavailable, selected | Actual radio/chip/select presentation |
| ProductGallery | Assets, selected image | Loading, selected, zoom if present | Thumbnails, fit, navigation |
| DeliveryFields | Date, slots, selection | Invalid, disabled, no slots | Controls and error placement |
| CartSurface | Lines, totals | Empty, populated, unavailable | Actual drawer/page/modal presentation |
| ContactCTA | Approved URL/phone | Default, focus | Icon, floating placement if present |
| PolicyArticle | Title, content blocks | Default | Reading width, typography scale |

Do not add wishlists, comparisons, loyalty features, an AI chatbot, or newsletter popups without evidence that they exist in the current reference.

## States to measure

For buttons, links, and inputs, inspect default, hover, focus-visible, active, disabled, loading, and error states where applicable. Do not derive state colors by arbitrarily darkening the brand color.

For overlays, inspect panel position/width, backdrop, scroll locking, Escape/backdrop dismissal, and focus on open/close. These behaviors require direct testing. Accessibility requirements for the reconstruction are engineering baselines, not findings about the original website.

## Responsive measurement sheet

| Element | 390 px | 768 px | 1440 px |
|---|---|---|---|
| Header height/menu | Unmeasured | Unmeasured | Unmeasured |
| Container/gutter | Unmeasured | Unmeasured | Unmeasured |
| Hero layout/crop | Unmeasured | Unmeasured | Unmeasured |
| Product columns/gaps | Unmeasured | Unmeasured | Unmeasured |
| Filter presentation | Unmeasured | Unmeasured | Unmeasured |
| PDP order/gallery | Unmeasured | Unmeasured | Unmeasured |
| Cart presentation | Unmeasured | Unmeasured | Unmeasured |
| Footer columns | Unmeasured | Unmeasured | Unmeasured |

Do not fill in a guessed 2/3/4-column grid. If the prototype needs a temporary layout, configure it separately and replace it once measurements exist.

## Implementation quality

- Include a skip link. Use links for navigation and buttons for actions.
- Provide actual input labels, visible focus, and `aria-expanded` for menus/panels.
- Floating badges/cart controls must not cover other CTAs or mobile safe areas.
- Reserve image space with dimensions/aspect-ratio to reduce layout shifts.
- Loading/error images retain their footprint; do not substitute another product's image.
- Reuse components without forcing intentionally different sections into one generic card.
- Use the official logo asset where available rather than reconstructing it with text.

## Visual acceptance

Compare in this order: images → containers/columns → fonts/wrapping → spacing → colors → radii/shadows → states/motion. Confirm correct assets and fonts before patching CSS; many geometry differences originate from the wrong image or font.

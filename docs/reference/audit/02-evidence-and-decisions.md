# Evidence and Decisions

## Reference sources

| ID | URL | Evidence used |
|---|---|---|
| S01 | <https://archflowers.com/> | Homepage content order, navigation, delivery information |
| S02 | <https://archflowers.com/collections/all/> | Displayed catalog total, cards, filter/sort/load-more in text |
| S03 | <https://archflowers.com/collections/qua-20-10/> | Occasion collection; copy mentions scheduling delivery |
| S04 | <https://archflowers.com/collections/hoa-khai-truong/> | Opening-event collection; card/banner messages |
| S05 | <https://archflowers.com/collections/hoa-sinh-nhat/> | Birthday collection |
| S06 | <https://archflowers.com/collections/bo-suu-tap-moi/> | New collection; copy mentions asking for prices |
| S07 | <https://archflowers.com/collections/hoa-bo/> | Bouquet collection; size variants |
| S08 | <https://archflowers.com/collections/hoa-gio/> | Basket collection; copy mentions delivery dates/slots |
| S09 | <https://archflowers.com/collections/hoa-hop/> | Boxed-flower collection |
| S10 | <https://archflowers.com/collections/hoa-cuoi/> | Wedding collection; fixed and variable prices |
| S11 | <https://archflowers.com/products/bo-hoa-mini-xinh/> | A0302, two size prices, breadcrumb, image, recommendations |
| S12 | <https://archflowers.com/products/bo-hoa-cuc-tana-20-10-a037/> | A0015, sizes/prices, description, recommendations |
| S13 | <https://archflowers.com/pages/chinh-sach-doi-tra/> | Handling damaged flowers; shipping fees confirmed by the shop |
| S14 | <https://archflowers.com/pages/chinh-sach-bao-mat/> | Buyer/recipient information; browser storage of cart and buyer details |

Each source supports only the stated observations. Text does not establish APIs, frameworks, or CSS. See the coverage inventory for cached sources and redirects.

## Decisions that affect implementation

| ID | Conclusion | Evidence label | Consequence |
|---|---|---|---|
| D01 | Use the newer content group as the baseline | PROPOSED, based on source freshness | Do not recreate old account/blog navigation from cached pages |
| D02 | Products have multiple types and collections | OBSERVED-TEXT | Model products and collections as many-to-many |
| D03 | Cart and buyer details are described as browser-persisted | OBSERVED-TEXT S14 | Persistence is needed; actual keys, TTL, and mechanism are unknown |
| D04 | Prices vary by size | OBSERVED-TEXT S11/S12 | Price belongs to a variant; cards use a defined starting-price rule |
| D05 | Shipping charges may require shop confirmation | OBSERVED-TEXT S13 | An unknown charge must not default to zero |
| D06 | No verified integrated payment gateway | UNVERIFIED | Do not automatically add Stripe, MoMo, or VNPay |
| D07 | Theme measurements are unavailable | UNVERIFIED | Do not invent original font names or hex colors |
| D08 | Current backend/CMS is unknown | UNVERIFIED | This guide's architecture is a reconstruction choice |
| D09 | Extracted collection text includes both products and an empty message | OBSERVED-TEXT S02 | Hidden states may be included; do not render both simultaneously |
| D10 | Countdown text does not establish correct live behavior | UNVERIFIED | Verify hydrated UI, timezone, and campaign timing |

## Track fidelity in four separate dimensions

1. **Structure:** templates, sections, navigation, and routes.
2. **Data:** correct products, images, order, variants, prices, and confirmed content.
3. **Appearance:** fonts, colors, dimensions, spacing, image cropping, and responsive behavior.
4. **Behavior:** filtering, variant selection, cart, scheduling, validation, and ordering.

Structural completion does not establish completion in all four dimensions. Acceptance reports must state each dimension's status.

## Additional evidence, in priority order

| Priority | Evidence needed | Gap it closes |
|---|---|---|
| P0 | Full-page desktop/mobile homepage captures; stylesheets or computed-style export | Theme, header, hero, footer, spacing |
| P0 | Collection before/after filtering, sorting, and load-more | Query schema, cards, pagination, states |
| P0 | Product before/after variant selection; ordering controls open | PDP, variants, form, CTA |
| P0 | Empty/populated cart and pre-submission ordering steps | Cart/checkout structure and persistence |
| P1 | URLs after all catalog items are loaded | Complete product-route inventory |
| P1 | Asset manifest, font files, logo/vector | Brand identity and fidelity |
| P1 | Small viewports with menus/overlays open | Responsive behavior, focus, stacking |

If the site owner supplies source code or an export, prioritize it and record its date/version. Measurements inferred only from screenshots are **visual estimates**; fonts still require CSS or computed-style verification.

## Technical references for capture

- [MDN — getComputedStyle](https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle): resolved styles for DOM elements and pseudo-elements.
- [Playwright — Page](https://playwright.dev/docs/api/class-page): navigation, evaluation, and screenshots.
- [Vite — Getting Started](https://vite.dev/guide/): reference for the proposed prototype stack.

No rendered browser session succeeded during this audit. Direct HTTP access from the environment was denied; the available observations came from the web-reading tool.

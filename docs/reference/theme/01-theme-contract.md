# Theme Contract — Highest Priority

## Status

**The original theme has not been extracted.** This audit does not include page screenshots or computed CSS. Marketing language describing a premium service does not establish a cream background, olive-green palette, serif font, or any other visual style.

This document defines the schema, measurement process, and application of the theme. `null` means missing evidence, not a default value. If temporary styles are needed to run the application, put them in `prototype.theme.json` and do not label them as the Arch Flowers theme.

## Proposed theme schema

```json
{
  "name": "archflowers-reference",
  "version": "0.1.0",
  "verificationStatus": "unmeasured",
  "referenceUrl": "https://archflowers.com/",
  "capturedAt": null,
  "color": {
    "page": null,
    "surface": null,
    "surfaceAlt": null,
    "text": null,
    "muted": null,
    "brand": null,
    "onBrand": null,
    "border": null,
    "sale": null,
    "focus": null,
    "overlay": null,
    "error": null,
    "success": null
  },
  "font": {
    "body": { "family": null, "weight": null, "size": null, "lineHeight": null },
    "display": { "family": null, "weight": null, "size": null, "lineHeight": null },
    "heading": { "family": null, "weight": null },
    "price": { "family": null, "weight": null },
    "label": { "family": null, "weight": null, "letterSpacing": null }
  },
  "space": { "xs": null, "sm": null, "md": null, "lg": null, "xl": null, "section": null },
  "radius": { "button": null, "input": null, "card": null, "hero": null, "panel": null },
  "shadow": { "header": null, "card": null, "overlayPanel": null },
  "layout": { "containerMax": null, "gutter": null, "headerHeight": null, "cardGap": null },
  "media": { "productRatio": null, "heroRatio": null, "fit": null, "position": null },
  "breakpoints": [],
  "responsiveOverrides": {},
  "motion": { "duration": null, "easing": null, "hoverTransform": null },
  "layers": { "header": null, "overlay": null, "panel": null, "toast": null },
  "evidence": {}
}
```

This is an implementation schema; it does not imply that the original source has equivalent variables. Do not force distinct sections to share a token when the reference intentionally treats them differently.

## Token measurement register

| Group | Record | Measurement location |
|---|---|---|
| Backgrounds | Solid colors, alpha, gradients, background images | Body, sections, panels |
| Typography | Loaded font, fallback, weight, size, line-height, tracking | Hero, headings, card title, body, price, labels |
| Brand colors | Default, hover, active, disabled, focus | Primary CTA, links, selected chips |
| Borders | Width, color, style | Inputs, cards, dividers, drawers |
| Spacing | Padding, margin, and gap on each axis | Containers, sections, cards, forms |
| Shape | All four corner radii, clipping, border | Images, buttons, badges, panels |
| Images | Natural/rendered dimensions, fit, focal point | Hero, product tiles, gallery |
| Layout | Max-width, grid tracks, columns, alignment | Header, hero, catalog, PDP |
| Layers | Position, offsets, z-index, backdrop | Sticky header, popup, floating CTA |
| Motion | Duration, easing, property, reduced-motion behavior | Hover, menu open/close |

Record `sourceUrl`, `selector`, `viewport`, `state`, `capturedAt`, and `method` for each value. Tokens without evidence remain `unverified`.

## CSS mapping

Generate `tokens.css` after real values have been populated. Avoid scattering raw hex colors and unexplained numbers throughout components.

```css
/* Use only after the token generator has emitted measured values. */
body {
  color: var(--af-color-text);
  background: var(--af-color-page);
  font-family: var(--af-font-body-family);
  font-size: var(--af-font-body-size);
  line-height: var(--af-font-body-line-height);
}
.af-container {
  width: calc(100% - 2 * var(--af-layout-gutter));
  max-width: var(--af-layout-container-max);
  margin-inline: auto;
}
.af-button-primary {
  color: var(--af-color-on-brand);
  background: var(--af-color-brand);
  border-radius: var(--af-radius-button);
}
```

The generator must reject required `null` values rather than silently substitute a different theme. Prototype mode is the exception: it uses a separate temporary theme and explicitly records that fact in QA documentation.

## Vietnamese typography

- Identify the actual font through computed CSS and font requests, not visual guesses alone.
- Verify that each weight has a corresponding font file; synthetic bold can change text width.
- Check diacritics, uppercase text, currency symbols, and dashes.
- Compare heading/card line wrapping before adjusting container dimensions.
- Load a subset that supports Vietnamese and inspect before/after `document.fonts.ready`.
- Measure mobile independently rather than scaling every desktop font by one factor.

## Responsive behavior

Suggested QA viewports: 390×844, 768×1024, and 1440×1000; also inspect 360 px and 1920 px widths. These are test sizes, **not discovered breakpoints**.

At each viewport, record column count, gutters, card ratios, hero direction, PDP order, header behavior, and panels. Resize the viewport to locate layout changes; record actual media queries when CSS can be inspected.

## Theme acceptance criteria

- Correct fonts and assets are available with supporting evidence.
- Every required token has a value and provenance.
- Desktop/mobile comparisons cover the header, hero, product card, PDP, and at least one form or overlay.
- Remaining differences are documented; do not claim complete fidelity without measurements.
- Changing a shared token updates all relevant templates consistently.

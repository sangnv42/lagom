# Phase 4 — Homepage

## Goal

Reproduce homepage structure and appearance with content/data separated from JSX or templates.

## Read first

[Home](../pages/01-home.md), [Theme](../theme/01-theme-contract.md), and the asset manifest.

## Tasks

1. Build homepage blocks in reference order within the established header/footer.
2. Use the correct hero image, ratio, focal point, and per-viewport crop.
3. Implement campaign configuration and a timezone-aware countdown with expiration behavior.
4. Build collection, product, and budget blocks using ordered data.
5. Implement reviews, delivery, bespoke requests, and story sections using confirmed content.
6. Connect CTAs to verified routes, anchors, and contacts; check `s=off` separately.
7. Verify loading, overflow, below-the-fold images, and mobile safe areas.

## Deliverables

Homepage view, content configuration, reusable section blocks, campaign logic, CTA mapping, and QA notes.

## Acceptance

- Sections keep reference order without invented marketing content.
- Images and text wrapping match the reference at standard viewports.
- Countdown works before/after deadlines without hard-coded crawl values.
- CTAs/cards open correct destinations; back navigation follows confirmed behavior.
- Reviews and counts are not fabricated.

## Implementation prompt

```text
Execute Phase 4 using pages/01-home and reference captures.
Use the confirmed theme, assets, section order, typography, and destinations.
Separate campaign/content configuration from views. Verify countdown behavior with
a controlled clock and check responsive layouts. Do not redesign the hero or use
arbitrary replacement flower photos.
```

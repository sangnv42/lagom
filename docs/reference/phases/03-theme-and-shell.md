# Phase 3 — Theme, Primitives, and Application Shell

## Goal

Establish the visual foundation before reproducing it across every page. This phase is central to the requirement for an exact match.

## Read first

[Theme contract](../theme/01-theme-contract.md), [Components](../theme/03-components-and-responsive.md), and phase 1 measurements.

## Tasks

1. Map measured values into a theme JSON with provenance and component exceptions.
2. Import verified font weights/subsets, logo, and icons.
3. Generate CSS variables and responsive rules from measurements.
4. Implement buttons, links, typography, inputs/selects, badges, prices, containers, and section spacing.
5. Reproduce header, navigation, mobile menu, and footer from screenshots, not old cached content.
6. Add an internal `/dev/theme` state gallery; exclude it from sitemap/production if unnecessary.
7. Compare identical viewports with loaded fonts and correct assets. Fix shared tokens rather than patching every page separately.

## Deliverables

`archflowers.theme.json`, `tokens.css`, `fonts.css`, UI primitives, SiteHeader/SiteFooter, measurement-to-token mappings, and internal QA comparisons.

## Acceptance

- No required theme values remain null when the phase is marked complete.
- Font substitutions are not silently accepted as exact matches.
- Header/menu and control states match captured desktop/mobile references.
- Temporary themes remain separate and are never described as the real theme.
- Components use tokens unless a documented exception is justified.

## Implementation prompt

```text
Execute Phase 3 using measured tokens and reference captures.
Prioritize correct fonts, assets, containers, wrapping, and spacing before effects.
Do not invent a palette or substitute a UI kit's default theme. If measurements
are missing, implement token wiring/schema and leave the visual gate incomplete.
After desktop/mobile comparison, update token evidence and the handoff.
```

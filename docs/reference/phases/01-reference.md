# Phase 1 — Confirm Reference and Scope

## Goal

Turn the partial audit into a measurable acceptance baseline, especially for the theme and ordering flow.

## Read first

- [Coverage](../audit/01-coverage-and-routes.md)
- [Evidence](../audit/02-evidence-and-decisions.md)
- [Capture guide](../theme/02-capture-reference.md)

## Tasks

1. Select a current-version snapshot and record timestamp, locale, timezone, and viewport.
2. Verify legacy and trailing-slash URLs in a browser; do not mix cached content into the baseline.
3. Capture homepage, collections, PDP, menu, cart/order, and policies on desktop/mobile.
4. Export computed styles and collect available CSS, fonts, logo, and image manifests.
5. Load every collection fully, merge product routes, and visit each route. Record status rather than merely counting links.
6. Record filter keys/options, sorting, load-more, default variants, cart presentation, and submission destination.
7. Do not place real orders during the audit. Use staging or a supplied demo to inspect post-submission screens.

## Deliverables

Route manifest, asset manifest, reference captures, theme measurements, interaction log, and open questions. These may be JSON, images, and Markdown in the implementation repository; they are not claimed to exist in the current package.

## Acceptance

- Every template has screenshots; every collected catalog URL has its own status.
- Theme evidence includes measurements and font sources, not only a visual impression.
- The order-flow diagram reflects observed interactions.
- Blocked areas have specific reasons and scope; gaps are not filled with guesses.

## Implementation prompt

```text
Execute Phase 1 in docs/reference, using the current site as the baseline.
Verify the audited routes and collect computed styles, assets, screenshots,
and an interaction log. Do not mix legacy data into the new theme or place real orders.
Record URL/state/evidence for each conclusion. If access fails, complete what can
be verified and update the gap log; do not claim exhaustive crawling or measured tokens.
```

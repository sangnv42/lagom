# Verification and Completion Criteria

## Three acceptance gates

| Gate | Required evidence | Current package status |
|---|---|---|
| Evidence | Routes, data, screenshots, style measurements | Partial text/routes; visual/runtime evidence missing |
| Functional | Main flows and meaningful edge-case results | Not implemented |
| Visual | Reference comparisons at identical viewports/states | Rendered reference unavailable |

A successful build does not pass the visual gate.

## Meaningful functional checks

| ID | Scenario | Expected result |
|---|---|---|
| R01 | Open collection/PDP directly and reload | Correct content; no hosting-induced 404 |
| R02 | Aliases and slash normalization | Correct canonical destination; no loop |
| C01 | Change filters while an earlier request is pending | Latest result wins; correct count |
| C02 | Load more repeatedly or click quickly | No duplicate cards or ordering loss |
| C03 | Empty results versus request failure | Separate states |
| P01 | Change A0302 medium/large | 380000/700000 |
| P02 | Change A0015 medium/large | 750000/1100000 |
| P03 | Quote-only or unavailable product | No zero-price purchase |
| K01 | Same variant with different messages | No incorrect merging |
| K02 | Reload or corrupt storage JSON | Correct restoration or recovery |
| K03 | 2×380000 + 750000 | Subtotal 1510000 |
| D01 | Cross midnight in Vietnam | Date eligibility does not drift with UTC |
| D02 | Pass cutoff while the form remains open | Expired slot rejected; reselection offered |
| D03 | Ordinary day versus holiday | Correct configured slot overrides |
| O01 | Repeat submission with API adapter | One order for the same idempotency key |
| O02 | Open Zalo or copy a summary | No false order-success message |
| A01 | Open/close menu or panel with keyboard | Appropriate focus and Escape behavior where applicable |
| A02 | Mobile field error | Visible, readable, does not obscure the CTA |

Checks without reference behavior are PROPOSED acceptance criteria. Update expectations after capture rather than treating the tests as evidence of the original behavior.

## Visual comparison

Match URL, viewport, DPR, browser, loaded fonts, assets, data, and state. Disable animation for QA screenshots and fix the campaign clock/fixtures in the reconstruction to reduce noise. Do not conceal mismatches by masking reference regions; mask only genuinely variable content and document the reason.

Fix differences in this order:

1. Incorrect logos, images, or fonts.
2. Incorrect containers, columns, hero/product image ratios.
3. Incorrect line wrapping and card heights.
4. Incorrect gaps, padding, and margins.
5. Incorrect colors, borders, radii, and shadows.
6. Incorrect hover, focus, drawers, sticky behavior, and mobile safe areas.

Do not use one aggregate pixel-diff score to ignore obvious hero/header defects. Set numerical tolerances after establishing a baseline; do not invent a similarity percentage without one.

## QA report template

```markdown
### Route/state
- Reference URL:
- Reference capture date:
- Viewport/DPR/browser:
- Reference screenshot:
- Local screenshot:
- Functional result:
- Visual differences:
- Missing evidence:
- Next fix:
- Gate: pass / fail / blocked by evidence
```

## SEO and operation

- Provide appropriate title, description, and canonical metadata for each template/slug.
- Product structured data must contain accurate pricing/availability; quote-only does not mean a zero price.
- Include only existing canonical routes in the sitemap, not failed discovery URLs.
- Supply image dimensions and suitable alt text. Lazy-load below-the-fold images when content remains accessible.
- Check slow-network behavior and large layout shifts caused by fonts/images.
- Checked routes should have no console errors, broken internal links, or hydration errors.

## Definition of done

Every route in the manifest has a result. The dataset does not pass placeholders off as real data. Theme tokens have provenance, captured flows are reproduced, core tests pass, desktop/mobile comparisons are completed, and remaining differences are documented. Missing CSS/screenshots or checkout evidence must remain visible in the release status.

# Master Prompt for a Coding Agent

Copy the following block into the coding agent after placing this package in the repository. Replace `{PHASE}` with the phase to execute. You may request consecutive phases where their inputs are available.

```text
Reconstruct https://archflowers.com/ using the documents in docs/reference/.
The goal is fidelity to the current site's structure, theme, images, responsive
behavior, and interactions. This is not a redesign exercise.

Execute Phase {PHASE} in docs/reference/phases/00-roadmap.md.

Start by:
1. Reading the README, latest handoff, and current phase document.
2. Inspecting the repository, stack, data, and assets; retain a suitable existing stack.
3. Reading only the additional relevant specifications instead of repeatedly loading
   the entire repository and documentation set.

Evidence rules:
- OBSERVED-TEXT establishes content, not colors, fonts, layout, or interactions.
- LEGACY-CACHE does not define the current theme.
- UNVERIFIED must remain unknown until evidence is available.
- PROPOSED denotes an implementation choice; compare it with the reference when
  it affects fidelity.
- Record newer source/CSS/screenshots and update affected decisions.
- Do not invent original hex colors, fonts, breakpoints, checkout flows, or APIs.

Visual priorities:
- Correct logo, images, fonts, containers, image ratios, line wrapping, spacing,
  and mobile layout.
- Use provenance-backed theme JSON/CSS variables. Keep temporary themes separate.
- Do not accept default UI-kit styles, emoji substitutes, or approximate photos
  as matching the reference.
- Do not add gradients, glass effects, shadows, rounding, or animation absent
  from the reference.

Functional priorities:
- One source of truth for products, variants, collections, and prices.
- Canonical internal paths with working deep-link reloads.
- Integer VND calculations; quote-only is not zero-price.
- Do not merge cart lines with different delivery/message configurations.
- Use Vietnam local time for delivery and revalidate cutoffs on submission.
- Opening contact is not order success. Test ordering with local/mock data.
- Do not add authentication, admin tools, blogs, or gateways solely because they
  appear in cached content or seem plausible.

Execution:
- Complete the parts of the phase supported by available inputs.
- Record specific missing evidence and continue independent work where possible;
  do not mark visual verification complete without evidence.
- Keep changes understandable, components reusable, and configuration outside views.
- Run checks appropriate to the changed risks; avoid tests that merely repeat code.
- Update the handoff after the phase: files changed, evidence, tests, gaps, next tasks.

Report implemented, functionally verified, and visually verified separately.
Do not claim the entire site is cloned while route, data, theme, or order evidence
remains incomplete. Keep the storefront in Vietnamese unless explicitly instructed
to localize it; these implementation documents are in English.
```

## Resume in a new session

```text
Continue from docs/reference/prompts/handoff-current.md.
Read the handoff, current phase document, and relevant code first.
Do not redo verified work. Prioritize the next task with complete inputs.
Preserve the reconstruction goal and the master prompt's theme/evidence constraints.
```

## Fix visual differences

```text
Compare the supplied reference and reconstruction screenshots at matching
viewports/states. List evidence-backed differences in this order: assets/fonts,
geometry, typography, spacing, colors, radii/shadows, interactions.
Fix differences within that scope. Do not redesign or change copy to hide wrapping
problems. Recapture after changes and report what matches and what still differs.
Do not infer an exact font from a screenshot alone.
```

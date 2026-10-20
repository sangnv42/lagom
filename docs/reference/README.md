# Arch Flowers — Website Reconstruction Guide

Audit date: **October 20, 2026** · Reference website: <https://archflowers.com/> · Storefront language: Vietnamese · Documentation language: English.

## Goal

Reconstruct the website's current appearance, content, routes, and behavior. Prioritize theme fidelity, imagery, typography, layout, and responsive behavior. Implement the application through phases with explicit deliverables and acceptance criteria.

**Status: an implementation guide based on a partial audit; not a verified pixel-perfect specification.** The audit retrieved text for the homepage, nine collections, two product pages, and two policies from extracts reported as crawled that day. It also checked legacy URLs, redirects, and inaccessible routes. It did not visit all 292 products or inspect rendered layouts, CSS, JavaScript, or the actual checkout flow. The theme contract therefore has a complete structure, while unmeasured values remain `null`.

Do not use cached content from the old interface to fill gaps in the new interface. Do not describe an invented palette as the Arch Flowers theme.

## Reading order

| Document | Purpose |
|---|---|
| [audit/01-coverage-and-routes.md](audit/01-coverage-and-routes.md) | Attempted routes, results, current/legacy content, and limitations |
| [audit/02-evidence-and-decisions.md](audit/02-evidence-and-decisions.md) | Sources, established facts, and unresolved questions |
| [theme/01-theme-contract.md](theme/01-theme-contract.md) | Theme conventions, token schema, CSS mapping, and typography |
| [theme/02-capture-reference.md](theme/02-capture-reference.md) | Capturing computed styles, dimensions, and CSS variables |
| [theme/03-components-and-responsive.md](theme/03-components-and-responsive.md) | Component contracts and responsive measurements |
| [pages/01-home.md](pages/01-home.md) | Homepage structure |
| [pages/02-collections.md](pages/02-collections.md) | Collections, filtering, sorting, and load-more behavior |
| [pages/03-product.md](pages/03-product.md) | Product details, variants, and contact actions |
| [pages/04-cart-and-order.md](pages/04-cart-and-order.md) | Cart, delivery, and order handoff states |
| [pages/05-policies-and-redirects.md](pages/05-policies-and-redirects.md) | Policy pages and legacy URL compatibility |
| [engineering/01-architecture.md](engineering/01-architecture.md) | Proposed architecture for the reconstruction |
| [engineering/02-data-and-assets.md](engineering/02-data-and-assets.md) | Data model, pricing, images, and fixtures |
| [engineering/03-validation.md](engineering/03-validation.md) | Functional checks, visual fidelity, and release criteria |
| [phases/00-roadmap.md](phases/00-roadmap.md) | Implementation sequence and dependencies |
| [prompts/01-master-prompt.md](prompts/01-master-prompt.md) | Initial instructions for a coding agent |
| [prompts/02-handoff.md](prompts/02-handoff.md) | Handoff template for subsequent sessions |

Phase files `01` through `09` describe individual implementation steps. All deliverables in this package are Markdown. JSON, CSS, TypeScript, and JavaScript examples appear in code blocks for use in the implementation repository.

## Evidence labels

- **OBSERVED-TEXT**: retrieved page content; does not establish presentation or interaction behavior.
- **OBSERVED-REDIRECT**: a destination reported by the retrieval tool; the HTTP 301/302 status was not verified.
- **LEGACY-CACHE**: an older extraction that must not define the current theme.
- **UNVERIFIED**: insufficient evidence or an interaction that was not tested.
- **PROPOSED**: an implementation decision in this guide, not a finding about the original source code.

## Starting implementation

1. Place this directory under `docs/reference/` in the repository.
2. Use the master prompt and specify the current phase.
3. Complete reference capture before finalizing the theme. If the environment cannot open the website, work can still proceed on data, routing, and pure domain logic; visual acceptance remains incomplete.
4. Store measured tokens in `src/theme/archflowers.theme.json`, with provenance for important values.
5. Follow the roadmap dependencies. Update the handoff and remaining gaps after each phase.

## What this package does not contain

It does not include the original source code, original font files or stylesheets, a complete product image collection, a database, internal APIs, desktop/mobile screenshots, or a complete copy of all 292 products. The 60 cropped flower photos from the earlier conversation are a separate user-provided collection; do not assign them to Arch Flowers product IDs automatically.

Matching the site exactly requires desktop/mobile reference captures plus CSS or computed-style exports. The capture guide includes a workflow and scripts for obtaining this evidence on a machine that can access the website.

# Phase 8 — Content, Compatibility, and Integration

## Goal

Connect the pages into a consistent application with working direct URLs and accurate metadata.

## Read first

[Policies/redirects](../pages/05-policies-and-redirects.md), [Architecture](../engineering/01-architecture.md), and confirmed content sources.

## Tasks

1. Build both PolicyArticle pages using the current version.
2. Complete aliases and slash rules, retaining queries/anchors where verified.
3. Configure contact, phone, maps, and bank details from owner-approved settings.
4. If a backend is needed, connect the reconstruction's API rather than guessing private reference-site endpoints.
5. Add metadata, canonicals, sitemap, social previews, and accurate product data.
6. Verify shared footer/navigation, links, and error boundaries on every template.
7. Finalize content/asset manifests and report catalog gaps.

## Deliverables

Policy pages, redirect configuration, environment setup, metadata layer, and content/asset completeness report.

## Acceptance

- Legacy account/blog routes do not appear as active features if the current version only redirects them.
- Policies reflect actual persistence and checkout behavior.
- Sitemap excludes aliases and placeholder products.
- Canonical domains and contact settings match the deployment environment.
- Unavailable, 404, and network-error handling is consistent.

## Implementation prompt

```text
Execute Phase 8. Complete confirmed policies, redirects, metadata, and adapters.
Use current content or an approved export. Do not add authentication, blogs, or admin
features from legacy caches. Check direct URLs, canonicals, contact destinations,
and data completeness.
```

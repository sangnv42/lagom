# Phase 2 — Foundation, Routing, and Data

## Goal

Create a working application foundation with clear contracts so the UI does not depend on ad hoc temporary data.

## Read first

[Architecture](../engineering/01-architecture.md), [Data](../engineering/02-data-and-assets.md), and [Coverage](../audit/01-coverage-and-routes.md).

## Tasks

1. Inspect the existing repository and retain a suitable stack. For a new project, establish rendering and hosting strategy first.
2. Define product, variant, collection, asset, cart, and delivery domain types.
3. Create catalog/content repositories, A0302/A0015 fixtures, and separate synthetic fixtures.
4. Register canonical home, collection, product, policy, and not-found routes.
5. Create an evidence-based alias registry; separate slash normalization from lookup.
6. Implement VND, URL, timezone/date, and schema-validation helpers.
7. Add unstyled loading primitives and error boundaries; configure build/type checks.
8. Prepare catalog provenance manifests rather than importing 292 placeholders.

## Deliverables

A locally running repository, directly accessible routes, typed repositories, fixtures, domain helpers, and run/environment instructions. A fake finished homepage is not needed to demonstrate this phase.

## Acceptance

- Direct URL access and reloads work with the chosen hosting strategy.
- Money calculations do not use formatted strings or fractional currency values.
- SKUs/slugs retain their identities; unknown products have an explicit result.
- Mock adapters do not connect to production APIs.
- Build/type checks pass; meaningful price and route tests pass.

## Implementation prompt

```text
Execute Phase 2. Read architecture/data/coverage and inspect the repository first.
Create domain contracts, repositories, a route registry, provenance-aware fixtures,
and helpers. Keep unmeasured visual tokens unverified. Do not add out-of-scope
authentication, admin tools, or payment gateways. Verify deep-link reloads and
pricing calculations, then update the handoff.
```

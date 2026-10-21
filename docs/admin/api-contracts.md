# API Contracts (requirements §20)

Implemented in `server/`. Base path `/api`. All admin routes require an authenticated session
unless noted. Route names follow this repository's existing flat-route conventions.

## Conventions

| Concern | Rule |
| --- | --- |
| Auth | `lagom_admin` HttpOnly, SameSite=Lax, Path=/ cookie carrying an opaque session id |
| Content type | `application/json; charset=utf-8`, except media upload which is a raw body |
| CSRF | SameSite=Lax cookie plus a `X-Requested-With: LagomAdmin` header required on every mutating request |
| Idempotency | mutating publish/import requests accept `Idempotency-Key`; a replay returns the original result (PUB-11, AC-21) |
| Concurrency | draft writes send `expectedVersion`; mismatch returns `409` with both sides (EDIT-07, AC-08) |
| Errors | API-01 shape below, always with a human-readable `message` |

### Error shape

```json
{ "error": { "kind": "validation", "message": "Price must be a whole number of dong.", "fields": [{ "path": "variants[0].priceVnd", "message": "not an integer" }] } }
```

| `kind` | HTTP | Meaning |
| --- | --- | --- |
| `unauthenticated` | 401 | no or expired session |
| `unauthorized` | 403 | permitted surface, denied action, resource or field group |
| `not_found` | 404 | unknown id, or hidden because the actor may not read it |
| `validation` | 422 | schema or field failure |
| `conflict` | 409 | stale `expectedVersion`, slug or route collision |
| `rate_limited` | 429 | too many attempts |
| `server_error` | 500 | unexpected; message is generic, detail goes to the log without secrets (SEC-06) |

Restricted resources answer `404` rather than `403` where existence itself is the secret, so a
scoped role cannot enumerate titles it may not read (AC-37).

## Admin contracts

| Contract | Interface | Behaviour |
| --- | --- | --- |
| Session | `POST /api/session`, `DELETE /api/session`, `GET /api/session` | login with rate limit, logout revokes the session, `GET` returns actor, role, effective capabilities and what is `Not configured` |
| Dashboard | `GET /api/admin/dashboard` | counts from real queries only: published products, drafts, unpublished changes, scheduled releases, content issues, failed jobs (DASH-01..06) |
| Global search | `GET /api/admin/search?q=` | permitted pages, products, collections and media only |
| Content list | `GET /api/admin/{type}` | permission-filtered, paginated, with revision metadata and live status |
| Content detail | `GET /api/admin/{type}/{id}` | working revision plus published revision, versions, usages, issues |
| Save working revision | `PATCH /api/admin/{type}/{id}` | schema validation, field-group check, `expectedVersion`, new revision, audit row. Never publishes (PUB-01) |
| Create | `POST /api/admin/{type}` | new id, unpublished, draft revision |
| Duplicate | `POST /api/admin/{type}/{id}/duplicate` | new ids, draft state, unique proposed slug, no approval carried over (PAGE-06) |
| Archive / restore | `POST /api/admin/{type}/{id}/archive`, `/restore` | archive guard plus impact report (PAGE-07, AC-35) |
| History | `GET /api/admin/{type}/{id}/revisions`, `GET .../revisions/{rid}` | immutable snapshots, actor, time, summary |
| Diff | `GET /api/admin/{type}/{id}/diff?from=&to=` | field-level comparison, conspicuous for numeric and global changes (HIST-02) |
| Restore revision | `POST /api/admin/{type}/{id}/revisions/{rid}/restore` | creates a new draft; history untouched (HIST-03, AC-25) |
| Publish | `POST /api/admin/releases` then `POST /api/admin/releases/{id}/activate` | build and validate with no live mutation, then compare-and-swap the active pointer (PUB-06..PUB-11) |
| Release state | `GET /api/admin/releases/active` | active manifest and activation time |
| Media list/detail | `GET /api/admin/media`, `GET /api/admin/media/{id}` | filter by type and usage, usage counts including restricted count |
| Media upload | `PUT /api/admin/media?filename=` raw body | server-side type, dimension and size validation; original preserved; immutable version |
| Media metadata | `PATCH /api/admin/media/{id}` | alt, decorative flag, caption, focal point, notes |
| Media usages | `GET /api/admin/media/{id}/usages` | full usage list before replace or delete (MEDIA-07) |
| Media replace | `POST /api/admin/media/{id}/versions` | new immutable version, repoints current version (AC-18) |
| Media delete | `DELETE /api/admin/media/{id}` | blocked with the usage list when referenced by live content or retained revisions (AC-17) |
| Import dry run | `POST /api/admin/imports/validate` | namespace, rows, per-row decision, no writes |
| Import apply | `POST /api/admin/imports/apply` | idempotent per namespace + external key; re-run updates instead of duplicating (AC-14) |
| Import status | `GET /api/admin/imports/{id}` | progress, row errors, downloadable report (IMPORT-07) |
| Audit | `GET /api/admin/audit` | read-only, filtered by actor, action, resource, time, outcome |
| Users | `GET/POST/PATCH /api/admin/users` | Owner-only assignment, last-Owner guard (PERM-07) |
| Settings | `GET/PATCH /api/admin/settings` | business and delivery configuration through the settings revision |

## Public contracts

Public reads resolve the active release manifest only, and each response is an explicit allowlist
(API-03, API-09 in spirit).

| Interface | Returns |
| --- | --- |
| `GET /api/public/catalog` | published products with effective prices, published collections, and the release id |
| `GET /api/public/settings` | published business details, contact channels, delivery configuration |
| `GET /api/media/{assetId}/{versionId}/{filename}` | stored media bytes, so published pages can reference uploaded imagery |

Public responses never include: internal ids used only for editing, draft payloads, staff
identities, import provenance, audit rows, or any secret reference (API-03).

## Effective price

`server/pricing.ts` is the single effective-price path. Rules, in this order:

1. published `salePriceVnd` when a sale window exists and `saleStart <= now < saleEnd`;
2. otherwise published `priceVnd`;
3. `0` or null means "Liên hệ" — a quote state, never a free item (CAT-03, D05);
4. `compareAtVnd` is display information and is never the payable amount (CAT-04).

`now` is evaluated in `Asia/Ho_Chi_Minh`. The same function serves the public catalog, product
detail, cart price lookup and the order-message builder, so cards, detail page, cart and handoff all
agree (CAT-05, CAT-07, AC-12). A storefront that cannot reach the API falls back to the bundled
seed and re-validates nothing, which is why the handoff shows the price it last resolved rather than
a cached snapshot.

## Import contract

`flower_prices.json` field mapping, as required by IMPORT-01:

| Input | Destination | Rule |
| --- | --- | --- |
| `id` | `import.externalKey` | combined with namespace `lagom-price-list-2026-10` as the stable key |
| `product_number` | `printedNumber` | display-only, repeats allowed (AC-15) |
| `price_vnd` | default variant `priceVnd` | must be a non-negative integer |
| `price_label` | `import.priceLabel` | provenance only, never parsed as a price |
| `source_image` | `import.sourceImage` | traceability |
| `position` | `import.sourcePosition` | resolves repeated printed numbers |
| `cropped_image` | cover asset match | exact filename match; missing and duplicate matches reported |

Decisions per row: `new`, `unchanged`, `modified`, `invalid`. Apply is idempotent, so a second run
over the same file reports 60 `unchanged` and creates nothing (AC-14). Provisional names are visibly
provisional and unpublished, because the images carry no verified names or composition (IMPORT-04).

## Conditional modules

Absent modules expose no endpoint and no menu item, rather than an empty screen: orders, inquiries,
blog, inventory, payments, discounts and analytics. The dashboard shows content counts it can
actually query and states `Not connected` for anything else (DASH-06).

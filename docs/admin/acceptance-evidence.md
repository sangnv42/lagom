# Admin CMS — acceptance evidence (phases 1–3)

Scope: `docs/lagom-admin-cms-requirements.md` phases 1–3 — storage, auth, permissions, revisions,
audit, publish/release, admin shell, product/variant + collection editors, media library, importer,
and storefront reads of the published snapshot.

Verification was done on 2026-10-21 by three independent layers. Nothing here claims visual
verification of the admin UI — see "Not verified" below.

## How to reproduce

```bash
pnpm test                 # 51 unit tests (9 files)
pnpm build                # tsc -b && vite build && generate-seo
bash .qa-tmp/smoke.sh     # 12 acceptance checks, throwaway DB + media dir, port 8791
bash .qa-tmp/smoke-ui.sh  # 32 admin-endpoint checks the UI actually calls, port 8792
```

Both smoke scripts start their own server on an isolated database and print `passed=N failed=0`.
They are harnesses, not part of `pnpm test`.

## Layer 1 — unit tests (`pnpm test`, 51 passing)

Pre-existing storefront suites (money, catalog, query, cart, delivery, order, urls, campaign) plus
`tests/hydrate.test.ts`, which covers the published-snapshot mapping: API unreachable keeps the seed,
empty release keeps the seed, price `null` renders as a quote, collection membership is the union of
`product.collectionIds` and a manual collection's `manualIds`, a cover already present in the gallery
is not repeated, and a published product with no bound image falls back to its seed photo.

## Layer 2 — acceptance checks (`smoke.sh`, 12 passing)

| Req | What was checked | Result |
| --- | --- | --- |
| DASH-01 | Dashboard counts are live queries | `products:60`, `draftsUnpublished:61` (60 products + site settings), `mediaAssets:60` |
| AC-15 | Repeated printed numbers stay distinct | `hoa-39/40/41` **and** `hoa-39b/40b/41b`, 60 total, no collisions |
| API-02 | Mutation without the admin header | `403` |
| AC-03 / PERM-05 | Content editor writing a product | `unauthorized — Role content-editor may not edit product` |
| EDIT-05 | Draft may omit slug/sku | saved, no error; publication still blocked until they exist |
| PUB-02 | Complete product validates and activates | `activated=true`, public catalog serves "Bouquet 39 confirmed @ 777000" |
| AC-21 | Replaying the idempotency key | second activate reports already-active, no double publish |
| AC-08 | Save with a stale `expectedVersion` | `conflict`, server reports `currentVersion=5` |
| AC-14 | Re-importing the same file | `{new:0, unchanged:59, modified:1, invalid:0}` — the one modified row is the row the script had just edited, so change detection is content-based, not filename-based |
| AC-17 | Deleting an in-use asset | `conflict — Asset is in use by 0 live placement(s) and 1 retained revision(s). Archive it instead.` |
| AC-37 | Search respects scope | returns only the requested scope |

## Layer 3 — admin endpoint checks (`smoke-ui.sh`, 32 passing)

Every route the new screens call, driven over HTTP with a real session cookie and CSRF header:

- **Session**: capabilities include `create`, `archive`, and `price:true` for products (the UI needs
  `price` to disable price inputs for roles that may not write them), plus the `notConfigured` list.
- **Dashboard**: counts, tasks, quick actions.
- **Products**: list + total, detail with working revision, revision list, autosave PATCH, and a
  genuine concurrency conflict on a stale version.
- **Publish**: build release → activate → `/api/public/catalog` serves the edited title.
- **Collections**: create, list, detail.
- **Media**: list with `usageCount`, and delete blocked while referenced.
- **Importer**: raw validate, content-level change detection, apply is a no-op on unchanged content,
  CSV report downloads.
- **Team / audit / settings**: staff list, audit query, settings read, and the last active Owner
  cannot be demoted (PERM-07).

## Bugs this round of verification found and fixed

1. **Self-colliding SKU at publish** — validation counted the entity's own SKU as taken, so nothing
   could publish.
2. **Drafts rejected for a missing slug** — slug is now a publication blocker only (EDIT-05).
3. **Re-import always reported "modified"** — plan-time hash ignored image bindings that apply-time
   adds; payloads are now normalised before hashing.
4. **Import provenance dropped on PATCH** — a client edit silently lost `payload.import`.
5. **Dashboard mislabel** — "drafts awaiting review" implied a review workflow that does not exist;
   renamed to `draftsUnpublished`.
6. **Duplicate image in the storefront gallery** — a cover that is also the first gallery entry was
   listed twice. Caught by `tests/hydrate.test.ts`.

## Not verified / still open

- **No browser verification of the admin UI.** The screens are wired to endpoints that were all
  driven successfully over HTTP, and the app builds and typechecks, but no human has clicked through
  `/admin` in a browser. Layout, focus order and keyboard variant reordering (UX-04) are unproven.
- **Storefront hydration is unverified in a browser** for the same reason — the mapping is unit-tested
  and the public endpoint is proven, but the rendered page was not observed.
- **Collections are not seeded.** The storefront still gets its 7 collections from the bundled seed;
  an admin must create them as content before they exist in the CMS. The smoke scripts create one
  to prove the editor path.
- **Rule-mode collection preview count** (COL-03) is not implemented; the editor states this inline.
- **No review workflow, no MFA enrolment, no scheduled publishing, no pages/theme/SEO editors** —
  phases 4–7. MFA reports "not configured" instead of pretending.

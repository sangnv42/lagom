# Lagom Admin CMS — Build Plan

Source requirements: `docs/lagom-admin-cms-requirements.md`.
This document is the build order and the exit-criteria record. It is updated as phases close.

## Locked decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Scope of this build | Requirements phases 1–3 | Backend, access, catalog and media must exist before the editor, theme and release workflow have anything to act on. |
| Backend | In-repo Node server: `node:sqlite` + `node:http` | Node 24 ships a SQLite driver, so persistence and transactions need zero runtime dependencies. Server code runs directly under Node's TypeScript type stripping. |
| Typecheck of server code | `@types/node` as a devDependency | Dev-only. Keeps `tsc -b` honest over the server without adding runtime weight. |
| Auth depth now | One seeded Owner, scrypt hash, HttpOnly session, server-side revocation, login rate limit, full PERM enforcement | MFA, invitations and recovery are deferred and are reported as `Not configured` rather than faked (§2.2). |
| Content storage | Generic `entity` + immutable `content_revision` payload rows | One save path, one publish path, one diff path for every content type, which is what §19 asks for. |
| Publish mechanism | Release manifest + single active-release pointer | Required before any phase exposes a live mutation. Phase 6 later widens it into reviews and schedules. |

## What is explicitly not in this build

Recorded so no later phase mistakes an omission for an oversight.

| Item | Requirement | Status |
| --- | --- | --- |
| Reviews, approval, scheduled releases, rollback UI | phases 6 | Deferred. Save/publish exists; scheduling does not. |
| Visual section-based page editor, section library | phase 4 | Deferred. Homepage and policy copy stay source-owned for now and are listed in the ownership register as source-owned. |
| Theme token editor, theme versions | phase 5 | Deferred. Token baseline stays `src/theme/lagom.theme.json`. |
| Responsive derivative generation | MEDIA-03 | Blocked on an image codec. Server validates type, dimensions and size and keeps originals; derivative status is reported `Not configured`. |
| Rich-text editing | §8.2 | Deferred with the editor. No rich text field is exposed, so no sanitizer surface exists yet. |
| TOTP MFA, invitations, password recovery | SEC-01, SEC-02 | Deferred, surfaced as `Not configured`. |
| Orders, inquiries, blog, inventory, payments, coupons | §2.2 | Absent by design. Existing Zalo contact handoff and COD are unchanged; no dead admin toggle is added. |

## Phase 1 — Inventory and contracts

Deliverables: `content-ownership-register.md`, `data-model.md`, `permission-matrix.md`,
`api-contracts.md`, this file.

Exit criteria: every public surface has a named editable source or a documented source-owned reason.
No live mutation, no schema applied.

**Status: complete.** See the register for the surface-by-surface result.

## Phase 2 — Backend and access

| Deliverable | Location |
| --- | --- |
| Migrations, transactions, optimistic concurrency | `server/db.ts` |
| Sessions, scrypt, login rate limit | `server/auth.ts` |
| Resource/action/scope/field-group evaluation | `server/permissions.ts` |
| Immutable revisions, content hash, drafts | `server/revisions.ts` |
| Append-only audit log | `server/audit.ts` |
| Release manifest and active pointer | `server/releases.ts` |
| Router, error mapping, JSON handling | `server/http.ts` |
| Admin and public endpoints | `server/api/*.ts` |
| Server entry (static + API) | `server/index.ts` |
| Admin SPA mounted at `/admin` | `src/admin/**` |

Exit criteria, from the requirements: unauthorized direct API calls fail, and authorized drafts
persist across sessions. Both are covered by automated tests in `tests/`.

**Status: complete.**

## Phase 3 — Catalog and media

Product and variant editors, collections, media library, the 60-item importer, and provenance.

Exit criteria: all 60 items import as separate reviewable drafts, and image and price validation
works. Acceptance scenarios in scope: AC-03, AC-12, AC-14, AC-15, AC-16, AC-17, AC-18, AC-35.

**Status: complete.**

## Admin rework (admin-specs.md) — pages, navigation, promotions, micro-content, appearance

The product spec (`admin-specs.md`) required the full admin workspace. What this rework added on
top of the existing release engine:

| Area | Backend | Admin screen | Storefront wiring |
| --- | --- | --- | --- |
| Pages (§4) | `page` schema: 13 registered section types, per-section publish checks, media/collection/product referential checks, page→media usage sync | `pages/Pages.tsx`: list + section editor (add/edit/duplicate/reorder via keyboard-accessible buttons/hide/remove), collection & product selectors | `GET /api/public/site` → `src/lib/site.ts` hydrates before first paint; `home` slug replaces the bundled homepage; any page slug served at `/pages/:slug/`; hidden sections removed server-side; section ids resolved to slugs at publish |
| Appearance (§9) | `theme` schema: hex colors, radius/width ranges, enum font/spacing — no free CSS/JS | `pages/Appearance.tsx`: constrained token form + desktop/mobile preview + reset | published theme overrides CSS vars at boot |
| Navigation (§8) | `navigation` schema: link kinds (page/product/collection/anchor/url), URL/anchor validation, max one nesting level | `pages/Navigation.tsx`: header + footer-group editors | header menu, mobile menu and footer columns read published navigation, fallback to bundled menus |
| Promotions (§10) | `promotion` schema + `publicSite` window filter `[start, end)` and deterministic priority ordering | `pages/MicroContent.tsx` over shared `crud.tsx` | expired campaigns disappear with no admin action; `header-strip` promotion renders above the header |
| Testimonials / FAQs (§10) | `testimonial` / `faq` schemas; display name/answer enforced at publish only | same CRUD surface, Vietnamese labels | `testimonials` and `faq-accordion` sections render published rows only |
| Overview (§2) | dashboard counts `activePromotions`, `publishedPages`; quick actions point at real routes | Vietnamese-labelled dashboard | — |
| Shell (§2) | capabilities include `navigation` and `global` surfaces | sidebar = the spec's navigation groups, Vietnamese labels; global search in the topbar; all pre-existing screens translated to Vietnamese | — |

Editor → permission mapping: promotion/testimonial/faq share the `global` resource (content-editor
drafts them, cannot publish — enforced in `guard()`, tested in `tests/content-admin.test.ts`).

Vitest note: `vitest.config.ts` aliases `node:sqlite` through `tests/sqlite-shim.mjs` because
Vite 5's built-in module list predates the driver; without it any test importing `server/db.ts`
fails to resolve.

Still deferred after this rework (honest omissions, not oversights):

| Item | Spec ref | Status |
| --- | --- | --- |
| Draft preview inside the admin (storefront components at desktop/mobile widths) | §12 | Partial: the page screen links to the published page; an embedded draft preview would need the section renderer mounted in admin with draft-aware data sources |
| Drag-and-drop reordering | §4 | Deliberate: keyboard-accessible move buttons only |
| Media picker dialogs (image select from admin forms) | §7 | Fields take asset ids with a hint to the media library; a shared picker component is future work |
| Redirects on slug change | §8 | Not implemented; the `route` table exists for a later phase |
| Rich text | §8.2 | Plain text fields only, so no sanitizer surface exists |
| Scheduled releases | §10/§12 | Publishing is immediate; the `schedule` table remains unused (phase 6) |

## Storefront integration

Phase 3 also gives the storefront a published-data path, because a price edited in the admin that
never reaches the public site proves nothing:

1. `GET /api/public/catalog` resolves only the active release manifest and allowlists public fields.
2. Storefront boot fetch hydrates `src/data/catalog.ts` before React renders.
3. If the API is unreachable or empty, the bundled `src/data/flower-prices.json` seed is used, so the
   static build and `npm run build` keep working with no server.

Static hosting stays possible. Content publishing needs a Node process; regenerating the frontend
by hand is not required (PUB-14).

## Performance targets

The §21.3 table is a production-environment commitment (1,000 products, 100 pages, documented
hardware). Local tests prove algorithmic behaviour, not the 95th-percentile claim. Recorded as
not yet measured rather than assumed met.

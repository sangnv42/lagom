# Data Model (requirements §19)

Mapping from the required concepts to the SQLite schema implemented in `server/db.ts`. Node 24's
built-in `node:sqlite` driver is the storage engine. The database file is `lagom.db` at the repo
root (gitignored).

Design choice worth stating: most content entities share one generic pair of tables — `entity` for
identity and lifecycle, `content_revision` for immutable payloads. That gives a single save,
publish, diff and audit path for products, collections, settings and pages, which is what §19 asks
for. Users, sessions, media, releases, imports and audit stay in dedicated tables because their
lifecycle differs.

## Requirements concept to table

| §19 concept | Table |
| --- | --- |
| StaffUser | `staff_user` |
| PermissionGrant | `permission_grant` |
| ContentRevision | `content_revision` |
| Page, Product, Collection, SiteSettings, UIString, ThemeRevision, Navigation/GlobalContent | `entity` + `content_revision` |
| PageTemplate, SectionInstance, SharedSection | `entity` payloads (phase 4) |
| ProductVariant | inside the product payload |
| TaxonomyTerm | inside the collection payload plus `taxonomy_term` |
| MediaAsset / MediaVersion | `media_asset`, `media_version` |
| MediaUsage | `media_usage` |
| Route / Redirect | `route` |
| Release / ReleaseItem | `release`, `release_active` |
| Review | `review` (schema only, phase 6) |
| Schedule | `schedule` (schema only, phase 6) |
| AuditEvent | `audit_event` |
| ImportJob | `import_job`, `import_row` |

## Schema

```sql
-- Identity and lifecycle. One row per managed content object.
CREATE TABLE entity (
  id            TEXT PRIMARY KEY,
  type          TEXT NOT NULL,           -- product|collection|settings|page|ui-string|theme
  schema_version INTEGER NOT NULL,
  slug          TEXT,                    -- nullable; unique among non-archived per type
  visibility    TEXT NOT NULL,           -- unpublished|published|archived
  working_revision_id  INTEGER,          -- latest draft revision
  published_revision_id INTEGER,        -- what the active release points at
  version       INTEGER NOT NULL,        -- optimistic concurrency counter (DATA-07)
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  updated_by    TEXT
);
CREATE UNIQUE INDEX entity_slug ON entity(type, slug) WHERE slug IS NOT NULL AND visibility != 'archived';

-- Immutable snapshots. Never updated or deleted (HIST-01).
CREATE TABLE content_revision (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id   TEXT NOT NULL REFERENCES entity(id),
  entity_type TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  payload     TEXT NOT NULL,             -- JSON, validated against the registered schema
  content_hash TEXT NOT NULL,            -- sha256 of canonical payload
  parent_revision_id INTEGER,
  label       TEXT,                      -- 'draft'|'published'|'import'|'restored'
  actor_user_id TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX revision_entity ON content_revision(entity_id, id DESC);

-- Staff, sessions, scoped grants.
CREATE TABLE staff_user (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL,            -- owner|admin|content-editor|catalog-manager|publisher|viewer
  status        TEXT NOT NULL,            -- active|disabled
  password_alg  TEXT NOT NULL,            -- scrypt
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  mfa_enrolled  INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE TABLE session (
  id         TEXT PRIMARY KEY,            -- opaque 32-byte token
  user_id    TEXT NOT NULL REFERENCES staff_user(id),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE TABLE login_attempt (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  email   TEXT NOT NULL,
  at      TEXT NOT NULL,
  ok      INTEGER NOT NULL
);
CREATE TABLE permission_grant (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       TEXT NOT NULL REFERENCES staff_user(id),
  resource_type TEXT NOT NULL,           -- product|collection|page|media|settings|...
  resource_id   TEXT,                    -- NULL = every resource of that type
  action        TEXT NOT NULL,           -- read|create|edit|price|publish|...
  field_group   TEXT                     -- NULL = all non-protected fields
);

-- Releases: manifest plus the single active pointer (PUB-09).
CREATE TABLE release (
  id         TEXT PRIMARY KEY,
  status     TEXT NOT NULL,              -- draft|published|failed|canceled
  note       TEXT,
  manifest   TEXT NOT NULL,              -- {"product:abc": 41, "collection:x": 7}
  created_by TEXT,
  created_at TEXT NOT NULL,
  activated_at TEXT
);
CREATE TABLE release_active (
  key        TEXT PRIMARY KEY,            -- always 'site' for one storefront
  release_id TEXT NOT NULL REFERENCES release(id),
  activated_at TEXT NOT NULL
);

-- Media. Originals are never overwritten (MEDIA-03, MEDIA-07).
CREATE TABLE media_asset (
  id          TEXT PRIMARY KEY,
  title       TEXT,
  alt_text    TEXT,
  decorative  INTEGER NOT NULL DEFAULT 0, -- explicit decorative designation (MEDIA-05)
  caption     TEXT,
  focal_x     REAL,
  focal_y     REAL,
  notes       TEXT,
  source      TEXT,
  current_version_id TEXT,
  archived_at TEXT,
  created_at  TEXT NOT NULL,
  created_by  TEXT
);
CREATE TABLE media_version (
  id         TEXT PRIMARY KEY,
  asset_id   TEXT NOT NULL REFERENCES media_asset(id),
  filename   TEXT NOT NULL,
  storage_path TEXT NOT NULL,             -- originals/ directory
  sha256     TEXT NOT NULL,
  bytes      INTEGER NOT NULL,
  mime       TEXT NOT NULL,
  width      INTEGER,                     -- NULL when no decoder for that format
  height     INTEGER,
  processing_status TEXT NOT NULL,        -- stored|derivative-not-configured
  contains_printed_price INTEGER NOT NULL DEFAULT 0,  -- IMPORT-05
  embedded_price_vnd   INTEGER,
  created_at TEXT NOT NULL,
  created_by TEXT
);
CREATE TABLE media_usage (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id       TEXT NOT NULL REFERENCES media_asset(id),
  asset_version_id TEXT NOT NULL REFERENCES media_version(id),
  entity_id      TEXT NOT NULL,
  entity_type    TEXT NOT NULL,
  field          TEXT NOT NULL,           -- cover|gallery[2]|banner|...
  alt_override   TEXT,
  crop_override  TEXT
);
CREATE INDEX usage_asset ON media_usage(asset_id);

-- Route registry (SEO-04).
CREATE TABLE route (
  path       TEXT PRIMARY KEY,            -- normalized, trailing slash
  kind       TEXT NOT NULL,              -- entity|redirect|reserved
  entity_type TEXT,
  entity_id  TEXT,
  redirect_to TEXT,
  redirect_status INTEGER,               -- 301|308
  locale     TEXT NOT NULL DEFAULT 'vi-VN',
  created_at TEXT NOT NULL
);

-- Imports (IMPORT-01..08).
CREATE TABLE import_job (
  id            TEXT PRIMARY KEY,
  namespace     TEXT NOT NULL,
  source_kind   TEXT NOT NULL,            -- flower-prices
  source_sha256 TEXT NOT NULL,
  filename      TEXT NOT NULL,
  dry_run       INTEGER NOT NULL,
  status        TEXT NOT NULL,            -- validated|applied|failed
  rows_total    INTEGER NOT NULL DEFAULT 0,
  rows_new      INTEGER NOT NULL DEFAULT 0,
  rows_unchanged INTEGER NOT NULL DEFAULT 0,
  rows_modified INTEGER NOT NULL DEFAULT 0,
  rows_invalid  INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  created_by    TEXT,
  applied_at    TEXT
);
CREATE TABLE import_row (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id       TEXT NOT NULL REFERENCES import_job(id),
  external_key TEXT NOT NULL,
  decision     TEXT NOT NULL,             -- new|unchanged|modified|invalid
  message      TEXT,
  entity_id    TEXT,
  revision_id  INTEGER,
  UNIQUE(job_id, external_key)
);

-- Append-only audit (AUDIT-01..04). No update or delete path exists in code.
CREATE TABLE audit_event (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id TEXT,
  action        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id   TEXT,
  revision_id   INTEGER,
  release_id    TEXT,
  outcome       TEXT NOT NULL,            -- ok|denied|failed|conflict
  changed_before TEXT,                    -- redacted field map
  changed_after  TEXT,
  at            TEXT NOT NULL
);
CREATE INDEX audit_at ON audit_event(at DESC);

-- Taxonomy terms used by collection rules and filters.
CREATE TABLE taxonomy_term (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  type   TEXT NOT NULL,                   -- occasion|flower-type|color
  key    TEXT NOT NULL,
  label  TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(type, key)
);

-- Phase 6 tables created now so migrations do not have to rewrite history later.
CREATE TABLE review (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id TEXT NOT NULL, revision_id INTEGER NOT NULL,
  requester TEXT, reviewer TEXT, decision TEXT, feedback TEXT,
  requested_at TEXT, decided_at TEXT
);
CREATE TABLE schedule (
  id TEXT PRIMARY KEY,
  release_id TEXT NOT NULL, due_at TEXT NOT NULL, timezone TEXT NOT NULL,
  status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
  last_result TEXT, created_by TEXT, created_at TEXT NOT NULL
);
```

## Payload schemas

Payloads are validated against a registered schema per `entity.type` before a revision is written.
`BLOCK-02`: JSON import cannot introduce an unregistered type or component.

`product` payload:

| Field | Rule |
| --- | --- |
| `sku` | unique across non-archived products; empty not allowed for new products |
| `printedNumber` | display-only reference, not a key (DATA-01) |
| `title`, `slug` | slug unique per type after normalization |
| `description`, `careNotes`, `substitutionNote` | plain text |
| `collectionIds` | must resolve to existing collections |
| `occasion`, `flowerTypes`, `colors` | taxonomy keys |
| `coverAssetId`, `gallery[{assetId, alt, focal}]` | asset IDs |
| `variants[{id, sku, label, priceVnd, compareAtVnd, salePriceVnd, saleStart, saleEnd, availability, leadHours, imageIds}]` | one variant minimum (CAT-01); combination and SKU unique (CAT-02) |
| `badges`, `featured`, `priority` | merchandising |
| `seo{title, description, socialAssetId, indexable}` | SEO-01 |
| `import{namespace, externalKey, sourceImage, sourcePosition, priceLabel}` | provenance, read-only through the editor |

`collection` payload: `title`, `slug`, `shortDescription`, `fullDescription`, `coverAssetId`,
`bannerAssetId`, `seo`, `navVisible`, `membershipMode` (`manual`|`rules`), `manualIds[]`,
`rules{mode: ALL|ANY, conditions[]}`, `emptyStateMode`, `filters`, `defaultSort`, `pageSize`.

`settings` payload: business details, contact channels, opening hours, delivery slots and lead
times, closed dates, service areas, ordering mode, canonical origin. Secrets stay out of payloads
and are referenced by name only (AUDIT-02, SEC-05).

## Integrity rules carried into code

- DATA-01: slugs, filenames and printed numbers are never primary keys. `entity.id` is a generated
  identifier; printed numbers repeat by design (39, 40, 41).
- DATA-02: public reads resolve revisions from the active release manifest.
- DATA-03: quantities, orders and inquiry state would use their own stores; none exist here, so no
  content rollback can touch them (HIST-05).
- DATA-07: draft writes require the caller's `expectedVersion`; a mismatch returns HTTP 409 with
  both sides so the UI can offer a comparison (EDIT-07, AC-08).
- Revision inserts are inserts only. `content_revision` and `audit_event` have no UPDATE or DELETE
  statement anywhere in the codebase (AUDIT-03, HIST-01).

## Concurrency and publication

- Draft save: `UPDATE entity ... WHERE version = ?` inside a transaction, then insert the revision.
  Zero rows changed means conflict.
- Publication: build the candidate manifest, validate it, insert the `release` row, then move the
  `release_active` pointer with a compare-and-swap on the previously active release id, all in one
  transaction. Readers see either the old manifest or the new one, never a mixture (PUB-09, AC-20).
- Publication carries an idempotency key. A replayed key returns the existing release instead of
  creating a second one (PUB-11, AC-21).

## Deletion protection

- Asset delete is rejected while a `media_usage` row points at it from published content, or while
  a retained revision references it. Blocking returns the usage list (MEDIA-08, AC-17).
- Replacing an asset inserts a new `media_version` and repoints `current_version_id`; older
  revisions keep the version they referenced (MEDIA-07, AC-18).
- Products and collections archive rather than delete (CAT-02, BACKUP-06).

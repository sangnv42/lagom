# Permission Matrix (requirements §4)

Implemented by `server/permissions.ts`. Enforced on the server for every request, including bulk
operations, imports, previews and asset downloads. Hiding a control in the admin UI is a courtesy,
never the enforcement point (PERM-04).

## Model

A decision is a function of four things (PERM-01), not the role name:

```text
can(actor, action, resourceType, resourceId?, fieldGroup?) -> allow | deny
```

Resolution order:

1. `staff_user.status != active` → deny everything, including existing sessions (PERM-08).
2. Role grants from the table below.
3. Per-user `permission_grant` rows: narrow scopes restrict, explicit overrides widen only for an
   Owner-authored grant (PERM-06).
4. Protected field groups are checked separately, so a role that may edit a product still cannot
   touch a protected field (PERM-05).
5. Scope: `resource_id = NULL` on a grant means every resource of that type. A grant naming one
   resource or collection covers only those (PERM-01).

## Vocabulary

| Action | Meaning |
| --- | --- |
| `read` | view list, detail, preview |
| `create` | new entity |
| `edit` | write a working draft revision |
| `price` | write the price field group on a variant |
| `request_review` | submit an exact revision for review |
| `approve` | approve someone else's revision |
| `publish` | move the active release pointer |
| `schedule` | create, cancel or replace a scheduled release |
| `archive` | archive an entity |
| `restore` | create a new draft from an older revision |
| `export` | content export |
| `manage_settings` | operational configuration |
| `manage_users` | invite users and assign roles |
| `manage_ownership` | ownership transfer, secrets |

| Resource | Covers |
| --- | --- |
| `product`, `collection`, `taxonomy` | catalog objects |
| `media` | assets and versions |
| `page`, `template`, `section` | website composition |
| `theme` | token revisions |
| `navigation`, `global` | header, footer, menus, announcements |
| `settings` | business and delivery configuration |
| `ui-string` | customer-facing copy |
| `route` | route registry and redirects |
| `release`, `review` | publishing workflow |
| `import` | import jobs |
| `audit` | audit reads |
| `user` | staff accounts and grants |

| Field group | Fields | Default owner of the group |
| --- | --- | --- |
| `content` | titles, copy, SEO, gallery ordering | content-editor, catalog-manager (own scope) |
| `price` | `priceVnd`, `compareAtVnd`, `salePriceVnd`, `saleStart`, `saleEnd` | owner, admin, catalog-manager |
| `availability` | availability state, lead time | catalog-manager and above |
| `operations` | ordering mode, delivery slots, bank-transfer instructions | owner, admin |
| `protected` | publication flags, role assignments, entity IDs, import provenance | nobody through a content payload (API-02) |

## Role matrix

Values: **F**ull, **D**raft only (no publish), **R**ead, **S**cope-limited draft, **—** no access.

| Capability | Owner | Admin | Content Editor | Catalog Manager | Publisher | Viewer |
| --- | --- | --- | --- | --- | --- | --- |
| `read` everything permitted | F | F | F | F | F | F |
| `page` edit | F | F | D | — | — | — |
| `product`/`collection` edit | F | F | — | S | — | — |
| `price` field group | F | F | — | S | — | — |
| `media` upload and edit | F | F | S | S | R | R |
| `navigation`, `global` edit | F | F | D | — | — | — |
| `ui-string` edit | F | F | D | — | — | — |
| `theme` edit | F | F | — | — | — | — |
| `template` edit | F | F | — | — | — | — |
| `approve` | F | F | — | — | F | — |
| `publish` | F | F | — | — | F | — |
| `schedule` | F | F | — | — | S | — |
| `restore` | F | F | D | S | S | — |
| `archive` | F | F | D | S | — | — |
| `manage_settings` | F | F | — | — | — | — |
| `export` | F | — | — | — | — | — |
| `manage_users` | F | — | — | — | — | — |
| `manage_ownership` | F | — | — | — | — | — |
| `audit` read | F | F | own activity | own activity | publishing scope | — |

Every role additionally passes the `read` gate for the surfaces it needs to do its job. A Viewer is a
staff account that can log in and look, which is what §4.1 asks for.

## Rules that need more than a table lookup

- **PERM-03** — publishing a release requires `publish` on every entity inside the manifest, plus
  `price` if any manifest entry carries a price change. A page-scoped Publisher hitting a release
  with a price change gets a denial naming the unauthorized dependency (AC-04).
- **PERM-05** — price writes are checked as a field group on the write path. A content editor who
  posts a price in a product payload or in a hidden JSON field gets a field-group denial, and the
  payload is not partially applied.
- **PERM-07** — the last active Owner cannot be disabled, demoted or removed. Ownership transfer
  requires reauthentication and writes an audit event.
- **PERM-08** — disabling a user revokes their sessions in the same transaction. Enforced
  retroactively because `can()` re-reads user status on each request.
- **PERM-09** — a shared-resource write returns the affected route list with the request result,
  and publishing it requires permission over every affected resource or escalation.
- **PERM-10** — customers have no path into `staff_user`. The storefront has no account system, and
  the public API exposes no write surface at all, so there is nothing to escalate through.
- **API-02** — `protected` field groups are stripped before validation, and any attempt to set them
  is denied and audited rather than silently dropped.

## Honest status of the deferred parts

| Requirement | Status in this build |
| --- | --- |
| SEC-01 invitations, expiry, recovery, rate limits | Rate limiting and session revocation exist. Invitations and recovery are `Not configured`. |
| SEC-02 MFA for Owner and Admin | Not enforced. `staff_user.mfa_enrolled` stays 0 and the admin shows `MFA: Not configured`. |
| SEC-03 reauthentication for sensitive changes | Not implemented; the flows that need it (ownership, bank-transfer details) are not exposed yet. |
| PERM-06 custom role designer | Not built. Scopes and overrides are assignable through the grant table and the user screen. |

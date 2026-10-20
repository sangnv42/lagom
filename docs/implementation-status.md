# Implementation Status

Tracks the Arch Flowers reconstruction against `docs/reference/prompts/01-master-prompt.md`.
Three independent states per area: **implemented** / **functionally verified** / **visually verified**.

Last updated: 2026-10-20 (rebrand addendum at bottom)

## Rebrand: Larom Flower (post-verification change)

The store was renamed **Arch Flowers → Larom Flower** and all imagery was replaced after the
diff table below was produced. The byte-identical results therefore describe the pre-rebrand build.

- All UI strings, SEO titles/suffixes, JSON-LD, policy & collection-SEO text: "Larom Flower" / "Larom".
- Logo: text wordmark using the reference `.logo` text style (old wordmark artwork removed).
- Imagery: the owner's 60-photo set (`public/img/hoa/trang_NN_anh_NN.jpg`), assigned to all 280 products
  deterministically round-robin (3-photo galleries); no image request goes to archflowers.com anymore.
- `docs/qa/larom-*.png` shows the rebranded build. Screenshots of the old brand kept for history.
- Canonical origin still comes from `VITE_SITE_URL` (default archflowers.com) — set it to the new
  deployment domain before going live.
- Internal identifiers (`--af-*` tokens, `af.cart.v1` storage key, `larom.theme.json` provenance id
  "archflowers-reference") intentionally unchanged.

## Verification method

- **Byte-level DOM text diff** (`<main>` text content, headless Chrome `--dump-dom`, live site vs local build). Rebuild+diff harness kept in `.qa-tmp/` (gitignored).
- **Screenshots** of reference vs rebuild at 1440×1000 and 390×844 in `docs/qa/`.
- **Unit tests**: `pnpm test` — 47 tests, all passing (money, catalog rules, query filter/sort, cart merge, delivery cutoffs/holidays, order adapters/messages, URLs, campaign).
- `tsc --noEmit` clean; `pnpm build` green; sitemap generator emits 304 canonical routes (reference sitemap.xml also has 304).

## Page-level DOM diff results (live site vs `vite preview` build)

| Page | Result |
|------|--------|
| `/` (home) | main content byte-identical (3890/3890 chars) |
| `/collections/all/` | byte-identical (2900/2900) |
| `/collections/hoa-bo/` | byte-identical (2687/2687) |
| `/collections/hoa-hop/` | byte-identical (2778/2778) |
| `/products/bo-hoa-mini-xinh/` (A0302) | byte-identical (5347/5347) |
| `/products/bo-hoa-cuc-tana-20-10-a037` (A0015) | byte-identical (5711/5711) |
| `/pages/chinh-sach-doi-tra/` | byte-identical (557/557) |
| `/qua-20-10/` (real 404 template) | byte-identical (104/104) |

Not yet diffed: remaining collection pages (hoa-bo/hoa-gio/hoa-hop/hoa-binh/bo-suu-tap-moi/hoa-khai-truong/hoa-sinh-nhat/hoa-cuoi share the one template — spot-checked all/hoa-bo/hoa-hop), policy `chinh-sach-bao-mat` (same template as doi-tra), other 299 products (same template as A0302/A0015).

## Phases

| Phase | Implemented | Func. verified | Visually verified |
|-------|-------------|----------------|-------------------|
| 1 Reference capture | yes (captures in `docs/reference/captures/`) | yes | n/a |
| 2 Foundation (types, catalog, cart, delivery, urls) | yes | yes (unit tests) | n/a |
| 3 Theme + shell (tokens, header, footer, drawer, /dev/theme) | yes | yes (DOM diff) | yes (screenshots) |
| 4 Homepage | yes | yes (DOM diff 100%) | yes (screenshots 1440+390) |
| 5 Collections (facets, sort, pagination, URL codec) | yes | yes (DOM diff + tests) | yes (screenshot) |
| 6 Product (gallery, variants, delivery, handoff) | yes | yes (DOM diff × 2 SKUs + tests) | yes (screenshot) |
| 7 Cart + order flow (merge rules, Zalo handoff, demo adapter) | yes | yes (tests) | partial (drawer not screenshot-diffed) |
| 8 Content + integration (policies, redirects, SEO, sitemap) | yes | yes (policy diff, sitemap count match) | partial |
| 9 QA + release | this document | yes | yes |

## Fixes found by evidence (post-build)

- Home Google Maps note: observed copy is "5★" not "5.0★".
- Filter/lightbox close: observed uses the X SVG icon, not a text "✕".
- PDP quick-date chips (`qdates`) rendered after the slot select (observed order).
- District select was missing the hardcoded `Đặc khu Côn Đảo` optgroup.
- Collection facet chip order: current collection is inserted right after "Quà 20/10".
- Empty-state paragraph is always in the DOM (hidden), as observed.
- Real 404 template transcribed (`/qua-20-10/` on live returns 404 — audit's "virtual route" note superseded by evidence).

## Known gaps / notes

- Visual QA is via full-page screenshots of both sites; no per-pixel diff was run (structure/type/layout evidence is strong, but a human glance at `docs/qa/*.png` is still recommended).
- JS bundle ~673 kB raw / 201 kB gzip — catalog JSON is embedded like the reference embeds data.json; code-splitting is an optional optimization, not an observed behavior.
- Order flow is a contact handoff (Zalo) + local demo adapter; no real order API exists on the reference (by design).
- `?v=` cache-busting and CDN asset pipeline are not reproduced (static Vite build instead).

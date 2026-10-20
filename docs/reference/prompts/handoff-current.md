# Handoff — Current State

See `docs/implementation-status.md` for the full verification matrix. This is the short version.

## Where things stand

The reconstruction is **feature-complete and evidence-verified**. All 9 phases in `docs/reference/phases/` are done.

**Current catalog**: 60 flowers from `src/data/flower-prices.json` (owner price list), one per photo,
price bound to its image (`hoa-N`, dup numbers → `hoa-Nb`), titled "Hoa Larom số N", listed in every
collection by owner decision. Old Arch product slugs are retired (in-app 404).

- `pnpm test` → 47/47 passing. `tsc --noEmit` clean. `pnpm build` green.
- Headless-Chrome `<main>` text diff vs the live site: **byte-identical** on home, `/collections/all/`, `/collections/hoa-bo/`, `/collections/hoa-hop/`, both fixture products (A0302, A0015), the đổi-tra policy, and the real 404 template (`/qua-20-10/` → 404 on live).
- Screenshots (ref vs local, 1440/390 widths) in `docs/qa/`.

## Commands

- `pnpm dev` / `pnpm build` + `pnpm preview` (build also runs `scripts/generate-seo.mjs` → `dist/sitemap.xml`, 304 routes)
- `pnpm test` (vitest, `tests/*.test.ts`)
- Data pipeline: `node scripts/extract-content.mjs` (re-extracts wards/holidays/collection-SEO/policies from `docs/reference/captures/app.js`), `node scripts/generate-tokens.mjs` (theme JSON → `src/styles/tokens.css`)

## Key invariants (do not regress)

- Money = integer VND only (`src/lib/money.ts`); formatted with `.` thousands separators.
- Cart lines never merge across delivery date/slot/recipient/message differences (`src/features/cart/cart.ts`, key `af.cart.v1`).
- Quote-only (`price: 0`) products render "Hỏi giá" → Zalo; never a zero-price add-to-cart.
- All date/slot logic is Asia/Ho_Chi_Minh fixed +420 (`src/lib/vntime.ts`); 2h same-day cutoff; holiday-only 18:00–20:00 slot gated by `DELIVERY.holidays`.
- Catalog transforms replicate observed `app.js`: text-fixes override, ke-flower removal, SKU code extraction, variant sort small→large, `hoa-ke-1` hidden, virtual `qua-20-10` union.
- Collection facet chips: `[all, qua-20-10, <current if not an occasion>, occasions…]`; empty-state `<p class="empty">` always in DOM (hidden attr).
- No fabricated content: everything traces to `docs/reference/captures/` or is marked PROPOSED in code comments.

## Remaining polish candidates (all optional)

- Manual pixel-level screenshot review of `docs/qa/` pairs.
- Bundle split for the embedded catalog (cosmetic; reference ships comparable payload).
- Diff the remaining collection pages / policies for completeness (same templates as verified ones).

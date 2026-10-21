# Lagom Flower — reconstruction

Faithful reconstruction of https://archflowers.com/ (Vietnamese florist storefront), rebranded to
**Lagom Flower** with the owner's own 60-photo flower set, built with React 18 + TypeScript + Vite +
React Router. Storefront content is Vietnamese; docs and comments are English.

Everything is evidence-based: content, styles, and behavior are transcribed from the captures in
`docs/reference/captures/` (page HTML, `style.css`, `app.js`, `data.json`, `text-fixes.json`).
Nothing is invented — provisional bits are marked in code comments.

## Quick start

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # vitest: 47 unit tests (money, catalog, cart, delivery, order, urls, campaign)
pnpm build      # typecheck + vite build + sitemap/robots generation into dist/
pnpm preview    # serve the production build on :4173
```

## Deploy — storefront demo on Vercel (no API)

The SPA ships its seed catalog in the bundle, so it needs no server. `hydrateFromApi()` and
`hydrateSiteFromApi()` each fetch `/api/public/*` once with a 2 s timeout and keep the bundled data
when the request fails, so a static deploy renders identically to `pnpm preview`.

1. Import the repo (`github.com/sangnv42/lagom`) in Vercel. It detects Vite + pnpm; `vercel.json`
   pins the build (`npm run build` → `dist/`) and rewrites every non-`/api` path to `index.html`
   so deep links like `/products/hoa-1/` resolve.
2. Optional env var `VITE_SITE_URL=https://<your-app>.vercel.env` — canonical URLs, OG tags, sitemap.
3. Deploy. Expect ~14 MB output, almost all of it `public/img`.

`/admin` and the order flow still call `/api`, which does not exist here: admin screens show fetch
errors, orders fall back to the pre-filled Zalo handoff. For the CMS, deploy `server/` (Node 24,
`node:sqlite`) somewhere with a persistent disk, or add a managed DB.

## Layout

| Path                               | What                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| `docs/reference/`                  | Audit, phase plans, theme contract, raw captures (ground truth)                    |
| `docs/qa/`                         | Reference vs rebuild screenshots (1440/390)                                        |
| `docs/implementation-status.md`    | Verification matrix (implemented / functionally / visually)                        |
| `src/domain/types.ts`              | Shared domain types                                                                |
| `src/data/`                        | Catalog build (observed-data + text-fixes + owner products), business constants    |
| `src/lib/`                         | money (integer VND), vntime (Asia/Ho_Chi_Minh), urls codec, img fallback, campaign |
| `src/features/`                    | catalog query, cart store, delivery policy, order adapters (Zalo handoff + demo)   |
| `src/pages/`, `src/components/`    | Routes and UI (Vietnamese storefront)                                              |
| `src/theme/archflowers.theme.json` | Token contract with provenance; `scripts/generate-tokens.mjs` emits `tokens.css`   |
| `scripts/`                         | one-time content extraction + token/sitemap generators                             |

## Notable behaviors (from evidence)

- Quote-only designs (price 0) use "Hỏi giá" via Zalo — never a zero-price cart add.
- Cart lines only merge when size + delivery date + slot + recipient + message all match.
- Delivery slots 08–11 / 11–14 / 15–18 (+18–20 on holidays), same-day cutoff 09:00 VN, submit-time revalidation.
- Collections: 24-per-page "Xem thêm", facets (price band / collection / type), sorts featured · newest · price asc/desc · biggest discount (`?s=off`).
- Orders are contact handoffs (pre-filled Zalo message) — the reference has no order API.

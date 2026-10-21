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

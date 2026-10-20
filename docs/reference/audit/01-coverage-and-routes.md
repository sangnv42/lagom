# Audit Coverage and Route Inventory

Base URL: `https://archflowers.com`. Audit date: October 20, 2026, Asia/Bangkok.

## Interpreting the results

“Readable” means the tool returned text. It does not mean the page was rendered, captured, or fully tested. “Inaccessible” may reflect a tool limitation or a website problem. Record a 404 only where the tool explicitly reported it. A generic fetch failure does not establish that a route does not exist.

Some URLs without trailing slashes returned months-old cached content, while trailing-slash URLs returned newer content. This describes retrieval results; it does not establish that the website actually serves two interfaces depending on the slash.

## Readable current pages

| Path | Type | Displayed design count | Verification |
|---|---|---:|---|
| `/` | Homepage | — | OBSERVED-TEXT |
| `/index.html` | Homepage content | — | OBSERVED-TEXT; CTA fragment remains unknown |
| `/collections/all/` | Entire catalog | 292 | OBSERVED-TEXT, first 24 cards |
| `/collections/all/?s=off` | Link destination from the popular-products area | 292 | OBSERVED-TEXT; meaning of `s=off` unknown |
| `/collections/qua-20-10/` | Occasion collection | 232 | OBSERVED-TEXT, first 24 cards |
| `/collections/hoa-khai-truong/` | Occasion collection | 26 | OBSERVED-TEXT, first 24 cards |
| `/collections/hoa-sinh-nhat/` | Occasion collection | 52 | OBSERVED-TEXT, first 24 cards |
| `/collections/bo-suu-tap-moi/` | New collection | 74 | OBSERVED-TEXT, first 24 cards |
| `/collections/hoa-bo/` | Arrangement type | 125 | OBSERVED-TEXT, first 24 cards |
| `/collections/hoa-gio/` | Arrangement type | 47 | OBSERVED-TEXT, first 24 cards |
| `/collections/hoa-hop/` | Arrangement type | 38 | OBSERVED-TEXT, first 24 cards |
| `/collections/hoa-cuoi/` | Wedding collection | 17 | OBSERVED-TEXT, 17 cards in the extraction |
| `/products/bo-hoa-mini-xinh/` | A0302 product details | — | OBSERVED-TEXT |
| `/products/bo-hoa-cuc-tana-20-10-a037/` | A0015 product details | — | OBSERVED-TEXT |
| `/pages/chinh-sach-doi-tra/` | Returns policy | — | OBSERVED-TEXT |
| `/pages/chinh-sach-bao-mat/` | Privacy policy | — | OBSERVED-TEXT |

Collections overlap. Do not add their counts to infer a product total. These numbers are a snapshot, not constants to hard-code into the application.

## Reported redirects

| Requested URL | Destination | Implementation note |
|---|---|---|
| `/collections/bo-suu-tap-moi` | `/collections/bo-suu-tap-moi/` | Slash normalization |
| `/products/bo-hoa-mini-xinh` | `/products/bo-hoa-mini-xinh/` | Slash normalization |
| `/pages/lien-he` | `/` | No verified standalone contact page |
| `/pages/about-us/` | `/` | About content may be part of the homepage |
| `/account/login` | `/` | Do not assume authentication is required |
| `/account/register` | `/` | Do not assume registration is required |
| `/search` | `/collections/all/` | Search-query preservation is unverified |
| `/collections/hoa-ke-1/` | `/collections/hoa-khai-truong/` | Legacy arrangement-type alias |
| `/collections/thuc-te-hoa-tuoi/` | `/collections/all/` | No verified standalone customer gallery |
| `/blogs/news/` | `/` | Do not assume a blog CMS is required |
| `/pages/dieu-khoan-dich-vu/` | `/pages/chinh-sach-doi-tra/` | Policy alias |

Do not infer the HTTP redirect status from this table. Use permanent redirects in the reconstruction once mappings are confirmed; internal redirects can support preliminary testing.

## URLs that returned older cached content

| Retrieved path | Reported cache age | Treatment |
|---|---|---|
| `/products/bo-hoa-cuc-tana-20-10-a037` | Previous week | Old template; prefer the trailing-slash version above |
| `/pages/about-us` | Approximately six months | Do not take its header/footer as current |
| `/pages/chinh-sach-doi-tra` | Approximately six months | Use the newer trailing-slash version |
| `/pages/chinh-sach-bao-mat` | Approximately six months | Use the newer trailing-slash version |
| `/pages/dieu-khoan-dich-vu` | Approximately six months | Use the newer mapping |
| `/collections/hoa-cuoi` | Approximately six months | Use the newer trailing-slash version |
| `/collections/hoa-bo` | Approximately six months | Use the newer trailing-slash version |
| `/collections/hoa-gio` | Approximately six months | Use the newer trailing-slash version |
| `/collections/hoa-hop` | Approximately six months | Use the newer trailing-slash version |
| `/collections/hoa-ke-1` | Approximately six months | Use the newer mapping |
| `/collections/thuc-te-hoa-tuoi` | Approximately six months | Use the newer mapping |
| `/blogs/news` | Approximately six months | Use the newer mapping |
| `/collections/types?q=hoa-tha-binh` | Approximately 1.6 years | Discovery clue only |

Search results also mentioned `/collections/frontpage`, `/collections/vendors?q=archflower`, `/collections/types?q=hoa-gio`, `/blogs/nhan-xet/`, and `/products/binh-hoa-sang-trong`. Search snippets do not verify a current page.

## Unreadable URLs and errors

| Path | Result |
|---|---|
| `/sitemap.xml`, `/robots.txt` | Inaccessible through the web tool |
| `/collections/`, `/products/` | Inaccessible |
| `/collections/all/?page=2` | Tool error; pagination mechanism unverified |
| `/collections/frontpage/` | Inaccessible |
| `/collections/hoa-ngay-20-10/` | Explicitly reported as 404 |
| `/blogs/nhan-xet/` | Inaccessible |
| `/products/binh-hoa-sang-trong` | Inaccessible |
| `/products/bo-hoa-ta-ng-sinh-nha-t-chu-c-mu-ng-bh058/` | Inaccessible |
| `/products/bo-hoa-tulip-do-trang`, `/products/bo-hoa-tulip-do-trang/` | Inaccessible |
| `/products/bo-hao-tulip-hong-20-bong/` | Inaccessible |
| `/collections/all/products/bo-hoa-tulip-do-trang/` | Followed from an extracted link; reported as 404 |
| `/collections/all/products/bo-hoa-tulip-do-trang/index.html` | Inaccessible |
| `/collections/all/products/bo-hao-tulip-hong-20-bong/` | Followed from an extracted link; reported as 404 |
| `/collections/hoa-khai-truong/products/bi-nh-hoa-ho-ng-va-ng-chu-c-mu-ng-khai-truong/` | Followed link; reported as 404 |
| `/products/bo-hoa-mini-xinh/products/bo-hoa-bibi-giay-hong/` | Followed link; reported as 404 |
| `/products/bo-hoa-mini-xinh/products/bo-hoa-1-bong-mini-xinh-20-10-a030/` | Followed link; reported as 404 |
| `/product.html`, `/cart.html`, `/checkout.html` | Probed URLs; inaccessible |
| `/cart`, `/cart/`, `/checkout/`, `/gio-hang/` | Probed URLs; inaccessible |

Unexpected nested `/products/` paths may relate to relative-link resolution by the tool or the site's base URL configuration. There is insufficient evidence to call them browser-visible website defects. In the reconstruction, use origin-relative paths starting with `/` and test deep-link reloads.

## Remaining coverage gaps

- No exhaustive sitemap or complete product-slug list.
- Load-more, filters, sorting, and mobile navigation were not tested in a rendered browser.
- Cart presentation—drawer, modal, or route—and the final ordering UI remain unknown.
- Fonts, colors, grids, breakpoints, icons, motion, and sticky behavior remain unmeasured.
- Complete assets and the actual 404 page remain unverified.

Do not mark this audit as “every page navigated” or “pixel-perfect verified.”

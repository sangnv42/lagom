# Policies, Contact, and URL Compatibility

## Readable policy pages

| Route | Content summary | Source |
|---|---|---|
| `/pages/chinh-sach-doi-tra/` | Confirmation before delivery, contacting the shop about damaged flowers, exchange conditions, shipping fees | S13 |
| `/pages/chinh-sach-bao-mat/` | Buyer/recipient information for orders; cart and buyer details stored in the browser | S14 |

Build a shared `PolicyArticle`. Take headings and rich-text blocks from owner-confirmed content files. Do not import old cached terms when the current version differs. The reconstruction's policies must accurately describe its actual storage and submission behavior.

## Contact and about

Tested contact/about links redirected to the homepage, which already contains bespoke-order and brand-story sections. The baseline is therefore homepage sections plus contact links. There is no verified requirement for an email contact form, standalone about page, or ticketing system.

The bespoke CTA's precise anchor was not preserved by the retrieval tool. Capture its actual `href` before implementing it. `/index.html` may need a homepage alias to support older links.

## Proposed redirect registry

```typescript
const referenceRedirects = {
  '/pages/about-us/': '/',
  '/pages/lien-he': '/',
  '/account/login': '/',
  '/account/register': '/',
  '/search': '/collections/all/',
  '/collections/hoa-ke-1/': '/collections/hoa-khai-truong/',
  '/collections/thuc-te-hoa-tuoi/': '/collections/all/',
  '/blogs/news/': '/',
  '/pages/dieu-khoan-dich-vu/': '/pages/chinh-sach-doi-tra/'
};
```

These mappings reflect tool results; HTTP status and query/fragment preservation still need verification. Test slash normalization separately. Do not redirect every unknown URL to the homepage, which would conceal routing defects.

## 404 and errors

The actual 404 template was not observed. A temporary implementation may use a clear heading, home/catalog links, and the shared theme, marked PROPOSED until a reference exists. Fetch failures must not automatically become 404s, and empty catalogs must not be represented as network errors.

## Features excluded from the baseline without new evidence

Account dashboards, functioning login/registration, a blog CMS, wishlists, newsletter infrastructure, and a customer-gallery page. They may appear in older cached content but are unverified in the version being reconstructed.

## Acceptance

- Redirects do not loop or lose canonical destinations.
- Policy pages open directly and survive reloads.
- Policy content agrees with implemented persistence and checkout.
- Navigation does not expose dead links to unimplemented legacy features.
- The reconstruction sitemap lists actual canonical routes, not every alias.

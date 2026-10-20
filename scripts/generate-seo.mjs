// Post-build: writes dist/sitemap.xml and dist/robots.txt listing ONLY canonical reconstruction routes
// (home, 9 collections, 2 policies, the 60 Larom flower slugs from the owner price list).
// Aliases (redirects), /dev/*, and placeholder content are excluded (Phase 8 acceptance).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const outDir = process.argv[2] || 'dist';
if (!existsSync(outDir)) {
  console.error(`output directory ${outDir} missing — run vite build first`);
  process.exit(1);
}
const SITE = (process.env.VITE_SITE_URL || 'https://archflowers.com').replace(/\/$/, '');

function parseJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    throw new Error(`cannot read ${path}: ${e.message}`);
  }
}
const prices = parseJson('src/data/flower-prices.json');
// Slugs mirror src/data/catalog.ts: hoa-N, second occurrence of a printed number gets 'b'.
const seenNums = new Map();
const products = prices.items.map((it) => {
  const count = (seenNums.get(it.product_number) ?? 0) + 1;
  seenNums.set(it.product_number, count);
  return { handle: `hoa-${it.product_number}${count > 1 ? String.fromCharCode(64 + count).toLowerCase() : ''}` };
});
const collections = ['bo-suu-tap-moi', 'hoa-bo', 'hoa-gio', 'hoa-hop', 'hoa-khai-truong', 'hoa-sinh-nhat', 'hoa-cuoi'];
const routes = [
  '/',
  '/collections/all/',
  '/collections/qua-20-10/',
  ...collections.map((h) => `/collections/${h}/`),
  '/pages/chinh-sach-doi-tra/',
  '/pages/chinh-sach-bao-mat/',
  ...products.map((p) => `/products/${p.handle}/`),
];

const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  routes.map((r) => `<url><loc>${SITE}${r}</loc></url>`).join('\n') +
  '\n</urlset>\n';
writeFileSync(`${outDir}/sitemap.xml`, xml);
writeFileSync(
  `${outDir}/robots.txt`,
  'User-agent: *\nAllow: /\nDisallow: /dev/\n\nSitemap: ' + SITE + '/sitemap.xml\n'
);
console.log(`sitemap.xml: ${routes.length} canonical routes → ${outDir}/`);

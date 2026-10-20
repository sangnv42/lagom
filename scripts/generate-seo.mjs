// Post-build: writes dist/sitemap.xml and dist/robots.txt listing ONLY canonical reconstruction routes
// (home, 9 collections, 2 policies, product slugs after the observed ke-flower removal).
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
const raw = parseJson('src/data/observed-data.json');
const owner = parseJson('src/data/owner-products.json');
const isKe = (p) => p.collections.includes('hoa-ke-1') || /kệ/i.test(p.title.normalize('NFC'));
const products = [...owner, ...raw.products.filter((p) => !isKe(p))];
const collections = raw.collections.filter((c) => c.handle !== 'hoa-ke-1').map((c) => c.handle);
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

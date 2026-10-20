// Catalog repository built from the OBSERVED export (src/data/observed-data.json + text-fixes.json,
// fetched from archflowers.com on 2026-10-20) plus the 16 owner-supplied products the reference injects
// client-side (captured app.js). All transformations below mirror the reference loadData() rules so the
// rendered catalog matches. Nothing here is synthetic: isFixture=false everywhere.

import raw from './observed-data.json';
import textFixes from './text-fixes.json';
import ownerProducts from './owner-products.json';
import type { Collection, Product, ProductVariant } from '../domain/types';

const CAPTURE_DATE = '2026-10-20';

type RawVariant = { title: string; price: number; compare?: number };
type RawProduct = {
  handle: string;
  title: string;
  price: number;
  compare?: number;
  type?: string;
  tags?: string[];
  images: string[];
  collections: string[];
  desc?: string;
  variants?: RawVariant[];
};
type RawCollection = { handle: string; name: string; count: number };

// ---- observed title/desc cleanup rules (captures/app.js cleanTitle/cleanDesc) ----
export function cleanTitle(t: string): { name: string; code: string } {
  let s = (t || '').normalize('NFC').replace(/\s+/g, ' ').trim();
  let code = '';
  const m = s.match(/\s+-?\s*([A-Za-z]{1,3}\d{2,5})$/);
  if (m) {
    code = m[1].toUpperCase();
    s = s.slice(0, m.index);
  }
  const name = s
    .split(' ')
    .map((w) =>
      /\d/.test(w) || (w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w))
        ? w
        : w.charAt(0).toLocaleUpperCase('vi') + w.slice(1).toLocaleLowerCase('vi')
    )
    .join(' ');
  return { name, code };
}

export const cleanDesc = (d?: string): string =>
  (d || '').normalize('NFC').replace(/^\s*Mô tả\s*:\s*/i, '').replace(/\s*Xem thêm[\s\S]*$/, '').trim();

const variantLabel = (t: string): string =>
  t.replace(/^Default Title\s*\/\s*/, '').replace(/^Default Title$/, 'Tiêu chuẩn');

// size rank used by the observed "sizes run small → large, price never decreasing" fix
function sizeRank(t: string): number {
  if (/^(nhỏ|mini)/i.test(t)) return 0;
  if (/^vừa/i.test(t)) return 1;
  if (/^(to|lớn)/i.test(t)) return 2;
  return -1;
}

function buildVariants(p: RawProduct): ProductVariant[] {
  const list: RawVariant[] =
    p.variants && p.variants.length ? p.variants : [{ title: 'Tiêu chuẩn', price: p.price }];
  const variants = list.map((v, i) => ({
    id: `${p.handle}-v${i}`,
    label: variantLabel(v.title),
    priceVnd: Math.round(v.price || 0),
    // observed cmpHTML fallback: first variant inherits the product-level compare price
    compareAtVnd: v.compare ? Math.round(v.compare) : i === 0 && p.compare ? Math.round(p.compare) : null,
  }));
  if (variants.length > 1 && variants.every((x) => sizeRank(x.label) >= 0 && x.priceVnd > 0)) {
    const prices = variants
      .map((x) => ({ price: x.priceVnd, compare: x.compareAtVnd }))
      .sort((a, b) => a.price - b.price);
    variants
      .sort((a, b) => sizeRank(a.label) - sizeRank(b.label))
      .forEach((x, i) => {
        x.priceVnd = prices[i].price;
        x.compareAtVnd = prices[i].compare;
      });
  }
  return variants;
}

function toProduct(rawP: RawProduct, order: number, sourceUrl: string): Product {
  const { name, code } = cleanTitle(rawP.title);
  return {
    id: rawP.handle,
    slug: rawP.handle,
    sku: code,
    title: name,
    description: cleanDesc(rawP.desc),
    collectionSlugs: rawP.collections,
    flowerType: (rawP.type || 'Khác').normalize('NFC'),
    tags: rawP.tags || [],
    imagePaths: rawP.images,
    variants: buildVariants(rawP),
    order,
    evidence: { sourceUrl, verifiedAt: CAPTURE_DATE, isFixture: false },
  };
}

function buildCatalog(): { products: Product[]; collections: Collection[] } {
  const r = raw as { collections: RawCollection[]; products: RawProduct[] };
  // "Kệ hoa" category was removed at the owner's request (observed filter + count adjustment)
  const isKe = (p: RawProduct) => p.collections.includes('hoa-ke-1') || /kệ/i.test(p.title.normalize('NFC'));
  // owner note: A0151 is a vase, not a stand — keep it in Khai trương with the right type
  const fixed = r.products.filter((p) => !isKe(p) || /A0151/.test(p.title));
  for (const p of fixed) {
    if (/A0151/.test(p.title)) {
      p.type = 'Hoa thả bình';
      if (!p.collections.includes('hoa-khai-truong')) p.collections.push('hoa-khai-truong');
    }
  }
  // owner-supplied products (photo + price, not yet in the Haravan export) are prepended
  // SAFETY: owner-products.json was extracted from the reference app.js with the same field shape as RawProduct.
  const owner = ownerProducts as unknown as RawProduct[];
  const ordered = [...owner].reverse().concat(fixed);
  const sourceUrl = 'https://archflowers.com/data.json (captured 2026-10-20)';
  const products = ordered.map((p, i) => toProduct(p, i, sourceUrl));
  // text-fixes.json: proofread names/descriptions override the export text (observed)
  const fixes = textFixes as Record<string, { name?: string; desc?: string; type?: string; images?: string[] }>;
  for (const p of products) {
    const f = fixes[p.slug];
    if (!f) continue;
    if (f.name) p.title = cleanTitle(f.name).name;
    if (f.desc) p.description = cleanDesc(f.desc);
    if (f.type) p.flowerType = f.type.normalize('NFC');
    if (f.images?.length) p.imagePaths = f.images;
  }
  const collections: Collection[] = (r.collections as RawCollection[])
    .filter((c) => c.handle !== 'hoa-ke-1')
    .map((c) => ({ slug: c.handle, title: c.name }));
  for (const [handle, v] of Object.entries({
    'qua-20-10': 'Quà 20/10',
    all: 'Tất cả hoa',
  })) {
    collections.push({ slug: handle, title: v, virtual: true });
  }
  return { products, collections };
}

export const CATALOG = buildCatalog();
export const PRODUCTS = CATALOG.products;
export const COLLECTIONS = CATALOG.collections;

export function getProduct(slug: string): Product | null {
  return PRODUCTS.find((p) => p.slug === slug) ?? null;
}

export function getCollection(slug: string): Collection | null {
  return COLLECTIONS.find((c) => c.slug === slug) ?? null;
}

export const VIRTUAL_HANDLES: Record<string, { name: string; from: string[] }> = {
  'qua-20-10': { name: 'Quà 20/10', from: ['hoa-bo', 'hoa-hop', 'hoa-gio', 'bo-suu-tap-moi'] },
};

export function inCollection(p: Product, handle: string | undefined): boolean {
  if (!handle || handle === 'all') return true;
  const v = VIRTUAL_HANDLES[handle];
  if (v) return p.collectionSlugs.some((c) => v.from.includes(c));
  return p.collectionSlugs.includes(handle);
}

export function collectionName(handle: string): string {
  return getCollection(handle)?.title || 'Tất cả hoa';
}

// Observed pin map: which design is featured first in each collection tile/list.
export const COLLECTION_PIN: Record<string, string> = {
  'hoa-sinh-nhat': 'gio-hoa-tulip-hong-trang',
  'hoa-bo': 'bo-hoa-tulip-do-trang',
  'hoa-cuoi': 'hoa-cuoi-hc001',
  'hoa-khai-truong': 'bo-hoa-chu-c-mu-ng-nga-y-nha-gia-o-20-11-hong-cam-juliet-bh039',
  'hoa-hop': 'gio-hoa-tulip-trang-sang-trong-gh018',
  'hoa-gio': 'gio-hoa-chu-c-mu-ng-khai-truong-sinh-nha-t-gh021',
};

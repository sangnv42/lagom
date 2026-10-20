import { describe, expect, it } from 'vitest';
import { queryCatalog, productOff } from '../src/features/catalog/query';
import type { Product } from '../src/domain/types';

// Synthetic fixtures for query-engine tests ONLY (never shipped in the app catalog).
function mk(slug: string, prices: number[], collections: string[], order: number, type = 'Hoa bó'): Product {
  return {
    id: slug,
    slug,
    sku: slug.toUpperCase(),
    title: `Test ${slug}`,
    description: '',
    collectionSlugs: collections,
    flowerType: type,
    tags: [],
    imagePaths: [],
    variants: prices.map((p, i) => ({ id: `${slug}-v${i}`, label: i === 0 ? 'Vừa' : 'To', priceVnd: p, compareAtVnd: null })),
    order,
    evidence: { isFixture: true },
  };
}

const items = [
  mk('cheap', [200000], ['hoa-bo'], 0),
  mk('mid', [500000, 900000], ['hoa-bo', 'hoa-sinh-nhat'], 1),
  mk('rich', [2500000], ['hoa-gio'], 2, 'Hoa giỏ'),
  mk('quote', [0], ['hoa-hop'], 3, 'Hoa hộp'),
  mk('sale', [400000, 600000], ['hoa-bo'], 4),
];
items[4].variants[0].compareAtVnd = 800000; // 50% off

describe('catalog query (C01/C02/C03 rules)', () => {
  it('collection filter + AND across facets', () => {
    const r = queryCatalog(items, { collection: 'hoa-bo', sort: 'featured' });
    // observed featured rule: sub-500k designs sort after the rest, then catalog order
    expect(r.products.map((p) => p.slug)).toEqual(['mid', 'cheap', 'sale']);
    const r2 = queryCatalog(items, { collection: 'hoa-bo', type: 'Hoa bó', bandId: 'u300', sort: 'featured' });
    expect(r2.products.map((p) => p.slug)).toEqual(['cheap']);
  });

  it('band matches when ANY size price falls inside (observed)', () => {
    const r = queryCatalog(items, { collection: 'all', bandId: '500-1tr', sort: 'featured' });
    expect(r.products.map((p) => p.slug)).toEqual(['mid', 'sale']); // mid: 500k/900k sizes; sale: 600k large size
  });

  it('unpriced "Liên hệ" designs always sort last, in every sort mode', () => {
    for (const sort of ['featured', 'asc', 'desc', 'new', 'off'] as const) {
      const r = queryCatalog(items, { collection: 'all', sort });
      expect(r.products[r.products.length - 1].slug).toBe('quote');
    }
  });

  it('price sorting is numeric (shown price), not string', () => {
    const asc = queryCatalog(items.filter((p) => p.slug !== 'quote'), { collection: 'all', sort: 'asc' });
    expect(asc.products.map((p) => p.slug)).toEqual(['cheap', 'sale', 'mid', 'rich']);
    const desc = queryCatalog(items.filter((p) => p.slug !== 'quote'), { collection: 'all', sort: 'desc' });
    expect(desc.products.map((p) => p.slug)[0]).toBe('rich');
  });

  it('off sort orders by discount (observed ?s=off)', () => {
    const r = queryCatalog(items, { collection: 'all', sort: 'off' });
    expect(productOff(r.products[0])).toBe(50);
  });

  it('load-more extends a stable snapshot without duplicates (C02)', () => {
    const many = Array.from({ length: 60 }, (_, i) => mk(`p${i}`, [100000 + i], ['hoa-bo'], i));
    const page1 = queryCatalog(many, { collection: 'hoa-bo', sort: 'featured', shown: 24 });
    const page2 = queryCatalog(many, { collection: 'hoa-bo', sort: 'featured', shown: 48 });
    expect(page1.products).toHaveLength(24);
    expect(page2.products).toHaveLength(48);
    const first24OfPage2 = page2.products.slice(0, 24).map((p) => p.slug);
    expect(first24OfPage2).toEqual(page1.products.map((p) => p.slug)); // no reordering when appending
    const slugs = page2.products.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(48); // no duplicates
    expect(page2.hasMore).toBe(true);
    const all = queryCatalog(many, { collection: 'hoa-bo', sort: 'featured', shown: 60 });
    expect(all.hasMore).toBe(false);
  });

  it('empty result is distinct from failure data (C03)', () => {
    const r = queryCatalog(items, { collection: 'hoa-cuoi', sort: 'featured' });
    expect(r.products).toHaveLength(0);
    expect(r.totalMatching).toBe(0);
  });
});

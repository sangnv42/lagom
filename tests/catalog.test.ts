import { describe, expect, it } from 'vitest';
import { CATALOG, PRODUCTS, getProduct, inCollection } from '../src/data/catalog';

describe('observed catalog (P01/P02 + evidence rules)', () => {
  it('A0302 bo-hoa-mini-xinh has Vừa 380000 / To 700000 (S11)', () => {
    const p = getProduct('bo-hoa-mini-xinh');
    expect(p).not.toBeNull();
    expect(p!.sku).toBe('A0302');
    expect(p!.variants.map((v) => [v.label, v.priceVnd])).toEqual([
      ['Vừa', 380000],
      ['To', 700000],
    ]);
  });

  it('A0015 bo-hoa-cuc-tana-20-10-a037 has Vừa 750000 / To 1100000 (S12)', () => {
    const p = getProduct('bo-hoa-cuc-tana-20-10-a037');
    expect(p!.sku).toBe('A0015');
    expect(p!.variants.map((v) => [v.label, v.priceVnd])).toEqual([
      ['Vừa', 750000],
      ['To', 1100000],
    ]);
  });

  it('SKU is taken from the title code, never reconstructed from the slug', () => {
    const p = getProduct('bo-hoa-cuc-tana-20-10-a037');
    expect(p!.sku).toBe('A0015'); // NOT A0037 from the "a037" slug segment
  });

  it('kệ hoa products and the hoa-ke-1 collection are removed (observed owner decision)', () => {
    expect(CATALOG.collections.some((c) => c.slug === 'hoa-ke-1')).toBe(false);
    expect(PRODUCTS.some((p) => p.collectionSlugs.includes('hoa-ke-1'))).toBe(false);
    expect(PRODUCTS.some((p) => /kệ/i.test(p.title))).toBe(false);
  });

  it('virtual qua-20-10 spans its four source collections', () => {
    const sample = PRODUCTS.find((p) => p.collectionSlugs.includes('hoa-hop'));
    expect(sample && inCollection(sample, 'qua-20-10')).toBeTruthy();
    expect(inCollection(PRODUCTS.find((p) => p.collectionSlugs.includes('hoa-cuoi'))!, 'qua-20-10')).toBeFalsy();
  });

  it('unknown slugs return null (explicit not-found)', () => {
    expect(getProduct('khong-ton-tai-xyz')).toBeNull();
  });

  it('all products are evidence-backed (no synthetic records in the shipped catalog)', () => {
    expect(PRODUCTS.length).toBeGreaterThan(280);
    expect(PRODUCTS.every((p) => p.evidence.isFixture === false)).toBe(true);
  });
});

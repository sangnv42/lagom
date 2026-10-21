import { describe, expect, it } from 'vitest';
import { SHOP, STORES, STORE_REVIEW_SCORE, STORE_REVIEW_TOTAL } from '../src/data/business.ts';

describe('store contact details', () => {
  it('lists the two current branches with their own numbers', () => {
    expect(STORES.map((s) => s.name)).toEqual(['Lagom Flower Dĩ An', 'Lagom Flower Biên Hoà']);
    expect(STORES.map((s) => s.phone)).toEqual(['0353198089', '0353198072']);
    expect(STORES[0].address).toBe('63 Trần Hưng Đạo, Dĩ An');
  });

  it('uses the primary branch for the site-wide phone, Zalo and map', () => {
    expect(SHOP.phone).toBe(STORES[0].phone);
    expect(SHOP.zalo).toBe('https://zalo.me/0353198089');
    expect(SHOP.address).toBe(STORES[0].address);
  });

  it('aggregates Google reviews across branches', () => {
    expect(STORE_REVIEW_TOTAL).toBe(80);
    expect(STORE_REVIEW_SCORE).toBe('4.7');
  });
});

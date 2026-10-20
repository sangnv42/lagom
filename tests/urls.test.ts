import { describe, expect, it } from 'vitest';
import {
  collectionUrl,
  decodeCollectionQuery,
  encodeCollectionQuery,
  needsTrailingSlash,
  productUrl,
} from '../src/lib/urls';
import { REDIRECTS } from '../src/data/business';

describe('URL construction + query codec', () => {
  it('canonical links are origin-relative with trailing slash (no nested product paths)', () => {
    expect(productUrl('bo-hoa-mini-xinh')).toBe('/products/bo-hoa-mini-xinh/');
    expect(collectionUrl('qua-20-10', 'p=u500')).toBe('/collections/qua-20-10/?p=u500');
  });

  it('codec round-trips t/p/s (R02 back/forward state)', () => {
    const encoded = encodeCollectionQuery({ c: 'hoa-bo', t: 'Hoa bó', p: '500-1tr', s: 'asc' });
    const decoded = decodeCollectionQuery('hoa-bo', '?' + encoded);
    expect(decoded).toEqual({ c: 'hoa-bo', t: 'Hoa bó', p: '500-1tr', s: 'asc' });
  });

  it('default sort is omitted; s=off is preserved and unknown sorts fall back to featured', () => {
    expect(encodeCollectionQuery({ c: 'all', t: '', p: '', s: 'featured' })).toBe('');
    expect(decodeCollectionQuery('all', '?s=off').s).toBe('off');
    expect(decodeCollectionQuery('all', '?s=bogus').s).toBe('featured');
  });

  it('trailing-slash normalization targets: bare routes only, never files', () => {
    expect(needsTrailingSlash('/collections/all')).toBe(true);
    expect(needsTrailingSlash('/collections/all/')).toBe(false);
    expect(needsTrailingSlash('/products/bo-hoa-mini-xinh')).toBe(true);
    expect(needsTrailingSlash('/img/logo-gold.webp')).toBe(false);
    expect(needsTrailingSlash('/')).toBe(false);
  });

  it('redirect registry has no self-loops and targets known routes (R02)', () => {
    for (const [from, to] of Object.entries(REDIRECTS)) {
      expect(from).not.toBe(to);
      expect(to.startsWith('/')).toBe(true);
    }
    expect(REDIRECTS['/pages/dieu-khoan-dich-vu/']).toBe('/pages/chinh-sach-doi-tra/');
    expect(REDIRECTS['/collections/hoa-ke-1/']).toBe('/collections/hoa-khai-truong/');
    expect(REDIRECTS['/index.html']).toBe('/');
  });
});

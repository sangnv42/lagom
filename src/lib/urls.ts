// Canonical URL construction + query codec.
// Observed rules: canonical routes carry trailing slashes; internal links are origin-relative to avoid
// nested /products/.../products/ paths (audit "Unreadable URLs" finding); `?s=off` is the discount sort.

import { SORT_OPTIONS } from '../data/business';
import type { CatalogFilters } from '../domain/types';

export const productUrl = (slug: string): string => `/products/${encodeURIComponent(slug)}/`;
export const collectionUrl = (slug: string, query = ''): string =>
  `/collections/${encodeURIComponent(slug)}/${query ? '?' + query : ''}`;

/** Legacy-compatible collection lookup value (kept as `?c=` on old links; not used in canonical URLs). */
export function parseCollectionParam(sp: URLSearchParams): string | null {
  return sp.get('c');
}

export type CollectionQueryState = { c: string; t: string; p: string; s: string };

/** Decode collection URL state. Unknown s values fall back to 'featured' but are preserved on encode
 *  only when they are known sorts (compatibility: `s=off` is a verified discount sort). */
export function decodeCollectionQuery(slug: string, search: string): CollectionQueryState {
  const sp = new URLSearchParams(search);
  const sortRaw = sp.get('s') || 'featured';
  const known = SORT_OPTIONS.some((o) => o.value === sortRaw);
  return {
    c: slug,
    t: sp.get('t') || '',
    p: sp.get('p') || '',
    s: known ? sortRaw : 'featured',
  };
}

export function encodeCollectionQuery(st: CollectionQueryState): string {
  const sp = new URLSearchParams();
  if (st.t) sp.set('t', st.t);
  if (st.p) sp.set('p', st.p);
  if (st.s && st.s !== 'featured') sp.set('s', st.s);
  return sp.toString();
}

export function filtersFromState(st: CollectionQueryState): CatalogFilters {
  return {
    collection: st.c,
    type: st.t || undefined,
    bandId: st.p || undefined,
    sort: st.s as CatalogFilters['sort'],
  };
}

/** Ensure canonical trailing slash for site routes; asset-like paths are left alone. */
export function needsTrailingSlash(pathname: string): boolean {
  if (pathname.endsWith('/')) return false;
  if (pathname === '') return false;
  if (/\.[a-z0-9]+$/i.test(pathname)) return false; // files (js/css/webp/...)
  return true;
}

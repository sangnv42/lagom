// Catalog query: collection membership → attribute filters → stable sort → page slice.
// Rules mirror the observed collection runtime (docs/reference/captures/app.js `collection().run()`):
// - price band matches if ANY size price falls in the band; sorting then uses the matching size price
// - unpriced ("Liên hệ") designs always sort after priced ones
// - 'featured' keeps catalog (owner curation) order and pins the collection's featured design first
// - within-facet selection is single-value (observed chips); across facets it is AND

import { bandOf } from '../../data/business';
import { COLLECTION_PIN, inCollection } from '../../data/catalog';
import { discountPct, fromPriceVnd } from '../../lib/money';
import type { CatalogFilters, CatalogResult, Product } from '../../domain/types';

export const PAGE_SIZE = 24; // observed load-more batch

export const shownPrice = (p: Product, bandId?: string): number => {
  const band = bandOf(bandId);
  if (band) {
    const hit = p.variants.find((x) => x.priceVnd >= band.min && x.priceVnd <= band.max);
    if (hit) return hit.priceVnd;
  }
  return fromPriceVnd(p.variants.map((v) => v.priceVnd));
};

export const productOff = (p: Product): number => {
  const first = p.variants[0];
  return first ? discountPct(first.compareAtVnd, first.priceVnd) : 0;
};

function comparator(sort: CatalogFilters['sort'], bandId?: string, collection?: string) {
  const pin = collection ? COLLECTION_PIN[collection] : undefined;
  const price = (p: Product) => shownPrice(p, bandId);
  switch (sort) {
    case 'asc':
      return (a: Product, b: Product) => price(a) - price(b);
    case 'desc':
      return (a: Product, b: Product) => price(b) - price(a);
    case 'off':
      return (a: Product, b: Product) => productOff(b) - productOff(a);
    case 'new':
      return (a: Product, b: Product) => b.order - a.order;
    default:
      return (a: Product, b: Product) => {
        if (pin) {
          const ap = a.slug === pin ? 1 : 0;
          const bp = b.slug === pin ? 1 : 0;
          if (ap !== bp) return bp - ap;
        }
        if (!bandId) {
          // observed featured rule: designs under 500k go after the rest unless a price band is chosen
          const cheap = (p: Product) => (price(p) > 0 && price(p) < 500000 ? 1 : 0);
          const d = cheap(a) - cheap(b);
          if (d) return d;
        }
        return a.order - b.order;
      };
  }
}

export function filterProducts(products: Product[], f: CatalogFilters): Product[] {
  const band = bandOf(f.bandId);
  const inBand = (p: Product) =>
    !band || p.variants.some((x) => x.priceVnd >= band.min && x.priceVnd <= band.max);
  const list = products.filter(
    (p) => inCollection(p, f.collection) && (!f.type || p.flowerType === f.type) && inBand(p)
  );
  const cmp = comparator(f.sort, f.bandId, f.collection);
  // unpriced always last; sort is stable in V8 so equal keys keep catalog order
  return [...list].sort(
    (a, b) => (!fromPriceVnd(a.variants.map((v) => v.priceVnd)) ? 1 : 0) - (!fromPriceVnd(b.variants.map((v) => v.priceVnd)) ? 1 : 0) || cmp(a, b)
  );
}

export function queryCatalog(products: Product[], f: CatalogFilters): CatalogResult {
  const list = filterProducts(products, f);
  const shown = f.shown ?? PAGE_SIZE;
  return {
    products: list.slice(0, shown),
    totalMatching: list.length,
    hasMore: list.length > shown,
  };
}

// Product types available as "Loại hoa" filter chips (observed: 'Khác' and kệ hoa hidden;
// form types duplicate the collection chips and are shown only with their collection).
export function flowerTypes(products: Product[]): string[] {
  return [...new Set(products.map((p) => p.flowerType))].filter(
    (t) => t && t !== 'Khác' && !/^kệ hoa/i.test(t)
  );
}

export const TYPE_LABEL: Record<string, string> = {
  'Hoa giỏ': 'Giỏ hoa',
  'Hoa hộp': 'Hộp hoa',
};

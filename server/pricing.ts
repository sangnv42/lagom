// Single effective-price path (CAT-04, CAT-05, CAT-07). The public catalog, product detail, cart
// lookup and order-message builder all resolve prices through this module, so they cannot disagree.

export type PriceInput = {
  priceVnd: number | null | undefined;
  compareAtVnd?: number | null;
  salePriceVnd?: number | null;
  saleStart?: string | null; // ISO instant
  saleEnd?: string | null; // ISO instant, exclusive
};

export type EffectivePrice = {
  /** Amount the customer pays. null means "Liên hệ" — a quote, never a free item. */
  payableVnd: number | null;
  /** Display-only strikethrough amount; never payable (CAT-04). */
  compareAtVnd: number | null;
  onSale: boolean;
  /** True when the amount is unknown and the UI must show a quote state. */
  requiresQuote: boolean;
};

/**
 * Precedence: published sale price while its window is active, else published regular price.
 * Start is inclusive, end is exclusive. Both dates omitted means an ongoing sale.
 */
export function effectivePrice(variant: PriceInput, now: Date = new Date()): EffectivePrice {
  const compareAt = positiveOrNull(variant.compareAtVnd);
  const regular = positiveOrNull(variant.priceVnd);
  const sale = positiveOrNull(variant.salePriceVnd);
  const inWindow = sale !== null && withinSaleWindow(variant, now);

  const payable = inWindow ? sale : regular;
  return {
    payableVnd: payable,
    // A compare-at is only meaningful against the amount actually payable.
    compareAtVnd: compareAt !== null && payable !== null && compareAt > payable ? compareAt : null,
    onSale: inWindow && sale !== null && regular !== null && sale < regular,
    requiresQuote: payable === null,
  };
}

export function withinSaleWindow(variant: PriceInput, now: Date): boolean {
  const start = parseInstant(variant.saleStart);
  const end = parseInstant(variant.saleEnd);
  const t = now.getTime();
  if (start !== null && t < start) return false;
  if (end !== null && t >= end) return false; // end instant is exclusive
  return true;
}

/** Starting price shown on cards: lowest payable among variants, "Từ" when several are priced. */
export function startingPrice(variants: PriceInput[], now: Date = new Date()): { amountVnd: number | null; multiple: boolean } {
  const amounts = variants
    .map((v) => effectivePrice(v, now).payableVnd)
    .filter((n): n is number => n !== null);
  if (!amounts.length) return { amountVnd: null, multiple: false };
  return { amountVnd: Math.min(...amounts), multiple: amounts.length > 1 };
}

/**
 * Sale-window and compare-at validation, shared by the payload schema and the importer (CAT-03,
 * CAT-04). Returns human-readable problems; empty means valid.
 */
export function validateVariantPricing(v: PriceInput, path: string): string[] {
  const problems: string[] = [];
  if (v.priceVnd !== null && v.priceVnd !== undefined) {
    if (!Number.isInteger(v.priceVnd) || v.priceVnd < 0) problems.push(`${path}.priceVnd must be a whole number of dong, zero or above.`);
  }
  if (v.salePriceVnd !== null && v.salePriceVnd !== undefined) {
    if (!Number.isInteger(v.salePriceVnd) || v.salePriceVnd < 0) problems.push(`${path}.salePriceVnd must be a whole number of dong, zero or above.`);
  }
  const start = parseInstant(v.saleStart ?? null);
  const end = parseInstant(v.saleEnd ?? null);
  if (v.saleStart && start === null) problems.push(`${path}.saleStart is not a valid date.`);
  if (v.saleEnd && end === null) problems.push(`${path}.saleEnd is not a valid date.`);
  if (start !== null && end !== null && end <= start) problems.push(`${path}: sale end must come after sale start.`);
  if (v.salePriceVnd != null && v.salePriceVnd > 0) {
    const base = v.priceVnd ?? 0;
    if (base > 0 && v.salePriceVnd >= base) problems.push(`${path}: sale price must be below the regular price.`);
  }
  if (v.compareAtVnd != null && v.compareAtVnd > 0) {
    const payable = v.salePriceVnd && v.salePriceVnd > 0 ? v.salePriceVnd : (v.priceVnd ?? 0);
    if (payable > 0 && v.compareAtVnd <= payable) problems.push(`${path}: compare-at price must exceed the effective price.`);
  }
  return problems;
}

function positiveOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function parseInstant(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

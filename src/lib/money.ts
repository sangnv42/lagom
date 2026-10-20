// VND money helpers. VND has no minor unit: all amounts are integers (docs/reference/engineering/02).
export type MoneyVnd = number;

export function assertMoney(v: unknown): MoneyVnd {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
    throw new TypeError(`Invalid VND amount: ${String(v)}`);
  }
  return v;
}

// Captured from reference app.js: dot thousands separator + trailing 'đ'.
export function fmt(n: number): string {
  return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
}

// Unknown price is "Liên hệ" — never zero/free (D05: unknown must not default to zero).
export function pfmt(n: number | null | undefined): string {
  return n && n > 0 ? fmt(n) : 'Liên hệ';
}

// Proposed discount formula from engineering/02; matches reference `off` rule (badge shown at >= 10%).
export function discountPct(compareAt: number | null, price: number): number {
  if (compareAt && compareAt > price && price > 0) return Math.round((1 - price / compareAt) * 100);
  return 0;
}

export const SALE_BADGE_MIN_PCT = 10; // observed: `p.off >= 10` shows the badge

// Starting price rule (observed card behavior): min price among priced variants;
// 0/null when no variant is priced (quote-only). The "Từ " prefix appears with 2+ priced variants.
export function fromPriceVnd(prices: (number | null)[]): number {
  const priced = prices.filter((p): p is number => typeof p === 'number' && p > 0);
  return priced.length ? Math.min(...priced) : 0;
}

export function hasMultiplePricedVariants(variants: { price: number | null }[]): boolean {
  return variants.filter((v) => v.price && v.price > 0).length > 1;
}

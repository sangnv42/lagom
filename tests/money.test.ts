import { describe, expect, it } from 'vitest';
import { discountPct, fmt, fromPriceVnd, pfmt, assertMoney } from '../src/lib/money';

describe('money (integer VND, observed vi-VN formatting)', () => {
  it('formats with dot separators and đ suffix (captured pfmt/fmt)', () => {
    expect(fmt(1510000)).toBe('1.510.000đ');
    expect(fmt(380000)).toBe('380.000đ');
  });
  it('unknown price renders "Liên hệ", never 0đ (D05)', () => {
    expect(pfmt(0)).toBe('Liên hệ');
    expect(pfmt(null)).toBe('Liên hệ');
    expect(pfmt(750000)).toBe('750.000đ');
  });
  it('validates integer amounts', () => {
    expect(assertMoney(380000)).toBe(380000);
    expect(() => assertMoney(380000.5)).toThrow(TypeError);
    expect(() => assertMoney(-1)).toThrow(TypeError);
  });
  it('discount formula per engineering/02 (only when compare > price > 0)', () => {
    expect(discountPct(750000, 380000)).toBe(49);
    expect(discountPct(380000, 750000)).toBe(0);
    expect(discountPct(null, 380000)).toBe(0);
    expect(discountPct(500000, 0)).toBe(0);
  });
  it('starting price = min priced variant; quote-only stays unknown', () => {
    expect(fromPriceVnd([700000, 380000, null])).toBe(380000);
    expect(fromPriceVnd([0, null])).toBe(0);
  });
  it('arithmetic check from engineering/02 (K03)', () => {
    expect(2 * 380000 + 1 * 750000).toBe(1510000);
  });
});

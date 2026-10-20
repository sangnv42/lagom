import { describe, expect, it } from 'vitest';
import {
  addLine,
  cartSubtotal,
  hydrateBuyer,
  hydrateCart,
  lineKey,
  removeLine,
  serializeCart,
  setQuantity,
  validatePhone,
  MAX_QTY,
} from '../src/features/cart/cart';
import type { CartLine } from '../src/domain/types';

const line = (over: Partial<CartLine> = {}): CartLine => ({
  productId: 'bo-hoa-mini-xinh',
  variantLabel: 'Vừa',
  quantity: 1,
  configuration: {},
  ...over,
});

const priceLookup = (id: string, v: string) => (id === 'bo-hoa-mini-xinh' ? (v === 'Vừa' ? 380000 : 700000) : id === 'a0015' ? 750000 : 0);

describe('cart (K01/K02/K03)', () => {
  it('same variant + same configuration merges quantity', () => {
    let c = addLine([], line());
    c = addLine(c, line());
    expect(c).toHaveLength(1);
    expect(c[0].quantity).toBe(2);
  });

  it('same variant with a different message/date stays a separate line (K01)', () => {
    let c = addLine([], line({ configuration: { message: 'Chúc mừng 20/10' } }));
    c = addLine(c, line({ configuration: { message: 'Sinh nhật vui vẻ' } }));
    c = addLine(c, line({ configuration: { deliveryDate: '2026-10-20' } }));
    expect(c).toHaveLength(3);
    expect(lineKey(c[0])).not.toBe(lineKey(c[1]));
  });

  it('quantity clamps to 1..MAX_QTY', () => {
    const c = addLine([], line({ quantity: 999999 }));
    expect(c[0].quantity).toBe(MAX_QTY);
    expect(setQuantity(c, 0, -5)[0].quantity).toBe(1);
  });

  it('subtotal uses current catalog prices (K03: 2×380000 + 750000 = 1510000)', () => {
    const c = [line({ quantity: 2 }), line({ productId: 'a0015', variantLabel: 'Vừa' })];
    expect(cartSubtotal(c, priceLookup)).toBe(1510000);
  });

  it('remove drops exactly one line', () => {
    const c = [line(), line({ productId: 'x' })];
    expect(removeLine(c, 0)).toHaveLength(1);
  });

  it('corrupt storage hydrates to empty instead of crashing (K02)', () => {
    expect(hydrateCart('{not json')).toEqual([]);
    expect(hydrateCart('{"not":"an array"}')).toEqual([]);
    expect(hydrateCart(null)).toEqual([]);
  });

  it('malformed entries are dropped on hydration, valid ones kept', () => {
    const raw = JSON.stringify([
      { h: 'bo-hoa-mini-xinh', v: 'Vừa', qty: 2, msg: 'ok' },
      { junk: true },
      'string',
    ]);
    const c = hydrateCart(raw);
    expect(c).toHaveLength(1);
    expect(c[0].configuration.message).toBe('ok');
  });

  it('serialize→hydrate round-trips lines with configuration', () => {
    const c = [line({ configuration: { deliveryDate: '2026-10-20', slot: '08:00 – 11:00', recipient: 'Chị Lan', message: 'xin chào' } })];
    expect(hydrateCart(serializeCart(c))).toEqual(c);
  });

  it('buyer hydration defaults to empty strings', () => {
    expect(hydrateBuyer('garbage!')).toEqual({ name: '', phone: '', note: '' });
    expect(hydrateBuyer(JSON.stringify({ name: 'A', phone: '0901234567', note: 'n' }))).toEqual({ name: 'A', phone: '0901234567', note: 'n' });
  });

  it('phone validation (observed rule: optional 10-digit, +84 normalized)', () => {
    expect(validatePhone('')).toBeNull();
    expect(validatePhone('0901234567')).toBeNull();
    expect(validatePhone('+84901234567')).toBeNull();
    expect(validatePhone('090123456')).not.toBeNull();
  });
});

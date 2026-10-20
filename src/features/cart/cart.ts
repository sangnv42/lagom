// Cart domain: line identity, merging, totals, validation, versioned persistence (storage-agnostic so
// it is testable without a DOM). Observed persistence keys from captures/app.js: archC_cart / archC_buyer.
// Observed merge identity: product + size + date + slot + district + address + recipient + message.

import type { Buyer, CartLine, CartLineConfiguration } from '../../domain/types';

export const CART_STORAGE_KEY = 'archC_cart';
export const BUYER_STORAGE_KEY = 'archC_buyer';
export const MAX_QTY = 999;
export const BULK_NOTE_MIN = 10; // observed: >=10 items suggests contacting for bulk pricing

export type RawCartEntry = {
  h: string;
  v: string;
  price: number;
  qty: number;
  date?: string;
  slot?: string;
  district?: string;
  addr?: string;
  to?: string;
  msg?: string;
};

export function lineKey(l: CartLine): string {
  const c = l.configuration;
  return [l.productId, l.variantLabel, c.deliveryDate ?? '', c.slot ?? '', c.district ?? '', c.address ?? '', c.recipient ?? '', c.message ?? ''].join('|');
}

export function addLine(cart: CartLine[], next: CartLine): CartLine[] {
  const qty = Math.max(1, Math.min(MAX_QTY, Math.trunc(next.quantity) || 1));
  const key = lineKey(next);
  const idx = cart.findIndex((l) => lineKey(l) === key);
  if (idx >= 0) {
    const merged = { ...cart[idx], quantity: Math.min(MAX_QTY, cart[idx].quantity + qty), configuration: { ...next.configuration } };
    return cart.map((l, i) => (i === idx ? merged : l));
  }
  return [...cart, { ...next, quantity: qty }];
}

export function setQuantity(cart: CartLine[], index: number, qty: number): CartLine[] {
  return cart.map((l, i) => (i === index ? { ...l, quantity: Math.max(1, Math.min(MAX_QTY, Math.trunc(qty) || 1)) } : l));
}

export function removeLine(cart: CartLine[], index: number): CartLine[] {
  return cart.filter((_, i) => i !== index);
}

export function cartUnitPrice(line: CartLine, priceLookup: (productId: string, variantLabel: string) => number): number {
  return priceLookup(line.productId, line.variantLabel);
}

/** Subtotal computed from the CURRENT catalog prices (display snapshots are not a price source). */
export function cartSubtotal(cart: CartLine[], priceLookup: (productId: string, variantLabel: string) => number): number {
  return cart.reduce((s, l) => s + cartUnitPrice(l, priceLookup) * l.quantity, 0);
}

export function cartItemCount(cart: CartLine[]): number {
  return cart.reduce((s, l) => s + l.quantity, 0);
}

/** Shipping is always "unknown — shop confirms" per observed content; never defaults to zero. */
export const SHIPPING_UNKNOWN = { status: 'unknown', amountVnd: null } as const;

// ---- validation of hydrated storage ----
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;

export function hydrateCart(json: string | null): CartLine[] {
  if (!json) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return []; // corrupt storage must not crash the app
  }
  if (!Array.isArray(parsed)) return [];
  const out: CartLine[] = [];
  for (const item of parsed) {
    if (!isObj(item) || typeof item.h !== 'string' || typeof item.v !== 'string') continue;
    const qty = Math.max(1, Math.min(MAX_QTY, Math.trunc(Number(item.qty)) || 1));
    const configuration: CartLineConfiguration = {
      deliveryDate: typeof item.date === 'string' ? item.date : undefined,
      slot: typeof item.slot === 'string' ? item.slot : undefined,
      district: typeof item.district === 'string' ? item.district : undefined,
      address: typeof item.addr === 'string' ? item.addr : undefined,
      recipient: typeof item.to === 'string' ? item.to : undefined,
      message: typeof item.msg === 'string' ? item.msg : undefined,
    };
    out.push({ productId: item.h, variantLabel: item.v, quantity: qty, configuration });
  }
  return out;
}

export function serializeCart(cart: CartLine[]): string {
  const raw: (RawCartEntry & { qty: number })[] = cart.map((l) => ({
    h: l.productId,
    v: l.variantLabel,
    price: 0, // price is intentionally NOT trusted from storage; recomputed from catalog
    qty: l.quantity,
    date: l.configuration.deliveryDate,
    slot: l.configuration.slot,
    district: l.configuration.district,
    addr: l.configuration.address,
    to: l.configuration.recipient,
    msg: l.configuration.message,
  }));
  return JSON.stringify(raw);
}

export function hydrateBuyer(json: string | null): Buyer {
  const empty: Buyer = { name: '', phone: '', note: '' };
  if (!json) return empty;
  try {
    const p = JSON.parse(json);
    if (!isObj(p)) return empty;
    return {
      name: typeof p.name === 'string' ? p.name : '',
      phone: typeof p.phone === 'string' ? p.phone : '',
      note: typeof p.note === 'string' ? p.note : typeof p.addr === 'string' ? '' : '',
    };
  } catch {
    return empty;
  }
}

// Observed buyer-phone validation: optional, but when present must be a 10-digit VN number.
export function validatePhone(value: string): string | null {
  const digits = value.replace(/[^\d+]/g, '').replace(/^\+?84/, '0');
  if (digits && !/^0\d{9}$/.test(digits)) return 'Số điện thoại cần 10 số (ví dụ 0901 234 567), hoặc để trống';
  return null;
}

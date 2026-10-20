// Vietnamese order/handoff message builders — text patterns transcribed from the captured reference
// (docs/reference/captures/app.js). These are the content the copy-to-Zalo sheet prepares.

import { fmt, pfmt } from '../../lib/money';
import { ddMM } from '../../lib/vntime';
import { SITE_URL, SHOP } from '../../data/business';
import { getProduct } from '../../data/catalog';
import { productUrl } from '../../lib/urls';
import type { Buyer, CartLine } from '../../domain/types';

const absProduct = (slug: string): string => new URL(productUrl(slug), SITE_URL).href;

/** "Ask price" message for a quote-only design (observed `zAsk`). */
export function askMessage(slug: string): string {
  const p = getProduct(slug);
  if (!p) return `Chào shop, mình muốn hỏi mẫu hoa: ${absProduct(slug)}`;
  return `Chào shop, mình muốn hỏi mẫu ${p.title}${p.sku ? ' (' + p.sku + ')' : ''}: ${absProduct(p.slug)}`;
}

export type LineDisplay = CartLine & { price: number; name: string; code: string };

export function decorateLines(lines: CartLine[]): LineDisplay[] {
  return lines.map((l) => {
    const p = getProduct(l.productId);
    const variant = p?.variants.find((v) => v.label === l.variantLabel) ?? p?.variants[0];
    return { ...l, price: variant?.priceVnd ?? 0, name: p?.title ?? l.productId, code: p?.sku ?? '' };
  });
}

/** Single-product order message with current PDP configuration (observed `zForm`). */
export function productOrderMessage(opts: {
  slug: string;
  variantLabel: string;
  price: number;
  date: string;
  slot: string;
  address?: string;
  district?: string;
  recipient?: string;
  message?: string;
}): string {
  const p = getProduct(opts.slug);
  const name = p?.title ?? opts.slug;
  const code = p?.sku ? ` (${p.sku})` : '';
  const where = [opts.address, opts.district].filter(Boolean).join(', ');
  return [
    `Chào Larom Flower, mình muốn đặt mẫu ${name}${code}`,
    `Size: ${opts.variantLabel} – ${pfmt(opts.price)}`,
    opts.date && `Giao: ${ddMM(opts.date)}, ${opts.slot}`,
    where && `Giao tới: ${where}`,
    opts.recipient && `Người nhận: ${opts.recipient}`,
    opts.message && `Lời thiệp: ${opts.message}`,
    absProduct(opts.slug),
  ]
    .filter(Boolean)
    .join('\n');
}

/** Full-cart order message (observed dForm submit builder). */
export function cartOrderMessage(lines: CartLine[], buyer: Buyer): { text: string; total: number } {
  const items = decorateLines(lines);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const row = (i: LineDisplay, k: number): string => {
    const c = i.configuration;
    const where = [c.address, c.district].filter(Boolean).join(', ');
    return (
      `${k + 1}. ${i.name}${i.code ? ' (' + i.code + ')' : ''}\n` +
      `   Size: ${i.variantLabel} × ${i.quantity} = ${fmt(i.price * i.quantity)}` +
      (c.deliveryDate ? `\n   Giao: ${ddMM(c.deliveryDate)}${c.slot ? ', ' + c.slot : ''}` : '') +
      (where ? `\n   Giao tới: ${where}` : '') +
      (c.recipient ? `\n   Người nhận: ${c.recipient}` : '') +
      (c.message ? `\n   Lời thiệp: ${c.message}` : '') +
      `\n   ${absProduct(i.productId)}`
    );
  };
  const digits = buyer.phone.replace(/[^\d+]/g, '').replace(/^\+?84/, '0');
  const who = [buyer.name, digits].filter(Boolean).join(' – ');
  const text =
    `Chào Larom Flower, mình muốn đặt:\n${items.map(row).join('\n')}\nTạm tính: ${fmt(total)}` +
    (who ? `\nNgười đặt: ${who}` : '') +
    (buyer.note ? `\nGhi chú: ${buyer.note}` : '');
  return { text, total };
}

export const CONTACT_NOTE = 'Không cần tài khoản: đơn được chép sẵn, bạn mở Zalo của shop, dán và gửi. Shop xác nhận, gửi ảnh và video hoa trước khi giao.';
export const SHIPPING_NOTE = 'Phí giao theo khu vực, shop báo lại khi xác nhận. Thanh toán COD / chuyển khoản.';
export const CONTACT_PHONE = SHOP.phoneTxt;

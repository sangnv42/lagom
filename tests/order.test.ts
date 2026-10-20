import { describe, expect, it } from 'vitest';
import { contactAdapter, createDemoApiAdapter } from '../src/features/order/adapters';
import { askMessage, cartOrderMessage } from '../src/features/order/messages';
import type { CartLine } from '../src/domain/types';

const lines: CartLine[] = [
  {
    productId: 'bo-hoa-mini-xinh',
    variantLabel: 'Vừa',
    quantity: 2,
    configuration: { deliveryDate: '2026-10-19', slot: '08:00 – 11:00', message: 'Chúc mừng 20/10' },
  },
  {
    productId: 'bo-hoa-cuc-tana-20-10-a037',
    variantLabel: 'Vừa',
    quantity: 1,
    configuration: {},
  },
];

describe('order adapters (O01/O02)', () => {
  it('O01: repeat submission with the same idempotency key returns one order', async () => {
    const api = createDemoApiAdapter();
    const draft = { lines, message: 'x' };
    const a = await api.submit(draft, 'key-1');
    const b = await api.submit(draft, 'key-1');
    expect(a).toEqual(b);
    expect(a.status).toBe('pending-confirmation');
    const c = await api.submit(draft, 'key-2');
    expect((c as { orderId: string }).orderId).not.toBe((a as { orderId: string }).orderId);
  });

  it('O02: contact handoff never reports a submitted order or invents an order id', async () => {
    const res = await contactAdapter.submit({ lines, message: 'nội dung đơn' }, 'k');
    expect(res.status).toBe('handoff-ready');
    expect('orderId' in res).toBe(false);
    expect(contactAdapter.prepare({ lines, message: 'nội dung đơn' }).message).toBe('nội dung đơn');
  });

  it('cart order message lists lines, delivery config, messages and the running total', () => {
    const { text, total } = cartOrderMessage(lines, { name: 'Minh', phone: '0901234567', note: 'Giao giờ hành chính' });
    expect(total).toBe(2 * 380000 + 750000); // 1.510.000đ
    expect(text).toContain('(A0302)'); // cleaned code from the proofread title
    expect(text).toContain('Size: Vừa × 2 = 760.000đ');
    expect(text).toContain('Giao: 19/10/2026, 08:00 – 11:00'); // observed reverse-join keeps the year
    expect(text).toContain('Lời thiệp: Chúc mừng 20/10');
    expect(text).toContain('Tạm tính: 1.510.000đ');
    expect(text).toContain('Người đặt: Minh – 0901234567');
    expect(text).toContain('Ghi chú: Giao giờ hành chính');
  });

  it('quote-only ask message carries the design name and a deep link (no price)', () => {
    const msg = askMessage('gio-hoa-hong-vang-kem'); // owner-supplied, price 0
    expect(msg).toContain('mình muốn hỏi mẫu');
    expect(msg).toContain('/products/gio-hoa-hong-vang-kem/');
    expect(msg).not.toContain('0đ');
  });
});

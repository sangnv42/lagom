// Order adapters. The verified reference has NO order API: it prepares a Zalo message, opens the chat,
// and the customer sends it (contact handoff). Opening the link is NOT an order success — the model keeps
// these states distinct. A local demo API adapter exists for testing submission semantics (idempotency)
// without contacting any external service; it must never be presented as a real transaction.

import type { CartLine, OrderResult } from '../../domain/types';

export type OrderDraft = {
  lines: CartLine[];
  message: string; // fully rendered Vietnamese order summary
  buyer?: { name: string; phone: string; note: string };
};

export interface OrderAdapter {
  readonly kind: 'contact' | 'demo-api';
  prepare(draft: OrderDraft): { status: 'handoff-ready'; message: string };
  submit(draft: OrderDraft, idempotencyKey: string): Promise<OrderResult>;
}

/** Contact handoff: content preparation only. submit() never invents a server order id. */
export const contactAdapter: OrderAdapter = {
  kind: 'contact',
  prepare: (draft) => ({ status: 'handoff-ready', message: draft.message }),
  submit: async () => ({
    status: 'handoff-ready',
    message: 'Nội dung đơn đã chuẩn bị — khách vẫn cần mở Zalo và tự gửi.',
  }),
};

/** Local demo API adapter (in-memory). Deterministic order ids; duplicate idempotency keys return
 *  the original acknowledgment instead of creating a second order. NEVER point this at the reference site. */
export function createDemoApiAdapter(): OrderAdapter & { reset(): void } {
  const byKey = new Map<string, OrderResult>();
  let seq = 0;
  return {
    kind: 'demo-api',
    prepare: (draft) => ({ status: 'handoff-ready', message: draft.message }),
    reset: () => byKey.clear(),
    submit: async (_draft, idempotencyKey) => {
      const existing = byKey.get(idempotencyKey);
      if (existing) return existing;
      seq += 1;
      const result: OrderResult = { status: 'pending-confirmation', orderId: `DEMO-${Date.now()}-${seq}` };
      byKey.set(idempotencyKey, result);
      return result;
    },
  };
}

export const DEMO_ADAPTER_NOTE =
  'Demo API adapter: đơn nháp được xử lý trong bộ nhớ trình duyệt, không gửi tới bất kỳ dịch vụ nào; ' +
  'trạng thái pending-confirmation không phải đơn thật.';

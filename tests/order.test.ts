import { describe, expect, it } from "vitest";
import {
    contactAdapter,
    createDemoApiAdapter,
} from "../src/features/order/adapters";
import { askMessage, cartOrderMessage } from "../src/features/order/messages";
import type { CartLine } from "../src/domain/types";

const lines: CartLine[] = [
    {
        productId: "hoa-1",
        variantLabel: "Tiêu chuẩn",
        quantity: 2,
        configuration: {
            deliveryDate: "2026-10-19",
            slot: "08:00 – 11:00",
            message: "Chúc mừng 20/10",
        },
    },
    {
        productId: "hoa-2",
        variantLabel: "Tiêu chuẩn",
        quantity: 1,
        configuration: {},
    },
];

describe("order adapters (O01/O02)", () => {
    it("O01: repeat submission with the same idempotency key returns one order", async () => {
        const api = createDemoApiAdapter();
        const draft = { lines, message: "x" };
        const a = await api.submit(draft, "key-1");
        const b = await api.submit(draft, "key-1");
        expect(a).toEqual(b);
        expect(a.status).toBe("pending-confirmation");
        const c = await api.submit(draft, "key-2");
        expect((c as { orderId: string }).orderId).not.toBe(
            (a as { orderId: string }).orderId,
        );
    });

    it("O02: contact handoff never reports a submitted order or invents an order id", async () => {
        const res = await contactAdapter.submit(
            { lines, message: "nội dung đơn" },
            "k",
        );
        expect(res.status).toBe("handoff-ready");
        expect("orderId" in res).toBe(false);
        expect(
            contactAdapter.prepare({ lines, message: "nội dung đơn" }).message,
        ).toBe("nội dung đơn");
    });

    it("cart order message lists lines, delivery config, messages and the running total", () => {
        const { text, total } = cartOrderMessage(lines, {
            name: "Minh",
            phone: "0901234567",
            note: "Giao giờ hành chính",
        });
        expect(total).toBe(2 * 500000 + 650000); // hoa-1 500k ×2 + hoa-2 650k = 1.650.000đ
        expect(text).toContain("Hoa Lagom số 1");
        expect(text).toContain("Hoa Lagom số 2");
        expect(text).toContain("Size: Tiêu chuẩn × 2 = 1.000.000đ");
        expect(text).toContain("Giao: 19/10/2026, 08:00 – 11:00"); // observed reverse-join keeps the year
        expect(text).toContain("Lời thiệp: Chúc mừng 20/10");
        expect(text).toContain("Tạm tính: 1.650.000đ");
        expect(text).toContain("Người đặt: Minh – 0901234567");
        expect(text).toContain("Ghi chú: Giao giờ hành chính");
    });

    it("ask message carries the design name and a deep link (no price)", () => {
        const msg = askMessage("hoa-39b");
        expect(msg).toContain("mình muốn hỏi mẫu");
        expect(msg).toContain("Hoa Lagom số 39B");
        expect(msg).toContain("/products/hoa-39b/");
        expect(msg).not.toContain("đ:");
    });
});

import { describe, expect, it } from "vitest";
import {
    getProduct,
    PRODUCTS,
    inCollection,
    COLLECTIONS,
} from "../src/data/catalog";
import { queryCatalog } from "../src/features/catalog/query";
import pricesJson from "../src/data/flower-prices.json";

type PriceItem = {
    product_number: number;
    price_vnd: number;
    cropped_image: string;
};
const items = pricesJson.items as PriceItem[];

describe("catalog from owner price list", () => {
    it("contains exactly the 60 priced flowers, one per image", () => {
        expect(PRODUCTS.length).toBe(60);
        expect(new Set(PRODUCTS.map((p) => p.slug)).size).toBe(60);
        expect(new Set(PRODUCTS.flatMap((p) => p.imagePaths)).size).toBe(60);
    });

    it("every flower carries the price and image of its price-list row", () => {
        const seen = new Map<number, number>();
        items.forEach((it, i) => {
            const count = (seen.get(it.product_number) ?? 0) + 1;
            seen.set(it.product_number, count);
            const p = PRODUCTS[i];
            expect(p.slug).toBe(
                `hoa-${it.product_number}${count > 1 ? String.fromCharCode(64 + count).toLowerCase() : ""}`,
            );
            expect(p.variants[0].priceVnd).toBe(it.price_vnd);
            expect(p.imagePaths).toEqual([`/img/hoa/${it.cropped_image}`]);
        });
    });

    it("hoa-1 maps to 500.000đ and trang_01_anh_01.jpg", () => {
        const p = getProduct("hoa-1");
        expect(p).not.toBeNull();
        expect(p!.title).toBe("Hoa Lagom số 1");
        expect(p!.variants[0].priceVnd).toBe(500000);
        expect(p!.imagePaths).toEqual(["/img/hoa/trang_01_anh_01.jpg"]);
    });

    it("duplicate printed numbers get B variants with their own prices (39/40/41)", () => {
        expect(getProduct("hoa-39")!.variants[0].priceVnd).toBe(650000);
        expect(getProduct("hoa-39b")!.variants[0].priceVnd).toBe(950000);
        expect(getProduct("hoa-39b")!.title).toBe("Hoa Lagom số 39B");
        expect(getProduct("hoa-40b")!.variants[0].priceVnd).toBe(1800000);
        expect(getProduct("hoa-41b")!.variants[0].priceVnd).toBe(750000);
    });

    it("every flower is listed in every real collection (owner choice)", () => {
        for (const c of COLLECTIONS) {
            expect(
                queryCatalog(PRODUCTS, { collection: c.slug, sort: "featured" })
                    .totalMatching,
            ).toBe(60);
        }
        for (const p of PRODUCTS) expect(inCollection(p, "hoa-bo")).toBe(true);
    });

    it("no quoted product is free", () => {
        for (const p of PRODUCTS)
            expect(p.variants[0].priceVnd).toBeGreaterThan(0);
    });
});

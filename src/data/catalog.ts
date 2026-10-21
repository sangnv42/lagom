// Catalog built from the owner's price list (flower_prices.json → src/data/flower-prices.json):
// 60 flower photos, one product each, with the price bound to its own image. Per the owner's
// decision every flower belongs to every real collection, so all category pages list the same set.
// Titles are numbered ("Hoa Lagom số N"); duplicated printed numbers (39/40/41) get a "B" suffix
// on their second appearance, matching the source notes.

import prices from "./flower-prices.json";
import type { Collection, Product, ProductVariant } from "../domain/types";

const CAPTURE_DATE = "2026-10-20";
const SOURCE_URL = "flower_prices.json (owner price list, provided 2026-10-20)";

type PriceItem = {
    id: string;
    product_number: number;
    price_vnd: number;
    price_label: string;
    cropped_image: string;
};

// Real collections kept from the original storefront structure (hoa-ke-1 was removed at the owner's request).
const REAL_COLLECTIONS: { slug: string; name: string }[] = [
    { slug: "bo-suu-tap-moi", name: "Bộ sưu tập mới" },
    { slug: "hoa-bo", name: "Hoa bó" },
    { slug: "hoa-gio", name: "Giỏ hoa" },
    { slug: "hoa-hop", name: "Hộp hoa" },
    { slug: "hoa-khai-truong", name: "Hoa khai trương" },
    { slug: "hoa-sinh-nhat", name: "Hoa sinh nhật" },
    { slug: "hoa-cuoi", name: "Hoa cưới" },
];
const ALL_SLUGS = REAL_COLLECTIONS.map((c) => c.slug);

const items = prices.items as PriceItem[];

function toProduct(it: PriceItem, order: number, dupSuffix: string): Product {
    const n = it.product_number;
    const slug = `hoa-${n}${dupSuffix.toLowerCase()}`;
    const variant: ProductVariant = {
        id: `${slug}-v0`,
        label: "Tiêu chuẩn",
        priceVnd: it.price_vnd,
        compareAtVnd: null,
    };
    return {
        id: slug,
        slug,
        sku: "",
        title: `Hoa Lagom số ${n}${dupSuffix}`,
        description: "",
        collectionSlugs: ALL_SLUGS,
        flowerType: "",
        tags: [],
        imagePaths: [`/img/hoa/${it.cropped_image}`],
        variants: [variant],
        order,
        evidence: {
            sourceUrl: SOURCE_URL,
            verifiedAt: CAPTURE_DATE,
            isFixture: false,
        },
    };
}

const PRODUCTS_LIST: Product[] = (() => {
    const seen = new Map<number, number>();
    return items.map((it, i) => {
        const count = (seen.get(it.product_number) ?? 0) + 1;
        seen.set(it.product_number, count);
        return toProduct(
            it,
            i,
            count > 1 ? String.fromCharCode(64 + count) : "",
        );
    });
})();

const COLLECTIONS_LIST: Collection[] = [
    ...REAL_COLLECTIONS.map((c) => ({ slug: c.slug, title: c.name })),
    { slug: "qua-20-10", title: "Quà 20/10", virtual: true },
    { slug: "all", title: "Tất cả hoa", virtual: true },
];

export const CATALOG = {
    products: PRODUCTS_LIST,
    collections: COLLECTIONS_LIST,
};
export const PRODUCTS = CATALOG.products;
export const COLLECTIONS = CATALOG.collections;

export function getProduct(slug: string): Product | null {
    return PRODUCTS.find((p) => p.slug === slug) ?? null;
}

export function getCollection(slug: string): Collection | null {
    return COLLECTIONS.find((c) => c.slug === slug) ?? null;
}

export const VIRTUAL_HANDLES: Record<string, { name: string; from: string[] }> =
    {
        "qua-20-10": {
            name: "Quà 20/10",
            from: ["hoa-bo", "hoa-hop", "hoa-gio", "bo-suu-tap-moi"],
        },
    };

export function inCollection(p: Product, handle: string | undefined): boolean {
    if (!handle || handle === "all") return true;
    const v = VIRTUAL_HANDLES[handle];
    if (v) return p.collectionSlugs.some((c) => v.from.includes(c));
    return p.collectionSlugs.includes(handle);
}

export function collectionName(handle: string): string {
    return getCollection(handle)?.title || "Tất cả hoa";
}

// No pinned designs in the numbered catalog.
export const COLLECTION_PIN: Record<string, string> = {};

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hydrateFromApi } from "../src/data/hydrate";
import { COLLECTIONS, PRODUCTS } from "../src/data/catalog";

let seedCount = 0;

function stubFetch(body: unknown, ok = true) {
    vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
            ok,
            json: async () => body,
        }),
    );
}

describe("storefront hydration", () => {
    beforeEach(() => {
        PRODUCTS.splice(0, PRODUCTS.length);
        PRODUCTS.push(...seed());
        COLLECTIONS.splice(0, COLLECTIONS.length);
        COLLECTIONS.push(
            { slug: "hoa-bo", title: "Hoa bó" },
            { slug: "all", title: "Tất cả hoa", virtual: true },
        );
        seedCount = PRODUCTS.length;
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("keeps the bundled seed when the API is unreachable", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
        expect(await hydrateFromApi()).toBe(false);
        expect(PRODUCTS).toHaveLength(seedCount);
    });

    it("keeps the bundled seed when nothing is published yet", async () => {
        stubFetch({ releaseId: null, products: [], collections: [] });
        expect(await hydrateFromApi()).toBe(false);
        expect(PRODUCTS).toHaveLength(seedCount);
    });

    it("maps a published release into the storefront shape", async () => {
        stubFetch({
            releaseId: "rel-1",
            activatedAt: "2026-10-21T00:00:00Z",
            collections: [
                { id: "c1", slug: "hoa-bo", title: "Hoa bó", membershipMode: "manual", manualIds: ["p1"] },
            ],
            products: [
                {
                    id: "p1",
                    slug: "hoa-1",
                    sku: "LAG-001a",
                    title: "Hoa Lagom số 1",
                    description: "",
                    collectionIds: ["c1"],
                    cover: "a1",
                    gallery: [{ assetId: "a1" }],
                    variants: [{ id: "v1", label: "Tiêu chuẩn", payableVnd: 500000, compareAtVnd: null }],
                    order: 0,
                    badges: [],
                },
            ],
        });

        expect(await hydrateFromApi()).toBe(true);
        expect(PRODUCTS).toHaveLength(1);
        const p = PRODUCTS[0];
        expect(p.title).toBe("Hoa Lagom số 1");
        expect(p.variants[0].priceVnd).toBe(500000);
        expect(p.collectionSlugs).toEqual(["hoa-bo"]);
        expect(p.imagePaths).toEqual(["/api/media/a1"]);
        // the virtual "all" collection survives a published collections list
        expect(COLLECTIONS.map((c) => c.slug)).toEqual(["hoa-bo", "all"]);
    });

    it("treats a missing price as a quote instead of zero dong", async () => {
        stubFetch({
            releaseId: "rel-2",
            collections: [],
            products: [
                {
                    id: "p9", slug: "hoa-9", sku: "S", title: "T", description: "",
                    collectionIds: [], cover: null, gallery: [],
                    variants: [{ id: "v1", label: "Tiêu chuẩn", payableVnd: null, compareAtVnd: null }],
                    order: 0, badges: [],
                },
            ],
        });
        expect(await hydrateFromApi()).toBe(true);
        expect(PRODUCTS[0].variants[0].priceVnd).toBe(0); // 0 renders as "Liên hệ"
    });

    it("falls back to the seed photo when a published product has no bound image", async () => {
        const seedPhoto = PRODUCTS[0].imagePaths[0];
        const seedSlug = PRODUCTS[0].slug;
        stubFetch({
            releaseId: "rel-3",
            collections: [],
            products: [
                {
                    id: "p0", slug: seedSlug, sku: "S", title: "T", description: "",
                    collectionIds: [], cover: null, gallery: [],
                    variants: [{ id: "v1", label: "Tiêu chuẩn", payableVnd: 1000, compareAtVnd: null }],
                    order: 0, badges: [],
                },
            ],
        });
        expect(await hydrateFromApi()).toBe(true);
        expect(PRODUCTS[0].imagePaths).toEqual([seedPhoto]);
    });
});

/** A tiny stand-in seed so mapping tests do not depend on the real 60-item file. */
function seed() {
    return [
        {
            id: "hoa-1", slug: "hoa-1", sku: "", title: "Hoa Lagom số 1", description: "",
            collectionSlugs: ["hoa-bo"], flowerType: "", tags: [],
            imagePaths: ["/img/hoa/trang_01_anh_01.jpg"],
            variants: [{ id: "v1", label: "Tiêu chuẩn", priceVnd: 150000, compareAtVnd: null }],
            order: 0,
            evidence: { sourceUrl: "seed", verifiedAt: "2026-10-20", isFixture: false },
        },
    ];
}

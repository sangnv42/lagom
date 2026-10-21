// Storefront hydration: replace the bundled seed catalog with the live published release.
//
// The bundled JSON stays the fallback. If the API is absent, slow, or has published nothing yet,
// the arrays keep their seed contents and the site renders exactly as it did before the CMS existed.

import { COLLECTIONS, PRODUCTS } from "./catalog";
import type { Collection, Product, ProductVariant } from "../domain/types";

type PublicVariant = {
    id: string;
    label: string;
    payableVnd: number | null;
    compareAtVnd: number | null;
};

type PublicProduct = {
    id: string;
    slug: string | null;
    sku: string;
    title: string;
    description: string;
    collectionIds: string[];
    cover: string | null;
    gallery: { assetId: string | null }[];
    variants: PublicVariant[];
    order: number;
    badges: string[];
};

type PublicCollection = {
    id: string;
    slug: string | null;
    title: string;
    membershipMode: string;
    manualIds: string[];
};

type PublicCatalog = {
    releaseId: string | null;
    activatedAt?: string | null;
    products: PublicProduct[];
    collections: PublicCollection[];
};

/** True when the live release replaced the bundled seed. False means the fallback is in use. */
export async function hydrateFromApi(timeoutMs = 2000): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch("/api/public/catalog", { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) return false;

        const data = (await res.json()) as PublicCatalog;
        if (!Array.isArray(data.products) || data.products.length === 0) return false;

        applyCatalog(data);
        return true;
    } catch {
        return false; // no API, no release, or a stalled request: keep the bundled seed
    }
}

function applyCatalog(data: PublicCatalog): void {
    const slugById = new Map(
        data.collections
            .filter((c) => typeof c.slug === "string")
            .map((c) => [c.id, c.slug as string]),
    );

    // Membership lives on both sides: a product can list collections and a collection can
    // hand-pick products, so the storefront view needs the union.
    const manualByProduct = new Map<string, string[]>();
    for (const c of data.collections) {
        if (c.membershipMode !== "manual" || !c.slug) continue;
        for (const productId of c.manualIds) {
            manualByProduct.set(productId, [...(manualByProduct.get(productId) ?? []), c.slug]);
        }
    }

    const seededImages = new Map(PRODUCTS.map((p) => [p.slug, p.imagePaths]));
    const evidence = {
        sourceUrl: `release:${data.releaseId ?? "none"}`,
        verifiedAt: (data.activatedAt ?? new Date().toISOString()).slice(0, 10),
        isFixture: false,
    };

    const products: Product[] = data.products.map((p, i) => {
        const slugs = [
            ...new Set([
                ...p.collectionIds.map((id) => slugById.get(id)).filter((s): s is string => !!s),
                ...(manualByProduct.get(p.id) ?? []),
            ]),
        ];
        // The cover is normally also the first gallery entry, so dedupe or the gallery repeats it.
        const images = [
            ...new Set([p.cover, ...p.gallery.map((g) => g.assetId)].filter((id): id is string => !!id)),
        ].map((id) => `/api/media/${id}`);
        const variants: ProductVariant[] = p.variants.map((v) => ({
            id: v.id,
            label: v.label,
            priceVnd: v.payableVnd ?? 0, // 0 renders as "Liên hệ", matching the seeded behaviour
            compareAtVnd: v.compareAtVnd,
        }));
        const slug = p.slug ?? p.id;
        return {
            id: slug,
            slug,
            sku: p.sku ?? "",
            title: p.title,
            description: p.description ?? "",
            collectionSlugs: slugs,
            flowerType: "",
            tags: p.badges ?? [],
            // A published product with no bound image falls back to its seed photo rather than
            // rendering a blank card.
            imagePaths: images.length ? images : (seededImages.get(slug) ?? []),
            variants: variants.length ? variants : [{ id: "v1", label: "Tiêu chuẩn", priceVnd: 0, compareAtVnd: null }],
            order: p.order ?? i,
            evidence,
        };
    });

    const virtual = COLLECTIONS.filter((c) => c.virtual);
    const published: Collection[] = data.collections
        .filter((c) => c.slug)
        .map((c) => ({ slug: c.slug as string, title: c.title }));
    const seen = new Set<string>();
    const collections = [...published, ...virtual].filter((c) => !seen.has(c.slug) && seen.add(c.slug));

    // Mutate in place: every screen imports these same arrays and reads them at render time.
    PRODUCTS.splice(0, PRODUCTS.length, ...products);
    // A release that carries products but no collections must not empty the storefront nav; only
    // replace collections when the release actually publishes some.
    if (published.length) COLLECTIONS.splice(0, COLLECTIONS.length, ...collections);
}

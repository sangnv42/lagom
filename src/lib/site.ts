// Published site content beyond the catalog: composed pages, theme, navigation, promotions,
// testimonials and FAQs. Same fallback contract as data/hydrate.ts — if the API or a release is
// absent, these getters return null/empty and every consumer keeps its bundled content.

export type Section = {
    id: string;
    type: string;
    hidden?: boolean;
    heading?: string;
    description?: string;
    imageAssetId?: string | null;
    collectionId?: string | null;
    productIds?: string[];
    buttonLabel?: string;
    buttonUrl?: string;
    layout?: string;
    category?: string;
    items?: { label: string; description?: string; url?: string; imageAssetId?: string | null }[];
};

export type CmsPage = {
    slug: string;
    title: string;
    seo: { title?: string; description?: string } | null;
    sections: Section[];
};

export type NavLink = {
    label: string;
    kind: "page" | "product" | "collection" | "anchor" | "url";
    value: string;
    children?: NavLink[];
};

export type Promotion = {
    id: string | null;
    title: string;
    message: string;
    imageAssetId: string | null;
    link: string;
    placement: string;
    priority: number;
};

export type Testimonial = {
    name: string;
    quote: string;
    rating: number | null;
    sourceLabel: string | null;
    sourceUrl: string | null;
};

export type Faq = { category: string; question: string; answer: string };

type SiteData = {
    releaseId: string | null;
    theme: Record<string, unknown> | null;
    navigation: { header: NavLink[]; footerGroups: { title: string; items: NavLink[] }[] } | null;
    promotions: Promotion[];
    testimonials: Testimonial[];
    faqs: Faq[];
    pages: CmsPage[];
};

const EMPTY: SiteData = {
    releaseId: null,
    theme: null,
    navigation: null,
    promotions: [],
    testimonials: [],
    faqs: [],
    pages: [],
};

let site: SiteData = EMPTY;

/** Public media bytes served by the admin server; CMS fields store bare asset ids. */
export const mediaUrl = (assetId: string | null | undefined): string | null =>
    assetId ? `/api/media/${assetId}` : null;

export async function hydrateSiteFromApi(timeoutMs = 2000): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch("/api/public/site", { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) return false;
        const data = (await res.json()) as SiteData;
        if (!data.releaseId) return false; // nothing published: keep bundled content everywhere
        site = { ...EMPTY, ...data };
        applyTheme(site.theme);
        return true;
    } catch {
        return false;
    }
}

export function getCmsPage(slug: string): CmsPage | null {
    return site.pages.find((p) => p.slug === slug) ?? null;
}

export function cmsNav(): { header: NavLink[]; footerGroups: { title: string; items: NavLink[] }[] } | null {
    return site.navigation;
}

/** Highest-priority active promotion for a placement, or null. Overlaps are resolved server-side. */
export function activePromotion(placement: string): Promotion | null {
    return site.promotions.find((p) => p.placement === placement) ?? null;
}

export function cmsTestimonials(): Testimonial[] {
    return site.testimonials;
}

export function cmsFaqs(category?: string): Faq[] {
    return category ? site.faqs.filter((f) => f.category === category) : site.faqs;
}

/** Resolve a CMS link item to a router path or absolute href; null when it cannot resolve. */
export function linkTo(link: NavLink): string | null {
    switch (link.kind) {
        case "url":
            return link.value;
        case "anchor":
            return link.value;
        case "page":
            return `/pages/${encodeURIComponent(link.value)}/`;
        case "product":
            return `/products/${encodeURIComponent(link.value)}/`;
        case "collection":
            return `/collections/${encodeURIComponent(link.value)}/`;
    }
}

// Published theme tokens overwrite the storefront's own CSS custom properties only if present;
// the baseline in styles/tokens.css is the reset state (no publish = shipped look).
function applyTheme(theme: Record<string, unknown> | null): void {
    if (!theme || typeof document === "undefined") return;
    const root = document.documentElement.style;
    const colors = (theme.colors ?? {}) as Record<string, string>;
    const map: Record<string, string> = {
        accent: "--gold",
        ink: "--ink",
        surface: "--ivory",
        text: "--text",
    };
    for (const [key, cssVar] of Object.entries(map)) {
        if (colors[key]) root.setProperty(cssVar, colors[key]);
    }
    if (typeof theme.radiusPx === "number") root.setProperty("--rad", `${theme.radiusPx}px`);
    if (typeof theme.contentMaxPx === "number") root.setProperty("--max", `${theme.contentMaxPx}px`);
}

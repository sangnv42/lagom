// Business configuration observed on the live reference (captured 2026-10-20).
// Values transcribed from docs/reference/captures/app.js + home.html.

// Physical stores (Google My Business, reset 2026). Dĩ An is the primary store: its number is
// the site-wide contact/Zalo number, so SHOP mirrors Dĩ An and STORES is the full list.
export type Store = {
    name: string;
    short: string;
    address: string;
    phone: string;
    phoneTxt: string;
    map: string;
    reviewsScore: string;
    reviewsCount: number;
};

export const STORES: Store[] = [
    {
        name: "Lagom Flower Dĩ An",
        short: "Dĩ An",
        address: "63 Trần Hưng Đạo, Dĩ An",
        phone: "0353198089",
        phoneTxt: "0353 198 089",
        map: "https://maps.google.com/?q=63+Tr%E1%BA%A7n+H%C6%B0ng+%C4%90%E1%BA%A1o+D%E1%BB%8B+An",
        reviewsScore: "4.7",
        reviewsCount: 74,
    },
    {
        name: "Lagom Flower Biên Hoà",
        short: "Biên Hoà",
        address: "Đồng Nai",
        phone: "0353198072",
        phoneTxt: "0353 198 072",
        map: "https://maps.google.com/?q=Lagom+Flower+Bi%C3%AAn+Ho%C3%A0",
        reviewsScore: "4.3",
        reviewsCount: 6,
    },
];

// Review totals across stores (shown wherever the site quotes “X đánh giá Google”).
export const STORE_REVIEW_TOTAL = STORES.reduce((n, s) => n + s.reviewsCount, 0);
export const STORE_REVIEW_SCORE = (
    Math.round(
        (STORES.reduce((n, s) => n + parseFloat(s.reviewsScore) * s.reviewsCount, 0) /
            STORE_REVIEW_TOTAL) *
            10,
    ) / 10
)
    .toFixed(1);

export const SHOP = {
    name: "Lagom Flower",
    stores: STORES,
    reviewsScore: STORE_REVIEW_SCORE,
    reviewsCount: STORE_REVIEW_TOTAL,
    phone: STORES[0].phone,
    phoneTxt: STORES[0].phoneTxt,
    zalo: `https://zalo.me/${STORES[0].phone}`,
    map: STORES[0].map,
    address: STORES[0].address,
} as const;

// Origin hosting the captured product imagery; images stay remote-fetched (documented in README).
// Override with VITE_ASSET_ORIGIN for a mirror or local copy.
export const ASSET_ORIGIN: string =
    (import.meta.env?.VITE_ASSET_ORIGIN as string | undefined) ??
    "https://archflowers.com";

// Canonical site origin for metadata/canonicals. Production should set VITE_SITE_URL to the deployment domain.
export const SITE_URL: string =
    (import.meta.env?.VITE_SITE_URL as string | undefined) ??
    (typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:5173");

// 20/10 campaign: counts down to 2026-10-20 00:00 Vietnam time (= 2026-10-19T17:00Z), hides when expired.
export const CAMPAIGN = {
    id: "qua-20-10-2026",
    startsAt: null as string | null,
    endsAt: "2026-10-19T17:00:00Z",
    timezone: "Asia/Ho_Chi_Minh",
    expiredBehavior: "hide" as const,
};

// Price bands (home uses 4 coarse bands, collection filter uses finer chips) — observed BANDS/BANDS_F.
export type Band = { id: string; label: string; min: number; max: number };
export const BANDS: Band[] = [
    { id: "u500", label: "Dưới 500k", min: 1, max: 499999 },
    { id: "500-1tr", label: "500k – 1 triệu", min: 500000, max: 999999 },
    { id: "1-2tr", label: "1 – 2 triệu", min: 1000000, max: 1999999 },
    {
        id: "o2tr",
        label: "Trên 2 triệu",
        min: 2000000,
        max: Number.POSITIVE_INFINITY,
    },
];
export const BANDS_F: Band[] = [
    { id: "u300", label: "Dưới 300k", min: 1, max: 299999 },
    { id: "300-500", label: "300k – 500k", min: 300000, max: 499999 },
    ...BANDS.slice(1),
];
export const bandOf = (id?: string): Band | undefined =>
    id
        ? (BANDS_F.find((b) => b.id === id) ?? BANDS.find((b) => b.id === id))
        : undefined;

// Virtual collections (observed VIRTUAL map): 'all' spans everything, 'qua-20-10' unions four real ones.
export const VIRTUAL_COLLECTIONS: Record<
    string,
    { name: string; from?: string[] }
> = {
    "qua-20-10": {
        name: "Quà 20/10",
        from: ["hoa-bo", "hoa-hop", "hoa-gio", "bo-suu-tap-moi"],
    },
    all: { name: "Tất cả hoa" },
};

// Delivery windows (observed): 3-hour windows; holiday extra window is date-gated; 2h same-day lead time.
export const DELIVERY: {
    slots: string[];
    holidaySlot: string;
    holidays: string[];
    leadHours: number;
} = {
    slots: ["08:00 – 11:00", "11:00 – 14:00", "15:00 – 18:00"],
    holidaySlot: "18:00 – 20:00 (ngày lễ)",
    holidays: [
        "01-01",
        "02-14",
        "03-08",
        "04-30",
        "05-01",
        "09-02",
        "10-20",
        "11-20",
        "12-24",
        "12-25",
    ],
    leadHours: 2,
};

// Sort options exactly as observed in the collection toolbar <select>.
export const SORT_OPTIONS = [
    { value: "featured", label: "Nổi bật" },
    { value: "new", label: "Mới nhất" },
    { value: "asc", label: "Giá: thấp → cao" },
    { value: "desc", label: "Giá: cao → thấp" },
    { value: "off", label: "Ưu đãi nhiều nhất" },
] as const;

export const PAGE_SIZE = 24; // observed load-more batch

// Redirect registry: docs/reference/pages/05-policies-and-redirects.md (audit results) plus the
// legacy query-param links handled by the reference app.js. Trailing-slash normalization is separate.
export const REDIRECTS: Record<string, string> = {
    "/pages/about-us/": "/",
    "/pages/lien-he": "/",
    "/account/login": "/",
    "/account/register": "/",
    "/search": "/collections/all/",
    "/collections/hoa-ke-1/": "/collections/hoa-khai-truong/",
    "/collections/thuc-te-hoa-tuoi/": "/collections/all/",
    "/blogs/news/": "/",
    "/pages/dieu-khoan-dich-vu/": "/pages/chinh-sach-doi-tra/",
    "/gio-hang/": "/",
    "/index.html": "/",
};

// Image URL construction mirroring the reference `opt()`/`srcset()` helpers (captures/app.js).
// WebP renditions live in opt/{400,800,1200}/ beside each photo folder; JPEG original is the fallback.

import { ASSET_ORIGIN, SITE_URL } from "../data/business";

// Inline placeholder (verbatim from reference PH constant) used when a photo is unavailable.
export const PLACEHOLDER_IMG =
    "data:image/svg+xml," +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="#C9A96E" stroke-width="1.2"><circle cx="50" cy="42" r="8"/><path d="M50 34c-6-14 6-20 0-20s6 6 0 20M58 42c14-6 20 6 20 0s-6 6-20 0M50 50c6 14-6 20 0 20s-6-6 0-20M42 42c-14 6-20-6-20 0s6-6 20 0M50 70v18M50 80c-8-6-14-4-16-2M50 84c8-6 14-4 16-2"/></svg>',
    );

// Local /img assets (the Lagom photo set) are served from this origin as-is; only legacy
// reference paths get the ASSET_ORIGIN prefix.
const abs = (p: string): string =>
    /^https?:/i.test(p) ? p : p.startsWith("/") ? p : ASSET_ORIGIN + "/" + p;

/** Responsive rendition url for widths 400/800/1200, or '' for images without an export path. */
export function optUrl(src: string | null | undefined, w: number): string {
    if (!src || src.startsWith("/img/")) return ""; // local Lagom set ships single-size JPEGs only
    const m = /^(.*\/)?(img|images)\/([^/]+)\.(jpe?g|png)$/i.exec(src || "");
    if (!m) return "";
    const dir = m[1] || "";
    const folder = m[2] === "images" ? "opt" : "img/opt";
    return `${abs(dir)}${folder}/${w}/${m[3]}.webp`;
}

export function srcsetFor(src: string | null): string {
    const s4 = optUrl(src, 400);
    if (!s4) return "";
    return [400, 800, 1200].map((w) => `${optUrl(src, w)} ${w}w`).join(", ");
}

export const SIZES = {
    card: "(max-width:767px) 50vw, (max-width:1365px) 33vw, 25vw",
    full: "(max-width:767px) 100vw, 55vw",
    thumb: "120px",
} as const;

/** Absolute URL for metadata/og tags. */
export function absAsset(src: string): string {
    const p = abs(src || PLACEHOLDER_IMG);
    return p.startsWith("/") ? SITE_URL + p : p;
}

/** Local path for the original full-res fallback (data-o behavior kept on <img>, onerror swaps to it). */
export const originalUrl = (src: string): string => abs(src);

// Public read routes. Everything here resolves the active release manifest only, and each response
// is an explicit field allowlist: no drafts, no staff identities, no import provenance, no secrets
// (API-03, DATA-02, SEO-09).

import { getActiveRelease, publicCatalog, publicSettings, publicSite } from '../releases.ts';
import type { Ctx } from '../http.ts';

export function publicCatalogRoute(_ctx: Ctx) {
  const catalog = publicCatalog();
  return {
    releaseId: catalog.releaseId,
    generatedAt: new Date().toISOString(),
    products: catalog.products,
    collections: catalog.collections,
  };
}

export function publicSettingsRoute(_ctx: Ctx) {
  return { settings: publicSettings() };
}

/** Theme, navigation, active promotions, testimonials, FAQs and composed pages — published only. */
export function publicSiteRoute(_ctx: Ctx) {
  return publicSite();
}

/** The release id lets the storefront and any cache report which content it is holding (PUB-12). */
export function publicReleaseRoute(_ctx: Ctx) {
  const active = getActiveRelease();
  return {
    releaseId: active?.releaseId ?? null,
    activatedAt: active?.activatedAt ?? null,
    entities: active ? Object.keys(active.manifest).length : 0,
    published: active !== null,
  };
}

// Releases: build a candidate manifest, validate without touching live content, then activate it by
// moving one pointer. Readers see either the old manifest or the new one, never a mixture
// (PUB-06..PUB-12). Scheduling and review are phase 6; the mechanism lives here already.

import { get, all, nowIso, run, tx } from './db.ts';
import { randomUUID } from 'node:crypto';
import { ApiError } from './errors.ts';
import { record } from './audit.ts';
import { validatePayload } from './schemas.ts';
import { effectivePrice, startingPrice } from './pricing.ts';
import {
  getEntity,
  listEntities,
  readRevision,
  type EntityType,
  type Revision,
} from './revisions.ts';
import type { Actor } from './permissions.ts';

export type Manifest = Record<string, number>; // "product:<id>" -> revision id
export type ReleaseRow = {
  id: string;
  status: string;
  note: string | null;
  manifest: string;
  created_by: string | null;
  created_at: string;
  activated_at: string | null;
};

export type ReleaseItem = { entityType: EntityType; entityId: string; revisionId?: number };

function parseManifest(json: string): Manifest {
  try {
    return JSON.parse(json) as Manifest;
  } catch {
    return {};
  }
}

function manifestKey(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`;
}

/** Build a candidate manifest from working drafts, or from explicitly pinned revisions (SCHED-02). */
export function buildManifest(items: ReleaseItem[], actor: Actor | null): { id: string; manifest: Manifest; note: string | null } {
  if (!items.length) throw ApiError.validation('A release needs at least one entity.');
  const manifest: Manifest = {};
  for (const item of items) {
    const entity = getEntity(item.entityId);
    if (!entity) throw ApiError.notFound(`Unknown entity ${item.entityId}.`);
    if (entity.type !== item.entityType) throw ApiError.validation(`Entity ${item.entityId} is a ${entity.type}, not a ${item.entityType}.`);
    const revisionId = item.revisionId ?? entity.working_revision_id;
    if (!revisionId) throw ApiError.validation(`${entity.type} ${entity.id} has no saved draft to publish.`);
    const revision = readRevision(revisionId);
    if (!revision || revision.entityId !== entity.id) throw ApiError.notFound(`Revision ${revisionId} does not belong to ${entity.id}.`);
    manifest[manifestKey(entity.type, entity.id)] = revisionId;
  }
  const id = randomUUID();
  run(
    `INSERT INTO release (id, status, note, manifest, created_by, created_at) VALUES (?, 'draft', ?, ?, ?, ?)`,
    id,
    null,
    JSON.stringify(manifest),
    actor?.userId ?? null,
    nowIso(),
  );
  return { id, manifest, note: null };
}

export type ValidationReport = {
  ok: boolean;
  entries: { key: string; entityId: string; entityType: string; revisionId: number; slug: string | null; errors: string[]; warnings: string[] }[];
  impactedRoutes: string[];
};

/**
 * PUB-06 validation, with no live mutation. Covers required fields, routes, references, template
 * compatibility stand-ins (registered schemas) and asset availability.
 */
export function validateRelease(releaseId: string): ValidationReport {
  const release = getRelease(releaseId);
  if (!release) throw ApiError.notFound(`Unknown release ${releaseId}.`);
  const manifest = parseManifest(release.manifest);
  const collectionIds = listEntities({ type: 'collection', visibility: 'all', limit: 200 }).rows.map((r) => r.id);
  const productIds = listEntities({ type: 'product', visibility: 'all', limit: 1000 }).rows.map((r) => r.id);
  const mediaIds = all<{ id: string }>(`SELECT id FROM media_asset WHERE archived_at IS NULL`).map((r) => r.id);
  const takenSkus = takenSkuSet();
  const entries: ValidationReport['entries'] = [];
  const routes: string[] = [];

  for (const [key, revisionId] of Object.entries(manifest)) {
    const entityType = key.split(':')[0] as EntityType;
    const entityId = key.slice(entityType.length + 1);
    const entity = getEntity(entityId);
    const revision = readRevision(revisionId);
    if (!entity || !revision) {
      entries.push({ key, entityId, entityType, revisionId, slug: null, errors: ['Entity or revision is missing.'], warnings: [] });
      continue;
    }
    // Exclude this entity's own SKU from the taken set. takenSkuSet() reads working drafts, so
    // without this a release that republishes a product collides with itself and can never publish.
    const selfSku = String(revision.payload.sku ?? '');
    const { slug, errors } = validatePayload(entityType, revision.payload, {
      mode: 'publish',
      collectionIds,
      mediaIds,
      productIds,
      takenSkus: [...takenSkus].filter((s) => s !== selfSku),
      selfEntityId: entityId,
    });
    if (entityType === 'product') {
      const sku = String(revision.payload.sku ?? '');
      if (sku) takenSkus.add(sku);
    }
    const warnings: string[] = [];
    if (entityType === 'product' && revision.payload.import) warnings.push('Imported draft: confirm the provisional name before publishing.');
    if (slug) routes.push(entityType === 'product' ? `/products/${slug}/` : entityType === 'collection' ? `/collections/${slug}/` : `/pages/${slug}/`);
    entries.push({ key, entityId, entityType, revisionId, slug, errors: errors.map((e) => `${e.path}: ${e.message}`), warnings });
  }

  return { ok: entries.every((e) => e.errors.length === 0), entries, impactedRoutes: [...new Set(routes)] };
}

/**
 * Activate: compare-and-swap the single active pointer inside one transaction (PUB-09, DATA-07).
 * A replayed idempotency key returns the original result instead of publishing twice (PUB-11, AC-21).
 */
export function activateRelease(input: {
  releaseId: string;
  actor: Actor | null;
  idempotencyKey?: string | null;
  skipValidation?: boolean;
}): { releaseId: string; activated: boolean; alreadyActive: boolean; impactedRoutes: string[] } {
  if (input.idempotencyKey) {
    const replay = get<{ result: string }>(`SELECT result FROM idempotency WHERE key = ?`, input.idempotencyKey);
    if (replay) return replayResult(replay.result);
  }

  const report = validateRelease(input.releaseId);
  if (!report.ok && !input.skipValidation) {
    const failing = report.entries.filter((e) => e.errors.length);
    record({
      actor: input.actor,
      action: 'release.activate',
      resourceType: 'release',
      resourceId: input.releaseId,
      outcome: 'failed',
      after: { errors: failing.map((f) => `${f.key}: ${f.errors.join('; ')}`) },
    });
    throw ApiError.validation(
      `Publication validation failed for ${failing.length} of ${report.entries.length} entities.`,
      failing.flatMap((f) => f.errors.map((message) => ({ path: f.key, message }))),
    );
  }

  const result = tx(() => {
    const release = getRelease(input.releaseId);
    if (!release) throw ApiError.notFound(`Unknown release ${input.releaseId}.`);
    if (release.status === 'published' && release.activated_at) {
      return { releaseId: release.id, activated: false, impactedRoutes: report.impactedRoutes };
    }
    const manifest = parseManifest(release.manifest);
    const active = getActiveRelease();
    // Compare-and-swap: refuse to activate over a pointer that moved since the manifest was built.
    const swapped = run(
      `INSERT INTO release_active (key, release_id, activated_at) VALUES ('site', ?, ?)
       ON CONFLICT(key) DO UPDATE SET release_id = excluded.release_id, activated_at = excluded.activated_at
       WHERE release_active.release_id = ?`,
      release.id,
      nowIso(),
      active?.releaseId ?? '',
    );
    if (swapped.changes === 0) {
      throw ApiError.conflict('The live site changed since this release was built. Rebuild and validate it.', {
        activeReleaseId: active?.releaseId ?? null,
      });
    }
    for (const [key, revisionId] of Object.entries(manifest)) {
      const entityType = key.split(':')[0];
      const entityId = key.slice(entityType.length + 1);
      run(
        `UPDATE entity SET published_revision_id = ?, visibility = 'published', version = version + 1, updated_at = ? WHERE id = ?`,
        revisionId,
        nowIso(),
        entityId,
      );
    }
    run(`UPDATE release SET status = 'published', activated_at = ? WHERE id = ?`, nowIso(), release.id);
    return { releaseId: release.id, activated: true, impactedRoutes: report.impactedRoutes };
  });

  if (input.idempotencyKey) {
    run(
      `INSERT INTO idempotency (key, actor_user_id, result, created_at) VALUES (?,?,?,?)
       ON CONFLICT(key) DO NOTHING`,
      input.idempotencyKey,
      input.actor?.userId ?? null,
      JSON.stringify(result),
      nowIso(),
    );
  }
  record({
    actor: input.actor,
    action: 'release.activate',
    resourceType: 'release',
    resourceId: result.releaseId,
    releaseId: result.releaseId,
    outcome: 'ok',
    after: { entities: Object.keys(parseManifest(getRelease(result.releaseId)!.manifest)).length, impactedRoutes: result.impactedRoutes },
  });
  return { ...result, alreadyActive: !result.activated };
}

export function getRelease(id: string): ReleaseRow | null {
  return get<ReleaseRow>(`SELECT * FROM release WHERE id = ?`, id) ?? null;
}

export function getActiveRelease(): { releaseId: string; activatedAt: string; manifest: Manifest } | null {
  const row = get<{ release_id: string; activated_at: string; manifest: string }>(
    `SELECT ra.release_id, ra.activated_at, r.manifest FROM release_active ra JOIN release r ON r.id = ra.release_id WHERE ra.key = 'site'`,
  );
  if (!row) return null;
  return { releaseId: row.release_id, activatedAt: row.activated_at, manifest: parseManifest(row.manifest) };
}

export function listReleases(limit = 25) {
  return all<ReleaseRow>(`SELECT * FROM release ORDER BY created_at DESC LIMIT ?`, limit).map((r) => ({
    id: r.id,
    status: r.status,
    note: r.note,
    entities: Object.keys(parseManifest(r.manifest)).length,
    createdBy: r.created_by,
    createdAt: r.created_at,
    activatedAt: r.activated_at,
  }));
}

/**
 * Public catalog built only from the active manifest (DATA-02). Field allowlist per API-03: no
 * staff identities, no import provenance, no drafts.
 */
export function publicCatalog(now: Date = new Date()) {
  const active = getActiveRelease();
  const products: Record<string, unknown>[] = [];
  const collections: Record<string, unknown>[] = [];
  if (!active) return { releaseId: null, products, collections };

  const publishedCollections = new Map<string, Revision>();
  for (const [key, revisionId] of Object.entries(active.manifest)) {
    if (!key.startsWith('collection:')) continue;
    const revision = readRevision(revisionId);
    if (revision) publishedCollections.set(key.slice('collection:'.length), revision);
  }

  for (const [key, revisionId] of Object.entries(active.manifest)) {
    if (!key.startsWith('product:')) continue;
    const entityId = key.slice('product:'.length);
    const revision = readRevision(revisionId);
    const entity = getEntity(entityId);
    if (!revision || !entity) continue;
    const p = revision.payload;
    const variants = Array.isArray(p.variants) ? (p.variants as Record<string, unknown>[]) : [];
    const priced = variants.map((v) => effectivePrice(variantInput(v), now));
    const start = startingPrice(variants.map((v) => variantInput(v)), now);
    const gallery = Array.isArray(p.gallery) ? (p.gallery as Record<string, unknown>[]) : [];
    products.push({
      id: entityId,
      slug: entity.slug,
      sku: p.sku ?? '',
      title: p.title ?? '',
      description: p.description ?? '',
      collectionIds: Array.isArray(p.collectionIds) ? p.collectionIds : [],
      cover: p.coverAssetId ?? gallery[0]?.assetId ?? null,
      gallery: gallery.map((g, i) => ({
        assetId: g.assetId ?? null,
        alt: g.alt ?? null,
        decorative: g.decorative === true,
        position: i,
      })),
      variants: variants.map((v) => ({
        id: v.id,
        label: v.label,
        availability: v.availability ?? 'available',
        ...effectivePrice(variantInput(v), now),
      })),
      startingPriceVnd: start.amountVnd,
      multiplePrices: start.multiple,
      cheapestVnd: priced.map((p2) => p2.payableVnd).filter((n): n is number => n !== null).sort((a, b) => a - b)[0] ?? null,
      availability: variants[0]?.availability ?? 'available',
      order: Number(p.order ?? 0),
      badges: Array.isArray(p.badges) ? p.badges : [],
    });
  }

  for (const [entityId, revision] of publishedCollections) {
    const entity = getEntity(entityId);
    const c = revision.payload;
    collections.push({
      id: entityId,
      slug: entity?.slug ?? null,
      title: c.title ?? '',
      shortDescription: c.shortDescription ?? '',
      fullDescription: c.fullDescription ?? '',
      navVisible: c.navVisible !== false,
      membershipMode: c.membershipMode ?? 'manual',
      manualIds: Array.isArray(c.manualIds) ? c.manualIds : [],
      defaultSort: c.defaultSort ?? 'featured',
      seo: c.seo ?? null,
    });
  }

  return { releaseId: active.releaseId, activatedAt: active.activatedAt, products, collections };
}

export function publicSettings() {
  const active = getActiveRelease();
  if (!active) return null;
  for (const [key, revisionId] of Object.entries(active.manifest)) {
    if (!key.startsWith('settings:')) continue;
    const revision = readRevision(revisionId);
    return revision?.payload ?? null;
  }
  return null;
}

/**
 * Everything the storefront renders beyond catalog and settings, built only from the active
 * manifest: theme tokens, navigation, currently-active promotions (deterministic overlap order),
 * testimonials, FAQs and composed pages. Hidden sections are removed here so the storefront never
 * has to guess (DATA-02 allowlist applies per field).
 */
export function publicSite(now: Date = new Date()) {
  const empty = { releaseId: null as string | null, theme: null, navigation: null, promotions: [], testimonials: [], faqs: [], pages: [] };
  const active = getActiveRelease();
  if (!active) return empty;

  let theme: Record<string, unknown> | null = null;
  let navigation: Record<string, unknown> | null = null;
  const promotions: Record<string, unknown>[] = [];
  const testimonials: Record<string, unknown>[] = [];
  const faqs: Record<string, unknown>[] = [];
  const pages: Record<string, unknown>[] = [];

  // Section selectors store entity ids; the public payload swaps them for published slugs so the
  // storefront renders against its own slug-keyed catalog and links survive independently of ids.
  const slugById = new Map<string, string>();
  for (const [key] of Object.entries(active.manifest)) {
    const type = key.split(':')[0];
    if (type !== 'product' && type !== 'collection') continue;
    const entity = getEntity(key.slice(type.length + 1));
    if (entity?.slug) slugById.set(entity.id, entity.slug);
  }
  const toSlug = (id: unknown): string | null => (typeof id === 'string' ? slugById.get(id) ?? id : null);

  for (const [key, revisionId] of Object.entries(active.manifest)) {
    const type = key.split(':')[0];
    const entity = getEntity(key.slice(type.length + 1));
    const revision = readRevision(revisionId);
    if (!revision) continue;
    const p = revision.payload;
    if (type === 'theme') theme = p;
    if (type === 'navigation') navigation = { header: p.header ?? [], footerGroups: p.footerGroups ?? [] };
    if (type === 'promotion') {
      const start = typeof p.startAt === 'string' ? Date.parse(p.startAt) : null;
      const end = typeof p.endAt === 'string' ? Date.parse(p.endAt) : null;
      // Expired or not-yet-started campaigns never reach the public payload, so they disappear
      // without an admin opening the dashboard. Half-open [start, end) keeps overlaps deterministic.
      if (p.visible === false) continue;
      if (start !== null && now.getTime() < start) continue;
      if (end !== null && now.getTime() >= end) continue;
      promotions.push({
        id: entity?.id ?? null,
        title: p.title ?? '',
        message: p.message ?? '',
        imageAssetId: p.imageAssetId ?? null,
        link: p.link ?? '',
        placement: p.placement ?? 'home-banner',
        priority: Number(p.priority ?? 0),
        startAt: p.startAt ?? null,
        endAt: p.endAt ?? null,
      });
    }
    if (type === 'testimonial') {
      testimonials.push({
        name: p.name ?? '',
        quote: p.quote ?? '',
        rating: p.rating ?? null,
        sourceLabel: p.sourceLabel ?? null,
        sourceUrl: p.sourceUrl ?? null,
        sort: Number(p.sort ?? 0),
      });
    }
    if (type === 'faq') {
      faqs.push({ category: p.category ?? '', question: p.question ?? '', answer: p.answer ?? '', sort: Number(p.sort ?? 0) });
    }
    if (type === 'page' && entity?.slug) {
      const sections = Array.isArray(p.sections) ? (p.sections as Record<string, unknown>[]) : [];
      pages.push({
        slug: entity.slug,
        title: p.title ?? '',
        seo: p.seo ?? null,
        sections: sections.filter((s) => s.hidden !== true).map((s) => ({
          ...s,
          collectionId: s.collectionId ? toSlug(s.collectionId) : s.collectionId ?? null,
          productIds: Array.isArray(s.productIds) ? (s.productIds as unknown[]).map(toSlug).filter((v): v is string => !!v) : undefined,
        })),
      });
    }
  }

  promotions.sort((a, b) => Number(b.priority) - Number(a.priority) || String(b.startAt ?? '').localeCompare(String(a.startAt ?? '')));
  testimonials.sort((a, b) => Number(a.sort) - Number(b.sort));
  faqs.sort((a, b) => Number(a.sort) - Number(b.sort));
  return { releaseId: active.releaseId, activatedAt: active.activatedAt, theme, navigation, promotions, testimonials, faqs, pages };
}

function variantInput(v: Record<string, unknown>) {
  return {
    priceVnd: num(v.priceVnd),
    compareAtVnd: num(v.compareAtVnd),
    salePriceVnd: num(v.salePriceVnd),
    saleStart: str(v.saleStart),
    saleEnd: str(v.saleEnd),
  };
}

function takenSkuSet(): Set<string> {
  const taken = new Set<string>();
  for (const row of all<{ sku: string }>(
    `SELECT json_extract(cr.payload, '$.sku') AS sku FROM entity e JOIN content_revision cr ON cr.id = e.working_revision_id
     WHERE e.type = 'product' AND e.visibility != 'archived' AND sku IS NOT NULL AND sku != ''`,
  )) {
    taken.add(row.sku);
  }
  return taken;
}

/** A stored idempotency result that cannot be read back is treated as no replay, never a crash. */
function replayResult(raw: string) {
  try {
    const parsed = JSON.parse(raw) as { releaseId: string; activated: boolean; impactedRoutes: string[] };
    return { ...parsed, alreadyActive: true };
  } catch {
    return { releaseId: '', activated: false, alreadyActive: false, impactedRoutes: [] };
  }
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

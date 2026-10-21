// Content routes: list, detail, draft save with field-group enforcement, duplicate, archive,
// history, diff, restore, and the release build/validate/activate flow.

import { ApiError } from '../errors.ts';
import { guard, intParam, isEntityType, knownCollectionIds, knownMediaIds, knownProductIds } from './_shared.ts';
import {
  createEntity,
  diffRevisions,
  findBySlug,
  getEntity,
  hasUnpublishedChanges,
  listEntities,
  listRevisions,
  publishedRevision,
  readRevision,
  restoreRevision,
  saveDraft,
  setVisibility,
  workingRevision,
  type EntityRow,
  type EntityType,
} from '../revisions.ts';
import { productFieldGroupsTouched, stripProtected, type ResourceType } from '../permissions.ts';
import { validatePayload } from '../schemas.ts';
import { effectivePrice, startingPrice } from '../pricing.ts';
import { activateRelease, buildManifest, getActiveRelease, getRelease, listReleases, validateRelease } from '../releases.ts';
import { clearUsages, printedPriceMismatch, setUsage } from '../media.ts';
import { record } from '../audit.ts';
import { all } from '../db.ts';
import type { Ctx } from '../http.ts';

const RESOURCE_FOR_TYPE: Record<string, ResourceType> = {
  product: 'product',
  collection: 'collection',
  settings: 'settings',
  page: 'page',
  'ui-string': 'ui-string',
  theme: 'theme',
  // Editorial micro-content shares the 'global' resource: editors may draft it, only roles with
  // the publish workflow may release it (PERM-05).
  navigation: 'navigation',
  promotion: 'global',
  testimonial: 'global',
  faq: 'global',
};

export function listRoute(ctx: Ctx) {
  const type = ctx.params.type as EntityType;
  assertType(type);
  guard(ctx, 'read', RESOURCE_FOR_TYPE[type]);
  const visibility = (ctx.query.get('visibility') ?? undefined) as 'published' | 'unpublished' | 'archived' | 'all' | undefined;
  const { rows, total } = listEntities({
    type,
    visibility,
    q: ctx.query.get('q') ?? undefined,
    limit: intParam(ctx.query.get('limit'), 50, 200),
    offset: intParam(ctx.query.get('offset'), 0, 100_000),
  });
  return { type, total, items: rows.map((row) => summarize(row)) };
}

export function detailRoute(ctx: Ctx) {
  const type = ctx.params.type as EntityType;
  assertType(type);
  const entity = requireEntity(type, ctx.params.id);
  guard(ctx, 'read', RESOURCE_FOR_TYPE[type], entity.id);
  const working = workingRevision(entity);
  const published = publishedRevision(entity);
  return {
    entity: summarize(entity),
    working: working ? { revisionId: working.id, payload: working.payload, createdAt: working.createdAt } : null,
    published: published ? { revisionId: published.id, payload: published.payload } : null,
    issues: working ? issuesFor(type, working.payload) : [],
    // DASH-05 / EDIT-05: publication checks may be incomplete while a draft is saved.
    publishBlockers: working ? blockersFor(type, working.payload) : [],
  };
}

export function createRoute(ctx: Ctx) {
  const type = ctx.params.type as EntityType;
  assertType(type);
  const actor = guard(ctx, 'create', RESOURCE_FOR_TYPE[type]);
  const incoming = ((ctx.body.payload ?? ctx.body) ?? {}) as Record<string, unknown>;
  const { payload, attempted } = stripProtected(incoming);
  if (attempted.length) throw ApiError.unauthorized(`Fields cannot be set from content: ${attempted.join(', ')}.`);
  const slug = typeof ctx.body.slug === 'string' ? ctx.body.slug : null;
  const validation = validatePayload(type, payload, { mode: 'draft' });
  if (validation.errors.length) throw ApiError.validation('Payload failed validation.', validation.errors);
  // The slug usually comes from the payload, not the body, so the duplicate check has to use the
  // effective slug or a collision falls through to a raw UNIQUE-constraint 500.
  const effectiveSlug = validation.slug ?? slug;
  if (effectiveSlug && findBySlug(type, effectiveSlug)) throw ApiError.conflict(`Slug "${effectiveSlug}" is already in use.`);
  const made = createEntity({ type, slug: effectiveSlug, payload, actor });
  syncUsages(type, made.entityId, payload);
  return made;
}

export function saveRoute(ctx: Ctx) {
  const type = ctx.params.type as EntityType;
  assertType(type);
  const entity = requireEntity(type, ctx.params.id);
  const actor = guard(ctx, 'edit', RESOURCE_FOR_TYPE[type], entity.id);
  const incoming = (ctx.body.payload ?? ctx.body) as Record<string, unknown>;
  const { payload, attempted } = stripProtected(incoming);
  if (attempted.length) {
    // API-02 / PERM-05: protected keys are refused outright rather than silently dropped.
    throw ApiError.unauthorized(`Fields cannot be set from content: ${attempted.join(', ')}.`);
  }
  const before = workingRevision(entity)?.payload ?? null;

  // Import provenance is a protected field, so a client cannot send it. Carry the stored block
  // forward instead of dropping it: without it a product can no longer be matched to its external
  // key, and the next import would create a duplicate instead of updating it (IMPORT-01, AC-14).
  if (type === 'product' && before && before.import && !payload.import) {
    payload.import = before.import;
  }

  if (type === 'product') {
    for (const group of productFieldGroupsTouched(before, payload as Record<string, unknown>)) {
      if (group === 'price' || group === 'availability') guard(ctx, group, 'product', entity.id, group);
    }
  }

  const validation = validatePayload(type, payload as Record<string, unknown>, {
    mode: 'draft',
    collectionIds: knownCollectionIds(),
    mediaIds: knownMediaIds(),
    takenSkus: takenSkus(entity.id),
    productIds: knownProductIds(),
    selfEntityId: entity.id,
  });
  if (validation.errors.length) {
    // EDIT-05: the draft buffer is preserved; the client keeps its edit and shows the problems.
    throw ApiError.validation('Draft could not be saved: fix the highlighted fields.', validation.errors);
  }

  const expectedVersion = Number(ctx.body.expectedVersion);
  if (!Number.isFinite(expectedVersion)) throw ApiError.validation('expectedVersion is required for a save.');
  const slug = typeof ctx.body.slug === 'string' ? ctx.body.slug : validation.slug ?? undefined;
  const result = saveDraft({
    entityId: entity.id,
    payload: payload as Record<string, unknown>,
    actor,
    expectedVersion,
    slug: slug === undefined ? undefined : slug,
  });
  syncUsages(type, entity.id, payload as Record<string, unknown>);
  return { ...result, entity: summarize(getEntity(entity.id)!) };
}

export function duplicateRoute(ctx: Ctx) {
  const type = ctx.params.type as EntityType;
  assertType(type);
  const entity = requireEntity(type, ctx.params.id);
  const actor = guard(ctx, 'create', RESOURCE_FOR_TYPE[type]);
  const source = workingRevision(entity);
  if (!source) throw ApiError.validation('Nothing to duplicate: the source has no saved draft.');
  // PAGE-06: new ids, unpublished state, unique slug, no approval or schedule carried over.
  const base = `${entity.slug ?? type}-copy`;
  const slug = uniqueSlug(type, base);
  const made = createEntity({ type, slug, payload: { ...source.payload, slug }, actor, label: 'duplicate' });
  return made;
}

export function archiveRoute(ctx: Ctx) {
  const type = ctx.params.type as EntityType;
  assertType(type);
  const entity = requireEntity(type, ctx.params.id);
  const actor = guard(ctx, 'archive', RESOURCE_FOR_TYPE[type], entity.id);
  const impact = archiveImpact(type, entity.id);
  if (impact.blocked.length) {
    // AC-35 / PAGE-07: report what would break and require a resolution first.
    throw ApiError.conflict(`Archive blocked: ${impact.blocked.join('; ')}.`, impact);
  }
  const row = setVisibility({ entityId: entity.id, visibility: 'archived', actor, expectedVersion: entity.version });
  clearUsages(entity.id);
  return { entity: summarize(row), impact };
}

export function revisionsRoute(ctx: Ctx) {
  const entity = requireEntity(ctx.params.type as EntityType, ctx.params.id);
  guard(ctx, 'read', RESOURCE_FOR_TYPE[entity.type], entity.id);
  return { entityId: entity.id, items: listRevisions(entity.id).map((r) => ({
    id: r.id,
    label: r.label,
    createdAt: r.createdAt,
    actorUserId: r.actorUserId,
    contentHash: r.contentHash.slice(0, 12),
    parentRevisionId: r.parentRevisionId,
  })) };
}

export function diffRoute(ctx: Ctx) {
  const entity = requireEntity(ctx.params.type as EntityType, ctx.params.id);
  guard(ctx, 'read', RESOURCE_FOR_TYPE[entity.type], entity.id);
  const fromId = Number(ctx.query.get('from'));
  const toId = Number(ctx.query.get('to'));
  const from = fromId ? readRevision(fromId) : null;
  const to = readRevision(toId || entity.working_revision_id || 0);
  if (!to) throw ApiError.notFound('No revision to compare against.');
  if (from && from.entityId !== entity.id) throw ApiError.validation('Revisions must belong to the same entity.');
  return diffRevisions(from, to);
}

export function restoreRoute(ctx: Ctx) {
  const entity = requireEntity(ctx.params.type as EntityType, ctx.params.id);
  const actor = guard(ctx, 'restore', RESOURCE_FOR_TYPE[entity.type], entity.id);
  const revisionId = Number(ctx.params.revisionId);
  const expectedVersion = Number(ctx.body.expectedVersion ?? entity.version);
  const result = restoreRevision({ entityId: entity.id, revisionId, actor, expectedVersion });
  record({ actor, action: `${entity.type}.restore_revision`, resourceType: RESOURCE_FOR_TYPE[entity.type], resourceId: entity.id, revisionId, outcome: 'ok' });
  return result;
}

// ---- releases ----

export function buildReleaseRoute(ctx: Ctx) {
  guard(ctx, 'publish', 'release');
  const items = (ctx.body.items ?? []) as { entityType: string; entityId: string; revisionId?: number }[];
  if (!Array.isArray(items) || !items.length) throw ApiError.validation('Release needs at least one entity.');
  // PERM-03: every entry needs publish permission, and price entries need the price field group.
  for (const item of items) {
    if (!isEntityType(item.entityType)) throw ApiError.validation(`Unknown entity type ${item.entityType}.`);
    guard(ctx, 'publish', RESOURCE_FOR_TYPE[item.entityType], item.entityId);
    const revision = item.revisionId ? readRevision(item.revisionId) : workingRevision(requireEntity(item.entityType, item.entityId));
    if (revision && entityCarriesPriceChange(item.entityType, revision.payload)) {
      guard(ctx, 'price', RESOURCE_FOR_TYPE[item.entityType], item.entityId, 'price');
    }
  }
  const built = buildManifest(
    items.map((i) => ({ entityType: i.entityType as EntityType, entityId: i.entityId, revisionId: i.revisionId })),
    ctx.actor,
  );
  const report = validateRelease(built.id);
  return { releaseId: built.id, manifest: built.manifest, validation: report };
}

export function activateReleaseRoute(ctx: Ctx) {
  guard(ctx, 'publish', 'release');
  const releaseId = ctx.params.id;
  if (!getRelease(releaseId)) throw ApiError.notFound(`Unknown release ${releaseId}.`);
  const result = activateRelease({ releaseId, actor: ctx.actor, idempotencyKey: ctx.idempotencyKey });
  return { release: getRelease(releaseId), ...result };
}

export function validateReleaseRoute(ctx: Ctx) {
  guard(ctx, 'publish', 'release');
  return validateRelease(ctx.params.id);
}

export function releasesRoute(ctx: Ctx) {
  guard(ctx, 'read', 'release');
  return { items: listReleases(intParam(ctx.query.get('limit'), 25, 100)), active: getActiveRelease() };
}

// ---- helpers ----

function summarize(entity: EntityRow) {
  const working = workingRevision(entity);
  const payload = working?.payload ?? {};
  const variants = Array.isArray(payload.variants) ? (payload.variants as Record<string, unknown>[]) : [];
  const start = variants.length ? startingPrice(variants.map(variantInput)) : { amountVnd: null, multiple: false };
  return {
    id: entity.id,
    type: entity.type,
    slug: entity.slug,
    visibility: entity.visibility,
    version: entity.version,
    workingRevisionId: entity.working_revision_id,
    publishedRevisionId: entity.published_revision_id,
    unpublishedChanges: hasUnpublishedChanges(entity),
    updatedAt: entity.updated_at,
    updatedBy: entity.updated_by,
    title: typeof payload.title === 'string' ? payload.title : null,
    sku: typeof payload.sku === 'string' ? payload.sku : null,
    printedNumber: typeof payload.printedNumber === 'number' ? payload.printedNumber : null,
    provisionalName: payload.nameProvisional === true,
    startingPriceVnd: start.amountVnd,
    importProvenance: (payload.import as Record<string, unknown>) ?? null,
  };
}

function issuesFor(type: EntityType, payload: Record<string, unknown>): string[] {
  const issues: string[] = [];
  if (type === 'product') {
    if (!payload.coverAssetId) issues.push('No cover image assigned.');
    if (payload.nameProvisional === true) issues.push('Name is provisional — an owner must confirm it before publication.');
    const gallery = Array.isArray(payload.gallery) ? (payload.gallery as Record<string, unknown>[]) : [];
    if (gallery.some((g) => !g.alt && g.decorative !== true)) issues.push('Some images need alt text or an explicit decorative flag.');
  }
  if (type === 'collection') {
    if (payload.membershipMode === 'rules' && !payload.rules) issues.push('Rule-based membership has no rules defined.');
  }
  return issues;
}

function blockersFor(type: EntityType, payload: Record<string, unknown>) {
  const { errors } = validatePayload(type, payload, {
    mode: 'publish',
    collectionIds: knownCollectionIds(),
    mediaIds: knownMediaIds(),
    productIds: knownProductIds(),
  });
  return errors;
}

function requireEntity(type: EntityType, id: string): EntityRow {
  assertType(type);
  const entity = getEntity(id);
  if (!entity || entity.type !== type) throw ApiError.notFound(`No ${type} with id ${id}.`);
  return entity;
}

function assertType(type: string): void {
  if (!isEntityType(type)) throw ApiError.notFound(`Unknown content type "${type}".`);
}

function uniqueSlug(type: EntityType, base: string): string {
  let candidate = base;
  let n = 2;
  while (findBySlug(type, candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

function takenSkus(selfEntityId: string): string[] {
  return all<{ sku: string }>(
    `SELECT json_extract(cr.payload, '$.sku') AS sku
     FROM entity e JOIN content_revision cr ON cr.id = e.working_revision_id
     WHERE e.type = 'product' AND e.visibility != 'archived' AND e.id != ? AND sku IS NOT NULL AND sku != ''`,
    selfEntityId,
  ).map((r) => r.sku);
}

function entityCarriesPriceChange(type: EntityType, payload: Record<string, unknown>): boolean {
  if (type !== 'product') return false;
  const variants = Array.isArray(payload.variants) ? (payload.variants as Record<string, unknown>[]) : [];
  return variants.some((v) => v.priceVnd !== null && v.priceVnd !== undefined);
}

function archiveImpact(type: EntityType, entityId: string) {
  const blocked: string[] = [];
  const referencedBy: string[] = [];
  if (type === 'product') {
    const collections = all<{ id: string; slug: string | null }>(
      `SELECT e.id, e.slug FROM entity e JOIN content_revision cr ON cr.id = e.working_revision_id
       WHERE e.type = 'collection' AND e.visibility = 'published' AND json_extract(cr.payload, '$.manualIds') LIKE ?`,
      `%"${entityId}"%`,
    );
    for (const c of collections) referencedBy.push(`collection:${c.slug ?? c.id}`);
    if (referencedBy.length) blocked.push(`referenced by ${referencedBy.length} published collection(s)`);
  }
  const grids = all<{ id: string }>(
    `SELECT e.id FROM entity e JOIN content_revision cr ON cr.id = e.working_revision_id
     WHERE e.type = 'page' AND e.visibility = 'published' AND cr.payload LIKE ?`,
    `%"${entityId}"%`,
  );
  if (grids.length) referencedBy.push(...grids.map((g) => `page:${g.id}`));
  return { blocked, referencedBy };
}

function syncUsages(type: EntityType, entityId: string, payload: Record<string, unknown>): void {
  if (type !== 'product' && type !== 'page') return;
  clearUsages(entityId);
  if (type === 'page') {
    const sections = Array.isArray(payload.sections) ? (payload.sections as Record<string, unknown>[]) : [];
    sections.forEach((s, i) => {
      if (s.imageAssetId) setUsage({ assetId: String(s.imageAssetId), entityId, entityType: type, field: `sections[${i}].imageAssetId` });
    });
    return;
  }
  const gallery = Array.isArray(payload.gallery) ? (payload.gallery as Record<string, unknown>[]) : [];
  if (payload.coverAssetId) setUsage({ assetId: String(payload.coverAssetId), entityId, entityType: type, field: 'cover' });
  gallery.forEach((g, i) => {
    if (g.assetId) setUsage({ assetId: String(g.assetId), entityId, entityType: type, field: `gallery[${i}]`, altOverride: (g.alt as string) ?? null });
  });
}

function variantInput(v: Record<string, unknown>) {
  return {
    priceVnd: typeof v.priceVnd === 'number' ? v.priceVnd : null,
    compareAtVnd: typeof v.compareAtVnd === 'number' ? v.compareAtVnd : null,
    salePriceVnd: typeof v.salePriceVnd === 'number' ? v.salePriceVnd : null,
    saleStart: typeof v.saleStart === 'string' ? v.saleStart : null,
    saleEnd: typeof v.saleEnd === 'string' ? v.saleEnd : null,
  };
}

/** AC-16 support: surfaced on the product detail screen so a printed-price mismatch is visible. */
export function priceMismatchRoute(ctx: Ctx) {
  const entity = requireEntity('product', ctx.params.id);
  guard(ctx, 'read', 'product', entity.id);
  const payload = workingRevision(entity)?.payload ?? {};
  const variants = Array.isArray(payload.variants) ? (payload.variants as Record<string, unknown>[]) : [];
  const price = variants.length ? effectivePrice(variantInput(variants[0])).payableVnd : null;
  const assetIds = [payload.coverAssetId, ...((payload.gallery as Record<string, unknown>[]) ?? []).map((g) => g.assetId)].filter(Boolean) as string[];
  return {
    priceVnd: price,
    mismatches: [...new Set(assetIds)].map((id) => printedPriceMismatch(id, price)).filter(Boolean),
  };
}

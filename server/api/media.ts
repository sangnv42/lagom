// Media and import routes. Uploads use a raw request body (no multipart parser), which keeps the
// server free of dependencies.

import { guard, intParam } from './_shared.ts';
import { ApiError } from '../errors.ts';
import {
  counts,
  deleteAsset,
  getAsset,
  listAssets,
  patchMetadata,
  readBytes,
  replaceWithVersion,
  upload,
  usages,
} from '../media.ts';
import { applyImport, jobStatus, planImport, reportCsv, DEFAULT_NAMESPACE } from '../importer.ts';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Ctx } from '../http.ts';

export function listMediaRoute(ctx: Ctx) {
  guard(ctx, 'read', 'media');
  const used = ctx.query.get('used');
  return listAssets({
    q: ctx.query.get('q') ?? undefined,
    mime: ctx.query.get('mime') ?? undefined,
    used: used === 'used' || used === 'unused' ? used : undefined,
    limit: intParam(ctx.query.get('limit'), 60, 200),
    offset: intParam(ctx.query.get('offset'), 0, 100_000),
  });
}

export function mediaDetailRoute(ctx: Ctx) {
  guard(ctx, 'read', 'media');
  const asset = getAsset(ctx.params.id);
  if (!asset) throw ApiError.notFound(`Unknown asset ${ctx.params.id}.`);
  return { asset, usages: usages(asset.id) };
}

export function uploadRoute(ctx: Ctx) {
  const actor = guard(ctx, 'create', 'media');
  const filename = ctx.query.get('filename') ?? 'image';
  const asset = upload({
    body: ctx.rawBody,
    filename,
    actor,
    source: 'upload',
    containsPrintedPrice: ctx.query.get('printedPrice') !== null,
    embeddedPriceVnd: ctx.query.get('printedPrice') ? Number(ctx.query.get('printedPrice')) : null,
  });
  return { asset, usages: usages(asset.id) };
}

export function patchMediaRoute(ctx: Ctx) {
  const actor = guard(ctx, 'edit', 'media', ctx.params.id);
  const patch = ctx.body as Record<string, unknown>;
  return patchMetadata({
    assetId: ctx.params.id,
    patch: {
      title: patch.title as string | undefined,
      altText: patch.altText as string | undefined,
      decorative: patch.decorative as boolean | undefined,
      caption: patch.caption as string | undefined,
      focalX: patch.focalX as number | undefined,
      focalY: patch.focalY as number | undefined,
      notes: patch.notes as string | undefined,
      source: patch.source as string | undefined,
      containsPrintedPrice: patch.containsPrintedPrice as boolean | undefined,
      embeddedPriceVnd: (patch.embeddedPriceVnd as number | null | undefined) ?? undefined,
    },
    actor,
  });
}

/** MEDIA-07 / AC-18: a replacement is a new immutable version, never an overwrite. */
export function replaceMediaRoute(ctx: Ctx) {
  const actor = guard(ctx, 'edit', 'media', ctx.params.id);
  const filename = ctx.query.get('filename') ?? 'image';
  const asset = replaceWithVersion({ assetId: ctx.params.id, body: ctx.rawBody, filename, actor });
  return { asset, usages: usages(asset.id) };
}

export function usagesRoute(ctx: Ctx) {
  guard(ctx, 'read', 'media');
  return { assetId: ctx.params.id, usages: usages(ctx.params.id) };
}

/** MEDIA-08 / AC-17: deletion is blocked while live content or retained revisions reference it. */
export function deleteMediaRoute(ctx: Ctx) {
  const actor = guard(ctx, 'archive', 'media', ctx.params.id);
  return deleteAsset(ctx.params.id, actor);
}

export function mediaBytesRoute(ctx: Ctx) {
  // Public by design: published storefront pages reference stored media. Draft-only assets stay
  // unreachable because a draft page never publishes a reference to them (MEDIA-10).
  const found = readBytes(ctx.params.id);
  if (!found) throw ApiError.notFound('Media not available.');
  ctx.res.writeHead(200, { 'content-type': found.mime, 'content-length': found.body.length, 'cache-control': 'private, max-age=300' });
  ctx.res.end(found.body);
  return null;
}

export function mediaCountsRoute(ctx: Ctx) {
  guard(ctx, 'read', 'media');
  return { ...counts(), derivativePipeline: 'not-configured' };
}

// ---- imports ----

/** IMPORT-07: validate first. The request body is the raw price-list JSON text. */
export function validateImportRoute(ctx: Ctx) {
  const actor = guard(ctx, 'create', 'import');
  const filename = ctx.query.get('filename') ?? 'flower_prices.json';
  const text = ctx.rawBody.toString('utf8');
  const imageDir = imageDirFrom(ctx);
  const plan = planImport({
    text,
    filename,
    namespace: (ctx.query.get('namespace') as string | null) ?? DEFAULT_NAMESPACE,
    actor,
    dryRun: true,
    imageDir,
    printedPrices: printedPricesFrom(ctx.body),
  });
  return plan;
}

export function applyImportRoute(ctx: Ctx) {
  const actor = guard(ctx, 'create', 'import');
  const jobId = String(ctx.body.jobId ?? '');
  if (!jobId) throw ApiError.validation('jobId is required to apply an import.');
  return applyImport({ jobId, actor, imageDir: imageDirFrom(ctx), printedPrices: printedPricesFrom(ctx.body) });
}

export function importStatusRoute(ctx: Ctx) {
  guard(ctx, 'read', 'import');
  return jobStatus(ctx.params.id);
}

export function importReportRoute(ctx: Ctx) {
  guard(ctx, 'read', 'import');
  const report = reportCsv(ctx.params.id);
  ctx.res.writeHead(200, {
    'content-type': 'text/csv; charset=utf-8',
    'content-disposition': `attachment; filename="${report.filename}"`,
  });
  ctx.res.end(report.csv);
  return null;
}

function imageDirFrom(ctx: Ctx): string | null {
  const requested = ctx.query.get('imageDir');
  const candidate = requested ? join(process.cwd(), requested) : join(process.cwd(), 'public', 'img', 'hoa');
  return existsSync(candidate) ? candidate : null;
}

function printedPricesFrom(body: Record<string, unknown>): Record<string, number> | undefined {
  const map = body.printedPrices;
  if (!map || typeof map !== 'object' || Array.isArray(map)) return undefined;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(map as Record<string, unknown>)) {
    const n = Number(v);
    if (Number.isInteger(n) && n > 0) out[k] = n;
  }
  return out;
}

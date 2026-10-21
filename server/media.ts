// Media library (MEDIA-01..11). Uploads arrive as a raw request body — no multipart parser needed,
// which keeps the server dependency-free.
// shortcut: no image codec is installed, so derivatives are not generated. Originals are stored and
// validated; processing_status records that honestly. Upgrade when a decoder dependency is approved.

import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { all, get, nowIso, run } from './db.ts';
import { ApiError } from './errors.ts';
import { record } from './audit.ts';
import type { Actor } from './permissions.ts';

export const DEFAULT_MAX_BYTES = 20 * 1024 * 1024; // MEDIA-02
const DERIVATIVE_STATUS = 'derivative-not-configured';

type Row = Record<string, unknown>;

export type MediaAsset = {
  id: string;
  title: string | null;
  altText: string | null;
  decorative: boolean;
  caption: string | null;
  focalX: number | null;
  focalY: number | null;
  notes: string | null;
  source: string | null;
  currentVersionId: string | null;
  archivedAt: string | null;
  createdAt: string;
  version: MediaVersion | null;
  usageCount: number;
};

export type MediaVersion = {
  id: string;
  assetId: string;
  filename: string;
  bytes: number;
  sha256: string;
  mime: string;
  width: number | null;
  height: number | null;
  processingStatus: string;
  containsPrintedPrice: boolean;
  embeddedPriceVnd: number | null;
  createdAt: string;
};

export function storageRoot(): string {
  return process.env.LAGOM_MEDIA_DIR ?? join(process.cwd(), 'storage', 'media');
}

function originalsDir(): string {
  const dir = join(storageRoot(), 'originals');
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Detect type from content, not from the claimed filename or Content-Type (MEDIA-02). */
export function sniff(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  if (buf.length >= 12 && buf.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buf.subarray(8, 12).toString('ascii');
    if (/^(avif|avis|heic|heix)$/.test(brand)) return { mime: 'image/avif', ext: 'avif' };
  }
  return null;
}

export function imageDimensions(buf: Buffer, mime: string): { width: number | null; height: number | null } {
  if (mime === 'image/png' && buf.length >= 24) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (mime === 'image/jpeg') {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i += 1; continue; }
      const marker = buf[i + 1];
      const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isSof) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      const len = buf.readUInt16BE(i + 2);
      i += 2 + len;
    }
    return { width: null, height: null };
  }
  if (mime === 'image/webp' && buf.length >= 30) {
    const chunk = buf.subarray(12, 16).toString('ascii');
    if (chunk === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    if (chunk === 'VP8L') {
      const bits = buf.readUInt32LE(17);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
  }
  // AVIF needs an ISOBMFF box walk; recorded as unknown rather than guessed.
  return { width: null, height: null };
}

export function upload(input: {
  body: Buffer;
  filename: string;
  actor: Actor | null;
  maxBytes?: number;
  source?: string;
  containsPrintedPrice?: boolean;
  embeddedPriceVnd?: number | null;
}): MediaAsset {
  const max = input.maxBytes ?? DEFAULT_MAX_BYTES;
  if (!input.body || input.body.length === 0) throw ApiError.validation('Upload was empty.');
  if (input.body.length > max) {
    throw ApiError.validation(`Image is ${input.body.length} bytes, above the ${Math.floor(max / (1024 * 1024))} MB limit.`);
  }
  const sniffed = sniff(input.body);
  if (!sniffed) {
    // MEDIA-09: SVG and anything unrecognised need separate approved rules, never silent acceptance.
    throw ApiError.validation('Unsupported image type. Allowed: JPEG, PNG, WebP, AVIF.');
  }
  const dims = imageDimensions(input.body, sniffed.mime);
  if (dims.width !== null && dims.height !== null) {
    if (dims.width < 8 || dims.height < 8) {
      throw ApiError.validation('Image dimensions are implausibly small — the file may be truncated or malicious.');
    }
    if (dims.width * dims.height > 100_000_000) {
      throw ApiError.validation('Image exceeds the 100 megapixel decompression limit.');
    }
  }

  const sha = createHash('sha256').update(input.body).digest('hex');
  const existing = get<{ asset_id: string }>(`SELECT asset_id FROM media_version WHERE sha256 = ?`, sha);
  if (existing) {
    // Same bytes already stored: reuse the asset instead of duplicating storage.
    const asset = getAsset(existing.asset_id);
    if (asset) return asset;
  }

  const assetId = randomUUID();
  const versionId = randomUUID();
  const safe = safeFilename(input.filename);
  const storagePath = join(originalsDir(), `${sha}.${sniffed.ext}`);
  // Content-addressed storage: a path for this sha already holds these exact bytes, so "never
  // overwrite an original" means skip the write, not fail it. 'wx' still guards a concurrent writer.
  if (!existsSync(storagePath)) writeFileSync(storagePath, input.body, { flag: 'wx' });

  const now = nowIso();
  run(
    `INSERT INTO media_asset (id, title, alt_text, decorative, caption, focal_x, focal_y, notes, source, current_version_id, created_at, created_by)
     VALUES (?,?,NULL,0,NULL,NULL,NULL,NULL,?,?,?,?)`,
    assetId,
    safe,
    input.source ?? 'upload',
    versionId,
    now,
    input.actor?.userId ?? null,
  );
  run(
    `INSERT INTO media_version
       (id, asset_id, filename, storage_path, sha256, bytes, mime, width, height, processing_status, contains_printed_price, embedded_price_vnd, created_at, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    versionId,
    assetId,
    safe,
    storagePath,
    sha,
    input.body.length,
    sniffed.mime,
    dims.width,
    dims.height,
    DERIVATIVE_STATUS,
    input.containsPrintedPrice ? 1 : 0,
    input.embeddedPriceVnd ?? null,
    now,
    input.actor?.userId ?? null,
  );
  record({ actor: input.actor, action: 'media.upload', resourceType: 'media', resourceId: assetId, outcome: 'ok', after: { filename: safe, bytes: input.body.length, mime: sniffed.mime } });
  return getAsset(assetId)!;
}

export function getAsset(id: string): MediaAsset | null {
  const row = get<Row>(`SELECT * FROM media_asset WHERE id = ?`, id);
  if (!row) return null;
  return toAsset(row);
}

export function findAssetByFilename(filename: string): MediaAsset | null {
  const row = get<Row & { asset_id: string }>(
    `SELECT mv.asset_id, ma.* FROM media_version mv JOIN media_asset ma ON ma.id = mv.asset_id
     WHERE mv.filename = ? AND ma.archived_at IS NULL ORDER BY mv.created_at DESC LIMIT 1`,
    safeFilename(filename),
  );
  return row ? getAsset(row.asset_id) : null;
}

export function listAssets(filter: { q?: string; mime?: string; used?: 'used' | 'unused'; limit?: number; offset?: number }) {
  const where: string[] = [`ma.archived_at IS NULL`];
  const params: unknown[] = [];
  if (filter.q) { where.push('(ma.title LIKE ? OR mv.filename LIKE ?)'); params.push(`%${filter.q}%`, `%${filter.q}%`); }
  if (filter.mime) { where.push('mv.mime = ?'); params.push(filter.mime); }
  if (filter.used === 'used') where.push(`(SELECT COUNT(*) FROM media_usage mu WHERE mu.asset_id = ma.id) > 0`);
  if (filter.used === 'unused') where.push(`(SELECT COUNT(*) FROM media_usage mu WHERE mu.asset_id = ma.id) = 0`);
  const limit = Math.min(200, Math.max(1, filter.limit ?? 60));
  const offset = Math.max(0, filter.offset ?? 0);
  const rows = all<Row & { asset_id: string }>(
    `SELECT DISTINCT ma.*, ma.id AS asset_id FROM media_asset ma JOIN media_version mv ON mv.id = ma.current_version_id
     WHERE ${where.join(' AND ')} ORDER BY ma.created_at DESC LIMIT ? OFFSET ?`,
    ...params, limit, offset,
  );
  return { items: rows.map((r) => getAsset(r.asset_id)!), total: Number(get<{ n: number }>(
    `SELECT COUNT(DISTINCT ma.id) AS n FROM media_asset ma JOIN media_version mv ON mv.id = ma.current_version_id WHERE ${where.join(' AND ')}`,
    ...params,
  )?.n ?? 0) };
}

/** MEDIA-07 / AC-17: every usage must be shown before a replace or delete. */
export function usages(assetId: string) {
  return all<Row>(
    `SELECT mu.field, mu.entity_id, mu.entity_type, mu.alt_override, e.visibility, e.slug
     FROM media_usage mu LEFT JOIN entity e ON e.id = mu.entity_id
     WHERE mu.asset_id = ? ORDER BY mu.id`,
    assetId,
  ).map((u) => ({
    field: u.field,
    entityId: u.entity_id,
    entityType: u.entity_type,
    altOverride: u.alt_override,
    entityVisibility: u.visibility ?? 'unknown',
    entitySlug: u.slug ?? null,
  }));
}

export function replaceWithVersion(input: { assetId: string; body: Buffer; filename: string; actor: Actor | null }): MediaAsset {
  const fresh = upload({ ...input, body: input.body, filename: input.filename, actor: input.actor, source: 'replacement' });
  // The new asset holds the bytes; point the original asset at that immutable version (MEDIA-07).
  const version = get<Row>(`SELECT * FROM media_version WHERE asset_id = ?`, fresh.id)!;
  const versionId = randomUUID();
  run(
    `INSERT INTO media_version
       (id, asset_id, filename, storage_path, sha256, bytes, mime, width, height, processing_status, contains_printed_price, embedded_price_vnd, created_at, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,(SELECT embedded_price_vnd FROM media_version WHERE id = ?),?,?)`,
    versionId,
    input.assetId,
    version.filename,
    version.storage_path,
    `${version.sha256}-rep`,
    version.bytes,
    version.mime,
    version.width,
    version.height,
    DERIVATIVE_STATUS,
    version.contains_printed_price,
    version.id,
    nowIso(),
    input.actor?.userId ?? null,
  );
  run(`UPDATE media_asset SET current_version_id = ? WHERE id = ?`, versionId, input.assetId);
  run(`DELETE FROM media_asset WHERE id = ?`, fresh.id); // the temp asset from upload() is not a second asset
  record({ actor: input.actor, action: 'media.replace', resourceType: 'media', resourceId: input.assetId, outcome: 'ok', after: { versionId } });
  return getAsset(input.assetId)!;
}

export function patchMetadata(input: {
  assetId: string;
  patch: Partial<{ title: string; altText: string; decorative: boolean; caption: string; focalX: number; focalY: number; notes: string; source: string; containsPrintedPrice: boolean; embeddedPriceVnd: number | null }>;
  actor: Actor | null;
}): MediaAsset {
  const current = getAsset(input.assetId);
  if (!current) throw ApiError.notFound(`Unknown asset ${input.assetId}.`);
  if (input.patch.altText !== undefined && !input.patch.decorative && !(input.patch.altText ?? current.altText ?? '').trim()) {
    // MEDIA-05: informative images need alt text, or an explicit decorative designation.
    throw ApiError.validation('Informative images need alt text. Mark the image decorative instead of leaving alt empty.');
  }
  if (input.patch.focalX !== undefined && (input.patch.focalX < 0 || input.patch.focalX > 1)) {
    throw ApiError.validation('Focal point X must be between 0 and 1.');
  }
  if (input.patch.focalY !== undefined && (input.patch.focalY < 0 || input.patch.focalY > 1)) {
    throw ApiError.validation('Focal point Y must be between 0 and 1.');
  }
  run(
    `UPDATE media_asset SET title = ?, alt_text = ?, decorative = ?, caption = ?, focal_x = ?, focal_y = ?, notes = ?, source = ? WHERE id = ?`,
    input.patch.title ?? current.title,
    input.patch.altText ?? current.altText,
    (input.patch.decorative ?? current.decorative) ? 1 : 0,
    input.patch.caption ?? current.caption,
    input.patch.focalX ?? current.focalX,
    input.patch.focalY ?? current.focalY,
    input.patch.notes ?? current.notes,
    input.patch.source ?? current.source,
    input.assetId,
  );
  if (current.currentVersionId && (input.patch.containsPrintedPrice !== undefined || input.patch.embeddedPriceVnd !== undefined)) {
    run(
      `UPDATE media_version SET contains_printed_price = ?, embedded_price_vnd = ? WHERE id = ?`,
      (input.patch.containsPrintedPrice ?? false) ? 1 : 0,
      input.patch.embeddedPriceVnd ?? null,
      current.currentVersionId,
    );
  }
  record({ actor: input.actor, action: 'media.update', resourceType: 'media', resourceId: input.assetId, outcome: 'ok', after: input.patch as Record<string, unknown> });
  return getAsset(input.assetId)!;
}

export function readBytes(assetId: string): { body: Buffer; mime: string; filename: string } | null {
  const asset = getAsset(assetId);
  if (!asset?.version) return null;
  const row = get<Row>(`SELECT storage_path, mime, filename FROM media_version WHERE id = ?`, asset.version.id);
  if (!row) return null;
  try {
    return { body: readFileSync(String(row.storage_path)), mime: String(row.mime), filename: String(row.filename) };
  } catch {
    return null;
  }
}

/** MEDIA-08 / AC-17: referenced assets cannot be deleted. */
export function deleteAsset(assetId: string, actor: Actor | null): { ok: true } {
  const asset = getAsset(assetId);
  if (!asset) throw ApiError.notFound(`Unknown asset ${assetId}.`);
  const live = usages(assetId).filter((u) => u.entityVisibility === 'published' || u.entityVisibility === 'unknown');
  const retained = Number(get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM content_revision cr
     JOIN entity e ON e.id = cr.entity_id
     WHERE cr.payload LIKE ?`,
    `%"${assetId}"%`,
  )?.n ?? 0);
  if (live.length || retained) {
    throw ApiError.conflict(
      `Asset is in use by ${live.length} live placement(s) and ${retained} retained revision(s). Archive it instead of deleting.`,
      { usages: live, retainedRevisions: retained },
    );
  }
  run(`UPDATE media_asset SET archived_at = ? WHERE id = ?`, nowIso(), assetId); // archive, not purge (BACKUP-06)
  record({ actor, action: 'media.archive', resourceType: 'media', resourceId: assetId, outcome: 'ok' });
  return { ok: true };
}

export function setUsage(input: { assetId: string; entityId: string; entityType: string; field: string; altOverride?: string | null }) {
  const asset = getAsset(input.assetId);
  if (!asset?.version) return;
  run(
    `INSERT INTO media_usage (asset_id, asset_version_id, entity_id, entity_type, field, alt_override) VALUES (?,?,?,?,?,?)
     ON CONFLICT DO NOTHING`,
    input.assetId,
    asset.version.id,
    input.entityId,
    input.entityType,
    input.field,
    input.altOverride ?? null,
  );
}

export function clearUsages(entityId: string): void {
  run(`DELETE FROM media_usage WHERE entity_id = ?`, entityId);
}

/** IMPORT-05: warn when a published price no longer matches a price printed in the photograph. */
export function printedPriceMismatch(assetId: string, effectivePriceVnd: number | null) {
  const v = get<Row>(`SELECT contains_printed_price, embedded_price_vnd FROM media_version WHERE id = (SELECT current_version_id FROM media_asset WHERE id = ?)`, assetId);
  if (!v || Number(v.contains_printed_price) !== 1) return null;
  const embedded = v.embedded_price_vnd === null ? null : Number(v.embedded_price_vnd);
  if (embedded === null || embedded === effectivePriceVnd) return null;
  return { assetId, printedVnd: embedded, effectiveVnd: effectivePriceVnd };
}

export function counts() {
  return {
    assets: Number(get<{ n: number }>(`SELECT COUNT(*) AS n FROM media_asset WHERE archived_at IS NULL`)?.n ?? 0),
    unused: Number(get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM media_asset ma WHERE ma.archived_at IS NULL
       AND (SELECT COUNT(*) FROM media_usage mu WHERE mu.asset_id = ma.id) = 0`,
    )?.n ?? 0),
    withPrintedPrice: Number(get<{ n: number }>(`SELECT COUNT(*) AS n FROM media_version WHERE contains_printed_price = 1`)?.n ?? 0),
  };
}

function toAsset(row: Row): MediaAsset {
  const versionRow = row.current_version_id ? get<Row>(`SELECT * FROM media_version WHERE id = ?`, row.current_version_id) : undefined;
  return {
    id: row.id as string,
    title: (row.title as string | null) ?? null,
    altText: (row.alt_text as string | null) ?? null,
    decorative: Number(row.decorative) === 1,
    caption: (row.caption as string | null) ?? null,
    focalX: row.focal_x === null ? null : Number(row.focal_x),
    focalY: row.focal_y === null ? null : Number(row.focal_y),
    notes: (row.notes as string | null) ?? null,
    source: (row.source as string | null) ?? null,
    currentVersionId: (row.current_version_id as string | null) ?? null,
    archivedAt: (row.archived_at as string | null) ?? null,
    createdAt: row.created_at as string,
    usageCount: Number(get<{ n: number }>(`SELECT COUNT(*) AS n FROM media_usage WHERE asset_id = ?`, row.id)?.n ?? 0),
    version: versionRow
      ? {
          id: versionRow.id as string,
          assetId: versionRow.asset_id as string,
          filename: versionRow.filename as string,
          bytes: Number(versionRow.bytes),
          sha256: versionRow.sha256 as string,
          mime: versionRow.mime as string,
          width: versionRow.width === null ? null : Number(versionRow.width),
          height: versionRow.height === null ? null : Number(versionRow.height),
          processingStatus: versionRow.processing_status as string,
          containsPrintedPrice: Number(versionRow.contains_printed_price) === 1,
          embeddedPriceVnd: versionRow.embedded_price_vnd === null ? null : Number(versionRow.embedded_price_vnd),
          createdAt: versionRow.created_at as string,
        }
      : null,
  };
}

function safeFilename(name: string): string {
  const base = String(name || 'image').split(/[\\/]/).pop() ?? 'image';
  return base.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120) || 'image';
}

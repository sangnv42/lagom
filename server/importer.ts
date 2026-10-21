// Catalog importer (IMPORT-01..08) for the owner's flower price list plus its image set.
//
// Contract highlights enforced here:
//  - dry run first, per-row decisions, downloadable report, idempotent apply (IMPORT-07, AC-14)
//  - repeated printed numbers 39/40/41 stay separate products (IMPORT-02, AC-15)
//  - provisional names are visibly provisional and cannot be published unreviewed (IMPORT-04)
//  - assets that carry a price printed in the photo are flagged, never silently rewritten (IMPORT-05)

import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { all, get, nowIso, run } from './db.ts';
import { ApiError } from './errors.ts';
import { record } from './audit.ts';
import { contentHash, createEntity, saveDraft } from './revisions.ts';
import { validatePayload } from './schemas.ts';
import { effectivePrice } from './pricing.ts';
import { findAssetByFilename, printedPriceMismatch, upload } from './media.ts';
import type { Actor } from './permissions.ts';

export const DEFAULT_NAMESPACE = 'lagom-price-list-2026-10';

type Row = Record<string, unknown>;

export type PriceListRow = {
  externalKey: string;
  printedNumber: number;
  priceVnd: number;
  priceLabel: string;
  sourceImage: string | null;
  sourcePosition: number | null;
  croppedImage: string;
};

export type RowDecision = 'new' | 'unchanged' | 'modified' | 'invalid';

export type PlannedRow = {
  externalKey: string;
  decision: RowDecision;
  message: string | null;
  entityId: string | null;
  slug: string | null;
  title: string | null;
  priceVnd: number | null;
  warnings: string[];
};

export type ImportPlan = {
  jobId: string;
  namespace: string;
  filename: string;
  sha256: string;
  dryRun: boolean;
  total: number;
  counts: Record<RowDecision, number>;
  rows: PlannedRow[];
};

/** Parse and schema-validate the price list. Structural failures are row-level, not job-level. */
export function parsePriceList(text: string): { rows: PriceListRow[]; errors: { index: number; message: string }[] } {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    throw ApiError.validation('The price list is not valid JSON.');
  }
  const items = Array.isArray((doc as { items?: unknown })?.items)
    ? ((doc as { items: unknown[] }).items as Row[])
    : Array.isArray(doc)
      ? (doc as Row[])
      : null;
  if (!items) throw ApiError.validation('Expected an "items" array of price rows.');

  const rows: PriceListRow[] = [];
  const errors: { index: number; message: string }[] = [];
  items.forEach((raw, index) => {
    const externalKey = typeof raw.id === 'string' ? raw.id.trim() : '';
    const printedNumber = Number(raw.product_number);
    const priceVnd = Number(raw.price_vnd);
    const cropped = typeof raw.cropped_image === 'string' ? raw.cropped_image.trim() : '';
    if (!externalKey) errors.push({ index, message: 'Missing id — no stable external key.' });
    if (!Number.isInteger(printedNumber) || printedNumber < 1) errors.push({ index, message: 'product_number must be a positive whole number.' });
    if (!Number.isInteger(priceVnd) || priceVnd < 0) errors.push({ index, message: 'price_vnd must be a whole number of dong, zero or above.' });
    if (!cropped) errors.push({ index, message: 'cropped_image is required to bind the price to its photo.' });
    if (errors.length) return;
    rows.push({
      externalKey,
      printedNumber,
      priceVnd,
      priceLabel: typeof raw.price_label === 'string' ? raw.price_label : '',
      sourceImage: typeof raw.source_image === 'string' ? raw.source_image : null,
      sourcePosition: Number.isFinite(Number(raw.position)) ? Number(raw.position) : null,
      croppedImage: cropped,
    });
  });
  return { rows, errors };
}

/**
 * Decide every row without writing. Re-running the same file reports `unchanged` for rows whose
 * payload already matches, which is what makes apply idempotent (IMPORT-03, AC-14).
 */
export function planImport(input: {
  text: string;
  filename: string;
  namespace?: string;
  actor: Actor | null;
  dryRun: boolean;
  imageDir?: string | null;
  printedPrices?: Record<string, number>;
}): ImportPlan {
  const namespace = input.namespace ?? DEFAULT_NAMESPACE;
  const { rows, errors } = parsePriceList(input.text);
  const sha256 = createHash('sha256').update(input.text).digest('hex');
  const counts: Record<RowDecision, number> = { new: 0, unchanged: 0, modified: 0, invalid: errors.length };

  const slugCounters = new Map<number, number>();
  const planned: PlannedRow[] = [];

  rows.forEach((row) => {
    const occurrence = (slugCounters.get(row.printedNumber) ?? 0) + 1;
    slugCounters.set(row.printedNumber, occurrence);
    const suffix = occurrence > 1 ? String.fromCharCode(96 + occurrence) : '';
    const slug = `hoa-${row.printedNumber}${suffix}`;
    const page = pageOfImage(row.croppedImage);
    // IMPORT-04: the photos carry no verified name or composition, so the name is provisional.
    const title = `Bouquet ${row.printedNumber} — page ${String(page).padStart(2, '0')}`;

    const existing = findProductByExternalKey(namespace, row.externalKey);
    const payload = buildProductPayload({ row, slug, title, namespace, occurrence });
    const warnings = payloadWarnings(row, input.imageDir ?? null);

    let decision: RowDecision;
    let message: string | null = null;
    if (!existing) {
      decision = 'new';
    } else {
      // Compare only the fields the file actually controls. Image bindings and admin edits are added
      // after import, so hashing the whole stored payload would report "modified" on every re-run and
      // AC-14 could never be satisfied.
      const storedHash = storedSourceHash(existing.working_revision_id);
      decision = storedHash === contentHash(comparablePayload(payload)) ? 'unchanged' : 'modified';
      if (decision === 'modified') message = 'Values differ from the stored draft; the newer file wins.';
    }
    counts[decision] += 1;
    planned.push({
      externalKey: row.externalKey,
      decision,
      message,
      entityId: existing ? existing.id : null,
      slug,
      title,
      priceVnd: row.priceVnd,
      warnings,
    });
  });

  const jobId = randomUUID();
  storeSource(jobId, input.filename, input.text); // apply replays from this exact source (IMPORT-07)
  run(
    `INSERT INTO import_job
       (id, namespace, source_kind, source_sha256, filename, dry_run, status, rows_total, rows_new, rows_unchanged, rows_modified, rows_invalid, created_at, created_by)
     VALUES (?,?,'flower-prices',?,?,?,?,?,?,?,?,?,?,?)`,
    jobId,
    namespace,
    sha256,
    input.filename,
    input.dryRun ? 1 : 0,
    'validated',
    planned.length + errors.length,
    counts.new,
    counts.unchanged,
    counts.modified,
    counts.invalid,
    nowIso(),
    input.actor?.userId ?? null,
  );
  for (const p of planned) {
    run(
      `INSERT INTO import_row (job_id, external_key, decision, message, entity_id) VALUES (?,?,?,?,?)
       ON CONFLICT(job_id, external_key) DO UPDATE SET decision = excluded.decision, message = excluded.message, entity_id = excluded.entity_id`,
      jobId,
      p.externalKey,
      p.decision,
      [p.message, ...p.warnings].filter(Boolean).join(' | ') || null,
      p.entityId,
    );
  }
  record({
    actor: input.actor,
    action: input.dryRun ? 'import.validate' : 'import.plan',
    resourceType: 'import',
    resourceId: jobId,
    outcome: 'ok',
    after: { namespace, filename: input.filename, counts },
  });
  return { jobId, namespace, filename: input.filename, sha256, dryRun: input.dryRun, total: planned.length, counts, rows: planned };
}

/**
 * Apply a validated plan to drafts. Nothing is published here (PUB-01). Re-applying is safe: an
 * unchanged payload does not create a second revision, so a retry cannot duplicate rows (AC-14).
 */
export function applyImport(input: { jobId: string; actor: Actor | null; imageDir?: string | null; printedPrices?: Record<string, number> }) {
  const job = get<Row & { dry_run: number }>(`SELECT * FROM import_job WHERE id = ?`, input.jobId);
  if (!job) throw ApiError.notFound(`Unknown import job ${input.jobId}.`);
  if (job.status === 'applied') {
    return { jobId: job.id as string, status: 'applied', alreadyApplied: true, created: 0, updated: 0, skipped: 0 };
  }
  const namespace = job.namespace as string;
  const text = readStoredSource(job.id as string, job.filename as string);
  const plan = planImport({ text, filename: job.filename as string, namespace, actor: input.actor, dryRun: false, imageDir: input.imageDir, printedPrices: input.printedPrices });
  const { rows } = parsePriceList(text);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const slugCounters = new Map<number, number>();

  for (const [index, row] of rows.entries()) {
    const planned = plan.rows[index];
    if (!planned || planned.decision === 'invalid') { skipped += 1; continue; }
    const occurrence = (slugCounters.get(row.printedNumber) ?? 0) + 1;
    slugCounters.set(row.printedNumber, occurrence);
    const payload = buildProductPayload({
      row,
      slug: planned.slug!,
      title: planned.title!,
      namespace,
      occurrence,
    });

    attachImage({ payload, row, actor: input.actor, imageDir: input.imageDir ?? null, printedPrices: input.printedPrices });

    const problems = validatePayload('product', payload, { mode: 'draft' }).errors;
    if (problems.length) {
      skipped += 1;
      run(`UPDATE import_row SET decision = 'invalid', message = ? WHERE job_id = ? AND external_key = ?`,
        problems.map((p) => `${p.path}: ${p.message}`).join('; '), job.id, row.externalKey);
      continue;
    }

    const existing = findProductByExternalKey(namespace, row.externalKey);
    if (existing) {
      if (planned.decision === 'unchanged') { skipped += 1; continue; }
      saveDraft({ entityId: existing.id, payload, actor: input.actor, expectedVersion: Number(existing.version), slug: planned.slug, label: 'import' });
      updated += 1;
    } else {
      const made = createEntity({ type: 'product', slug: planned.slug, payload, actor: input.actor, label: 'import' });
      run(`UPDATE import_row SET decision = 'new', entity_id = ?, revision_id = ? WHERE job_id = ? AND external_key = ?`,
        made.entityId, made.revisionId, job.id, row.externalKey);
      created += 1;
      continue;
    }
    run(`UPDATE import_row SET entity_id = ? WHERE job_id = ? AND external_key = ?`, existing.id, job.id, row.externalKey);
  }

  run(`UPDATE import_job SET status = 'applied', applied_at = ?, rows_new = ?, rows_modified = ?, rows_unchanged = ? WHERE id = ?`,
    nowIso(), created, updated, skipped, job.id);
  record({
    actor: input.actor,
    action: 'import.apply',
    resourceType: 'import',
    resourceId: job.id as string,
    outcome: 'ok',
    after: { created, updated, skipped },
  });
  return { jobId: job.id as string, status: 'applied', alreadyApplied: false, created, updated, skipped };
}

/** IMPORT-07: downloadable per-row report. */
export function reportCsv(jobId: string): { filename: string; csv: string } {
  const job = get<Row>(`SELECT * FROM import_job WHERE id = ?`, jobId);
  if (!job) throw ApiError.notFound(`Unknown import job ${jobId}.`);
  const rows = all<Row>(`SELECT * FROM import_row WHERE job_id = ? ORDER BY id`, jobId);
  const lines = ['external_key,decision,message,entity_id'];
  for (const r of rows) {
    lines.push([r.external_key, r.decision, String(r.message ?? '').replace(/,/g, ';'), r.entity_id ?? ''].join(','));
  }
  return { filename: `import-${jobId}.csv`, csv: lines.join('\n') };
}

export function jobStatus(jobId: string) {
  const job = get<Row>(`SELECT * FROM import_job WHERE id = ?`, jobId);
  if (!job) throw ApiError.notFound(`Unknown import job ${jobId}.`);
  return {
    id: job.id,
    namespace: job.namespace,
    filename: job.filename,
    dryRun: Number(job.dry_run) === 1,
    status: job.status,
    totals: {
      total: Number(job.rows_total),
      new: Number(job.rows_new),
      unchanged: Number(job.rows_unchanged),
      modified: Number(job.rows_modified),
      invalid: Number(job.rows_invalid),
    },
    createdAt: job.created_at,
    appliedAt: job.applied_at,
    rows: all<Row>(`SELECT external_key, decision, message, entity_id FROM import_row WHERE job_id = ? ORDER BY id`, jobId),
  };
}

/** AC-16: mismatches between a published effective price and a price printed in the photo. */
export function mismatchesFor(entityId: string) {
  const entity = get<Row>(`SELECT * FROM entity WHERE id = ?`, entityId);
  if (!entity?.working_revision_id) return [];
  const revision = get<{ payload: string }>(`SELECT payload FROM content_revision WHERE id = ?`, entity.working_revision_id);
  if (!revision) return [];
  let payload: Row;
  try {
    payload = JSON.parse(revision.payload) as Row;
  } catch {
    return [];
  }
  const variants = Array.isArray(payload.variants) ? (payload.variants as Row[]) : [];
  const price = variants.length ? effectivePrice(variants[0] as never).payableVnd : null;
  const assetIds = [...new Set<string>(([payload.coverAssetId, ...((payload.gallery as Row[]) ?? []).map((g) => g.assetId)].filter(Boolean) as string[]))];
  return assetIds.map((id) => printedPriceMismatch(id, price)).filter(Boolean);
}

function buildProductPayload(input: { row: PriceListRow; slug: string; title: string; namespace: string; occurrence: number }): Record<string, unknown> {
  const row = input.row;
  return {
    title: input.title,
    nameProvisional: true, // IMPORT-04: publish gate refuses a provisional name until an owner confirms it
    slug: input.slug,
    sku: `${input.namespace.split('-')[0]}-${String(row.printedNumber).padStart(3, '0')}${String.fromCharCode(96 + input.occurrence)}`,
    printedNumber: row.printedNumber,
    description: '',
    careNotes: '',
    substitutionNote: '',
    collectionIds: [],
    occasion: [],
    flowerTypes: [],
    colors: [],
    gallery: [],
    badges: [],
    featured: false,
    priority: 0,
    variants: [
      {
        id: 'v1',
        sku: `${input.namespace.split('-')[0]}-${String(row.printedNumber).padStart(3, '0')}${String.fromCharCode(96 + input.occurrence)}-v1`,
        label: 'Tiêu chuẩn',
        priceVnd: row.priceVnd,
        compareAtVnd: null,
        salePriceVnd: null,
        saleStart: null,
        saleEnd: null,
        availability: 'available',
        leadHours: null,
        imageIds: [],
      },
    ],
    seo: { title: null, description: null, indexable: true },
    order: row.sourcePosition ?? 0,
    import: {
      namespace: input.namespace,
      externalKey: row.externalKey,
      sourceImage: row.sourceImage,
      sourcePosition: row.sourcePosition,
      priceLabel: row.priceLabel,
    },
  };
}

function payloadWarnings(row: PriceListRow, imageDir: string | null): string[] {
  const warnings: string[] = [];
  const file = imageDir ? join(imageDir, row.croppedImage) : null;
  if (!file || !existsSync(file)) warnings.push(`No image file found for ${row.croppedImage}; the product will need an image before publication.`);
  if (row.priceLabel && !/^\s*[\d.]+\s*đ\s*$/.test(row.priceLabel)) {
    warnings.push(`price_label "${row.priceLabel}" is kept as provenance only and is never used as a number.`);
  }
  return warnings;
}

function attachImage(input: { payload: Record<string, unknown>; row: PriceListRow; actor: Actor | null; imageDir: string | null; printedPrices?: Record<string, number> }) {
  let assetId: string | null = null;
  if (input.imageDir) {
    const path = join(input.imageDir, input.row.croppedImage);
    if (existsSync(path)) {
      // IMPORT-06: the original file is stored as-is; cropping would create a separate derivative.
      const asset = upload({
        body: readFileSync(path),
        filename: input.row.croppedImage,
        actor: input.actor,
        source: `${input.payload.import ? (input.payload.import as Row).namespace : 'import'}/${input.row.externalKey}`,
        containsPrintedPrice: input.printedPrices?.[input.row.externalKey] !== undefined,
        embeddedPriceVnd: input.printedPrices?.[input.row.externalKey] ?? null,
      });
      assetId = asset.id;
    }
  }
  if (!assetId) {
    const match = findAssetByFilename(input.row.croppedImage);
    if (match) assetId = match.id;
  }
  if (!assetId) return;
  input.payload.coverAssetId = assetId;
  input.payload.gallery = [{ assetId, alt: null, decorative: false }];
  const variants = input.payload.variants as Record<string, unknown>[];
  if (variants[0]) variants[0].imageIds = [assetId];
}

/** A stored source row, narrowed from SQLite's untyped rows. */
type ProductRef = { id: string; version: number; working_revision_id: number | null };

/**
 * Drop fields that the price list does not own, so a re-import compares like for like: image
 * bindings and per-variant image lists are attached during apply and may later be edited by staff.
 */
function comparablePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...payload };
  delete copy.coverAssetId;
  delete copy.gallery;
  if (Array.isArray(copy.variants)) {
    copy.variants = (copy.variants as Record<string, unknown>[]).map((v) => {
      const variant = { ...v };
      delete variant.imageIds;
      return variant;
    });
  }
  return copy;
}

function storedSourceHash(revisionId: number | null): string | null {
  if (!revisionId) return null;
  const row = get<{ payload: string }>(`SELECT payload FROM content_revision WHERE id = ?`, revisionId);
  if (!row) return null;
  try {
    return contentHash(comparablePayload(JSON.parse(row.payload) as Record<string, unknown>));
  } catch {
    return null;
  }
}

function findProductByExternalKey(namespace: string, externalKey: string): ProductRef | null {
  const row = get<{ id: string; version: number; working_revision_id: number | null }>(
    `SELECT e.id, e.version, e.working_revision_id FROM entity e
     JOIN content_revision cr ON cr.id = e.working_revision_id
     WHERE e.type = 'product' AND json_extract(cr.payload, '$.import.namespace') = ?
       AND json_extract(cr.payload, '$.import.externalKey') = ?`,
    namespace,
    externalKey,
  );
  return row ?? null;
}

function pageOfImage(filename: string): number {
  const match = /(\d+)/.exec(filename);
  return match ? Number(match[1]) : 1;
}

/**
 * Apply replays from the exact bytes that were validated, so a plan cannot drift between dry run
 * and apply, and a retry never re-reads a changed file (IMPORT-07).
 */
function storeSource(jobId: string, filename: string, text: string): void {
  mkdirSync(uploadsDir(), { recursive: true });
  writeFileSync(sourcePath(jobId, filename), text, 'utf8');
}

function readStoredSource(jobId: string, filename: string): string {
  const path = sourcePath(jobId, filename);
  if (!existsSync(path)) {
    throw ApiError.validation(`The validated price list for job ${jobId} is no longer available. Validate it again.`);
  }
  return readFileSync(path, 'utf8');
}

function sourcePath(jobId: string, filename: string): string {
  const safe = String(filename || 'price-list.json').split(/[\\/]/).pop()!.replace(/[^A-Za-z0-9._-]/g, '_');
  return join(uploadsDir(), `${jobId}-${safe}`);
}

export function uploadsDir(): string {
  return join(process.cwd(), 'storage', 'uploads');
}

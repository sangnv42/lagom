// Entities, immutable revisions, drafts, optimistic concurrency, history and diff.
// docs/admin/data-model.md explains the shape; PUB-01 and EDIT-07 are the behaviour contracts.

import { createHash, randomUUID } from 'node:crypto';
import { all, get, nowIso, run, tx } from './db.ts';
import { ApiError } from './errors.ts';
import { record, changedFields } from './audit.ts';
import type { Actor } from './permissions.ts';

export type EntityType =
  | 'product' | 'collection' | 'settings' | 'page' | 'ui-string' | 'theme'
  | 'navigation' | 'promotion' | 'testimonial' | 'faq';
export type Visibility = 'unpublished' | 'published' | 'archived';

export type EntityRow = {
  id: string;
  type: string;
  schema_version: number;
  slug: string | null;
  visibility: string;
  working_revision_id: number | null;
  published_revision_id: number | null;
  version: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
};

export type RevisionRow = {
  id: number;
  entity_id: string;
  entity_type: string;
  schema_version: number;
  payload: string;
  content_hash: string;
  parent_revision_id: number | null;
  label: string;
  actor_user_id: string | null;
  created_at: string;
};

export type Revision = {
  id: number;
  entityId: string;
  entityType: string;
  schemaVersion: number;
  label: string;
  actorUserId: string | null;
  createdAt: string;
  contentHash: string;
  parentRevisionId: number | null;
  payload: Record<string, unknown>;
};

export const SCHEMA_VERSION = 1;

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalJson((value as Record<string, unknown>)[k])).join(',') + '}';
}

export function contentHash(payload: Record<string, unknown>): string {
  return createHash('sha256').update(canonicalJson(payload)).digest('hex');
}

export function getEntity(id: string): EntityRow | null {
  return get<EntityRow>(`SELECT * FROM entity WHERE id = ?`, id) ?? null;
}

export function findBySlug(type: EntityType, slug: string): EntityRow | null {
  return (
    get<EntityRow>(
      `SELECT * FROM entity WHERE type = ? AND slug = ? AND visibility != 'archived'`,
      type,
      slug,
    ) ?? null
  );
}

export function listEntities(filter: {
  type: EntityType;
  visibility?: Visibility | 'all';
  q?: string;
  limit?: number;
  offset?: number;
}): { rows: EntityRow[]; total: number } {
  const where = [`type = ?`];
  const params: unknown[] = [filter.type];
  if (filter.visibility && filter.visibility !== 'all') {
    where.push('visibility = ?');
    params.push(filter.visibility);
  } else if (!filter.visibility) {
    where.push(`visibility != 'archived'`);
  }
  if (filter.q) {
    where.push('(slug LIKE ? OR id IN (SELECT entity_id FROM content_revision WHERE payload LIKE ?))');
    params.push(`%${filter.q}%`, `%${filter.q}%`);
  }
  const limit = Math.min(200, Math.max(1, filter.limit ?? 50));
  const offset = Math.max(0, filter.offset ?? 0);
  const whereSql = where.join(' AND ');
  const rows = all<EntityRow>(
    `SELECT * FROM entity WHERE ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    ...params,
    limit,
    offset,
  );
  const total = Number(get<{ n: number }>(`SELECT COUNT(*) AS n FROM entity WHERE ${whereSql}`, ...params)?.n ?? 0);
  return { rows, total };
}

export function readRevision(revisionId: number): Revision | null {
  const row = get<RevisionRow>(`SELECT * FROM content_revision WHERE id = ?`, revisionId);
  return row ? toRevision(row) : null;
}

export function workingRevision(entity: EntityRow): Revision | null {
  return entity.working_revision_id ? readRevision(entity.working_revision_id) : null;
}

export function publishedRevision(entity: EntityRow): Revision | null {
  return entity.published_revision_id ? readRevision(entity.published_revision_id) : null;
}

export function hasUnpublishedChanges(entity: EntityRow): boolean {
  return entity.working_revision_id !== entity.published_revision_id;
}

export function createEntity(input: {
  type: EntityType;
  slug: string | null;
  payload: Record<string, unknown>;
  actor: Actor | null;
  label?: string;
  schemaVersion?: number;
}): { entityId: string; revisionId: number; version: number } {
  const id = randomUUID();
  const now = nowIso();
  const schemaVersion = input.schemaVersion ?? SCHEMA_VERSION;
  return tx(() => {
    run(
      `INSERT INTO entity (id, type, schema_version, slug, visibility, version, created_at, updated_at, updated_by)
       VALUES (?,?,?,?, 'unpublished', 1, ?, ?, ?)`,
      id,
      input.type,
      schemaVersion,
      input.slug,
      now,
      now,
      input.actor?.userId ?? null,
    );
    const revisionId = insertRevision(id, input.type, schemaVersion, input.payload, null, input.label ?? 'draft', input.actor);
    run(`UPDATE entity SET working_revision_id = ?, version = 2 WHERE id = ?`, revisionId, id);
    record({
      actor: input.actor,
      action: `${input.type}.create`,
      resourceType: input.type as never,
      resourceId: id,
      revisionId,
      outcome: 'ok',
      after: input.payload,
    });
    return { entityId: id, revisionId, version: 2 };
  });
}

/**
 * Save a working draft. Never publishes (PUB-01). A version mismatch means someone else saved
 * first, so both sides come back for explicit reconciliation instead of last-write-wins (EDIT-07, AC-08).
 */
export function saveDraft(input: {
  entityId: string;
  payload: Record<string, unknown>;
  actor: Actor | null;
  expectedVersion: number;
  slug?: string | null;
  label?: string;
}): { entityId: string; revisionId: number; version: number } {
  return tx(() => {
    const entity = getEntity(input.entityId);
    if (!entity) throw ApiError.notFound(`Unknown entity ${input.entityId}.`);
    const parent = entity.working_revision_id;
    const sameHash =
      parent !== null && readRevision(parent)?.contentHash === contentHash(input.payload);

    if (entity.version !== input.expectedVersion) {
      throw ApiError.conflict(
        'Another editor saved first. Compare the two versions before continuing.',
        {
          expectedVersion: input.expectedVersion,
          currentVersion: entity.version,
          currentRevisionId: entity.working_revision_id,
          yourRevisionId: parent,
        },
      );
    }

    const nextSlug = input.slug === undefined ? entity.slug : input.slug;
    if (nextSlug !== entity.slug && nextSlug) {
      assertSlugFree(entity.type as EntityType, nextSlug, entity.id);
    }

    const updated = run(
      `UPDATE entity SET working_revision_id = working_revision_id, version = version + 1,
         slug = ?, updated_at = ?, updated_by = ?
       WHERE id = ? AND version = ?`,
      nextSlug,
      nowIso(),
      input.actor?.userId ?? null,
      entity.id,
      input.expectedVersion,
    );
    if (updated.changes === 0) {
      throw ApiError.conflict('Save conflict: the record changed while saving.', { entityId: entity.id });
    }

    // An identical payload still counts as a save but does not pile up a duplicate revision.
    if (sameHash && input.slug === undefined) {
      const row = getEntity(entity.id)!;
      return { entityId: entity.id, revisionId: row.working_revision_id!, version: row.version };
    }

    const revisionId = insertRevision(
      entity.id,
      entity.type,
      entity.schema_version,
      input.payload,
      parent,
      input.label ?? 'draft',
      input.actor,
    );
    run(`UPDATE entity SET working_revision_id = ? WHERE id = ?`, revisionId, entity.id);

    const before = parent ? readRevision(parent)?.payload ?? null : null;
    const diff = changedFields(before, input.payload);
    record({
      actor: input.actor,
      action: `${entity.type}.save_draft`,
      resourceType: entity.type as never,
      resourceId: entity.id,
      revisionId,
      outcome: 'ok',
      before: diff.before,
      after: diff.after,
    });
    const row = getEntity(entity.id)!;
    return { entityId: entity.id, revisionId, version: row.version };
  });
}

export function listRevisions(entityId: string): Revision[] {
  return all<RevisionRow>(
    `SELECT * FROM content_revision WHERE entity_id = ? ORDER BY id DESC`,
    entityId,
  ).map(toRevision);
}

/** Field-level comparison for HIST-02: nested objects flatten to dotted paths. */
export function diffRevisions(from: Revision | null, to: Revision) {
  const before = flatten(from?.payload ?? {});
  const after = flatten(to.payload);
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  const changes: { path: string; before: unknown; after: unknown }[] = [];
  for (const k of keys) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
      changes.push({ path: k, before: before[k], after: after[k] });
    }
  }
  const numeric = changes.filter((c) => typeof c.before === 'number' || typeof c.after === 'number');
  return { changes, numeric, fromId: from?.id ?? null, toId: to.id };
}

export function restoreRevision(input: {
  entityId: string;
  revisionId: number;
  actor: Actor | null;
  expectedVersion: number;
}): { entityId: string; revisionId: number; version: number } {
  const entity = getEntity(input.entityId);
  if (!entity) throw ApiError.notFound(`Unknown entity ${input.entityId}.`);
  const source = readRevision(input.revisionId);
  if (!source || source.entityId !== input.entityId) throw ApiError.notFound(`Unknown revision ${input.revisionId}.`);
  // HIST-03: restoring creates a new draft and never erases history.
  return saveDraft({
    entityId: entity.id,
    payload: source.payload,
    actor: input.actor,
    expectedVersion: input.expectedVersion,
    label: 'restored',
  });
}

export function setVisibility(input: {
  entityId: string;
  visibility: Visibility;
  actor: Actor | null;
  expectedVersion: number;
}): EntityRow {
  return tx(() => {
    const entity = getEntity(input.entityId);
    if (!entity) throw ApiError.notFound(`Unknown entity ${input.entityId}.`);
    if (entity.version !== input.expectedVersion) {
      throw ApiError.conflict('The record changed while you were working.', { currentVersion: entity.version });
    }
    run(
      `UPDATE entity SET visibility = ?, version = version + 1, updated_at = ?, updated_by = ? WHERE id = ?`,
      input.visibility,
      nowIso(),
      input.actor?.userId ?? null,
      entity.id,
    );
    record({
      actor: input.actor,
      action: `${entity.type}.${input.visibility}`,
      resourceType: entity.type as never,
      resourceId: entity.id,
      outcome: 'ok',
      before: { visibility: entity.visibility },
      after: { visibility: input.visibility },
    });
    return getEntity(entity.id)!;
  });
}

export function slugOf(entity: EntityRow): string | null {
  return entity.slug;
}

function assertSlugFree(type: EntityType, slug: string, exceptId: string): void {
  const clash = get<EntityRow>(
    `SELECT id FROM entity WHERE type = ? AND slug = ? AND id != ? AND visibility != 'archived'`,
    type,
    slug,
    exceptId,
  );
  if (clash) throw ApiError.conflict(`Slug "${slug}" is already in use.`, { slug, conflictEntityId: clash.id });
}

function insertRevision(
  entityId: string,
  entityType: string,
  schemaVersion: number,
  payload: Record<string, unknown>,
  parentRevisionId: number | null,
  label: string,
  actor: Actor | null,
): number {
  const result = run(
    `INSERT INTO content_revision
       (entity_id, entity_type, schema_version, payload, content_hash, parent_revision_id, label, actor_user_id, created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    entityId,
    entityType,
    schemaVersion,
    canonicalJson(payload),
    contentHash(payload),
    parentRevisionId,
    label,
    actor?.userId ?? null,
    nowIso(),
  );
  return Number(result.lastInsertRowid);
}

/** A corrupt revision row must not take the admin down, so it degrades to an observable marker. */
function parsePayload(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { [CORRUPT_PAYLOAD]: true };
  }
}

export const CORRUPT_PAYLOAD = '__corruptPayload';

function toRevision(row: RevisionRow): Revision {
  return {
    id: row.id,
    entityId: row.entity_id,
    entityType: row.entity_type,
    schemaVersion: row.schema_version,
    label: row.label,
    actorUserId: row.actor_user_id,
    createdAt: row.created_at,
    contentHash: row.content_hash,
    parentRevisionId: row.parent_revision_id,
    payload: parsePayload(row.payload),
  };
}

function flatten(value: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v as Record<string, unknown>, path));
    } else {
      out[path] = v;
    }
  }
  return out;
}

// Append-only audit log (AUDIT-01..04). There is deliberately no update or delete function here.

import { all, get, nowIso, run } from './db.ts';
import type { Actor, ResourceType } from './permissions.ts';

export type AuditOutcome = 'ok' | 'denied' | 'failed' | 'conflict';

export type AuditEntry = {
  actor: Actor | null;
  action: string;
  resourceType: ResourceType | 'session';
  resourceId?: string | null;
  revisionId?: number | null;
  releaseId?: string | null;
  outcome: AuditOutcome;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

// AUDIT-02: redact secrets and anything resembling private customer data before it is stored.
const REDACT_KEYS = /^(password|passwordhash|passwordsalt|salt|hash|token|secret|session|cookie|authorization|apikey|api_key|phone|address|name|recipient|message)$/i;
const MAX_VALUE_CHARS = 400;

/** Anything left after redaction is JSON-safe by construction. */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export function redact(value: unknown): JsonValue {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const out: { [key: string]: JsonValue } = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = REDACT_KEYS.test(k) ? '[redacted]' : redact(v);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > MAX_VALUE_CHARS) {
    return value.slice(0, MAX_VALUE_CHARS) + '…';
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  return value === undefined ? null : String(value);
}

/** Field-level before/after map, so a diff can be shown without storing whole payloads (AUDIT-02). */
export function changedFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): { before: Record<string, JsonValue>; after: Record<string, JsonValue> } {
  const b: Record<string, JsonValue> = {};
  const a: Record<string, JsonValue> = {};
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  for (const k of keys) {
    const bv = before?.[k];
    const av = after?.[k];
    if (JSON.stringify(bv) !== JSON.stringify(av)) {
      b[k] = redact(bv);
      a[k] = redact(av);
    }
  }
  return { before: b, after: a };
}

export function record(entry: AuditEntry): void {
  run(
    `INSERT INTO audit_event
       (actor_user_id, action, resource_type, resource_id, revision_id, release_id, outcome, changed_before, changed_after, at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    entry.actor?.userId ?? null,
    entry.action,
    entry.resourceType,
    entry.resourceId ?? null,
    entry.revisionId ?? null,
    entry.releaseId ?? null,
    entry.outcome,
    entry.before ? JSON.stringify(redact(entry.before)) : null,
    entry.after ? JSON.stringify(redact(entry.after)) : null,
    nowIso(),
  );
}

export type AuditFilter = {
  actor?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  outcome?: string;
  from?: string;
  to?: string;
  limit?: number;
};

export function list(filter: AuditFilter) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.actor) { where.push('actor_user_id = ?'); params.push(filter.actor); }
  if (filter.action) { where.push('action = ?'); params.push(filter.action); }
  if (filter.resourceType) { where.push('resource_type = ?'); params.push(filter.resourceType); }
  if (filter.resourceId) { where.push('resource_id = ?'); params.push(filter.resourceId); }
  if (filter.outcome) { where.push('outcome = ?'); params.push(filter.outcome); }
  if (filter.from) { where.push('at >= ?'); params.push(filter.from); }
  if (filter.to) { where.push('at <= ?'); params.push(filter.to); }
  const limit = Math.min(500, Math.max(1, filter.limit ?? 100));
  return all(
    `SELECT * FROM audit_event ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY id DESC LIMIT ?`,
    ...params,
    limit,
  );
}

export function countFailures(): number {
  return Number(get<{ n: number }>(`SELECT COUNT(*) AS n FROM audit_event WHERE outcome = 'failed'`)?.n ?? 0);
}

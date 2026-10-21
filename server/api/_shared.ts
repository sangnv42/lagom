// Shared route helpers: permission gate that audits denials, and validation-context lookups.

import { ApiError } from '../errors.ts';
import { record } from '../audit.ts';
import { can } from '../permissions.ts';
import type { Ctx } from '../http.ts';
import type { Action, Actor, FieldGroup, ResourceType } from '../permissions.ts';
import { all } from '../db.ts';
import { listEntities, type EntityType } from '../revisions.ts';

/** PERM-04: every route passes through here, so enforcement is on the server, not in the UI. */
export function guard(
  ctx: Ctx,
  action: Action,
  resource: ResourceType,
  resourceId: string | null = null,
  fieldGroup: FieldGroup | null = null,
): Actor {
  if (!ctx.actor) throw ApiError.unauthenticated();
  const decision = can(ctx.actor, action, resource, resourceId, fieldGroup);
  if (!decision.allowed) {
    record({
      actor: ctx.actor,
      action: `api.${action}`,
      resourceType: resource,
      resourceId,
      outcome: 'denied',
      after: { reason: decision.reason, fieldGroup },
    });
    throw ApiError.unauthorized(decision.reason, { resource, action, fieldGroup });
  }
  return ctx.actor;
}

export function requireString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw ApiError.validation(`${key} is required.`, [{ path: key, message: 'Required.' }]);
  }
  return value.trim();
}

export function knownCollectionIds(): string[] {
  return listEntities({ type: 'collection', visibility: 'all', limit: 500 }).rows.map((r) => r.id);
}

export function knownProductIds(): string[] {
  return listEntities({ type: 'product', visibility: 'all', limit: 1000 }).rows.map((r) => r.id);
}

export function knownMediaIds(): string[] {
  return all<{ id: string }>(`SELECT id FROM media_asset WHERE archived_at IS NULL`).map((r) => r.id);
}

export function entityTypes(): EntityType[] {
  return ['product', 'collection', 'settings', 'page', 'ui-string', 'theme', 'navigation', 'promotion', 'testimonial', 'faq'];
}

export function isEntityType(value: string): value is EntityType {
  return entityTypes().includes(value as EntityType);
}

export function intParam(value: string | null, fallback: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(0, Math.trunc(n)));
}

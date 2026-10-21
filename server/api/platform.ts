// Session, dashboard, global search, audit reads, staff users and business settings.

import { all, get } from '../db.ts';
import { ApiError } from '../errors.ts';
import { guard, intParam } from './_shared.ts';
import {
  SESSION_COOKIE,
  actorFor,
  checkRateLimit,
  createUser,
  findUserByEmail,
  grantsFor,
  listUsers,
  login,
  revokeSession,
  updateUser,
} from '../auth.ts';
import { can, type ResourceType } from '../permissions.ts';
import { listEntities } from '../revisions.ts';
import { list as auditList, countFailures } from '../audit.ts';
import { counts as mediaCounts } from '../media.ts';
import { getActiveRelease, publicSite } from '../releases.ts';
import type { Ctx } from '../http.ts';

const SESSION_SECONDS = 12 * 3600;

/** Requirements that are deliberately absent in this build; surfaced instead of faked (§2.2). */
const NOT_CONFIGURED = [
  'mfa (SEC-02): not configured — Owner and Admin accounts have no second factor',
  'invitations and password recovery (SEC-01): not configured',
  'scheduled releases (phase 6): not configured — publish is immediate only',
  'review queue (phase 6): not configured — Owner/Admin publish validated drafts directly',
  'media derivative pipeline (MEDIA-03): not configured — originals are stored, no responsive renditions',
  'orders, inquiries, blog, inventory, payments, discounts, analytics (§2.2): absent by design',
];

export function loginRoute(ctx: Ctx) {
  const email = String(ctx.body.email ?? '');
  const password = String(ctx.body.password ?? '');
  const limited = checkRateLimit(email);
  if (limited.blocked) throw ApiError.rateLimited(`Too many sign-in attempts. Try again in ${limited.retryAfterSeconds}s.`, limited.retryAfterSeconds);
  const result = login(email, password);
  if (!result.ok) {
    if (result.reason === 'rate_limited') throw ApiError.rateLimited('Too many sign-in attempts.');
    throw ApiError.unauthenticated('Email or password is incorrect.');
  }
  ctx.cookie(SESSION_COOKIE, result.sessionToken, SESSION_SECONDS);
  return { user: describeUser(result.actor.userId), notConfigured: NOT_CONFIGURED };
}

export function logoutRoute(ctx: Ctx) {
  if (ctx.sessionToken) revokeSession(ctx.sessionToken, ctx.actor);
  ctx.clearCookie(SESSION_COOKIE);
  return { ok: true };
}

export function sessionRoute(ctx: Ctx) {
  if (!ctx.actor) throw ApiError.unauthenticated();
  return {
    user: describeUser(ctx.actor.userId),
    capabilities: capabilitiesFor(ctx.actor.userId),
    notConfigured: NOT_CONFIGURED,
  };
}

export function dashboardRoute(ctx: Ctx) {
  if (!ctx.actor) throw ApiError.unauthenticated();
  const products = listEntities({ type: 'product', visibility: 'all', limit: 1 });
  const publishedProducts = listEntities({ type: 'product', visibility: 'published', limit: 1 });
  const pages = listEntities({ type: 'page', visibility: 'all', limit: 1 });
  const collections = listEntities({ type: 'collection', visibility: 'all', limit: 1 });

  const draftsUnpublished = Number(
    get<{ n: number }>(`SELECT COUNT(*) AS n FROM entity WHERE visibility = 'unpublished'`)?.n ?? 0,
  );
  const unpublishedChanges = Number(
    get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM entity WHERE working_revision_id IS NOT NULL
       AND working_revision_id IS NOT published_revision_id AND visibility != 'archived'`,
    )?.n ?? 0,
  );
  const contentIssues = Number(
    get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM entity e JOIN content_revision cr ON cr.id = e.working_revision_id
       WHERE e.visibility != 'archived' AND (
         json_extract(cr.payload, '$.nameProvisional') = 1
         OR (e.type = 'product' AND json_extract(cr.payload, '$.coverAssetId') IS NULL))`,
    )?.n ?? 0,
  );
  const importProblems = Number(get<{ n: number }>(`SELECT COUNT(*) AS n FROM import_row WHERE decision = 'invalid'`)?.n ?? 0);
  const active = getActiveRelease();
  const site = publicSite();

  return {
    counts: {
      publishedProducts: publishedProducts.total,
      products: products.total,
      collections: collections.total,
      pages: pages.total,
      draftsUnpublished, // there is no review queue yet (phase 6), so this is plain draft count
      unpublishedChanges,
      contentIssues: contentIssues + importProblems,
      scheduledReleases: 0, // scheduling is phase 6; reporting 0 is truthful, inventing a queue is not
      activePromotions: site.promotions.length,
      publishedPages: listEntities({ type: 'page', visibility: 'published', limit: 1 }).total,
      mediaAssets: mediaCounts().assets,
      activeRelease: active ? active.releaseId : null,
      activeSince: active ? active.activatedAt : null,
    },
    tasks: [
      ...(contentIssues ? [{ id: 'provisional-names', label: `${contentIssues} content issue(s) need review`, href: '/admin/products', severity: 'warning' as const }] : []),
      ...(importProblems ? [{ id: 'import-rows', label: `${importProblems} import row(s) failed validation`, href: '/admin/import', severity: 'error' as const }] : []),
      ...(countFailures() ? [{ id: 'failed-jobs', label: `${countFailures()} failed request(s) in the log`, href: '/admin/activity', severity: 'warning' as const }] : []),
    ],
    recentEdits: auditList({ limit: 10, outcome: 'ok' }).map((a) => ({
      id: a.id,
      actor: a.actor_user_id,
      action: a.action,
      resourceType: a.resource_type,
      resourceId: a.resource_id,
      at: a.at,
    })),
    quickActions: quickActionsFor(ctx.actor.userId),
    emptyDatabase: products.total === 0 && pages.total === 0,
    modules: {
      orders: 'not-connected',
      inquiries: 'not-connected',
      blog: 'not-connected',
      inventory: 'not-connected',
      payments: 'not-connected',
      discounts: 'not-connected',
      analytics: 'not-connected',
    },
    notConfigured: NOT_CONFIGURED,
  };
}

/** AC-37: search only reads surfaces the actor may read, so restricted titles never appear. */
export function searchRoute(ctx: Ctx) {
  if (!ctx.actor) throw ApiError.unauthenticated();
  const q = (ctx.query.get('q') ?? '').trim();
  if (q.length < 2) return { query: q, groups: [] };
  const surfaces: { type: ResourceType; label: string }[] = [
    { type: 'product', label: 'Products' },
    { type: 'collection', label: 'Collections' },
    { type: 'page', label: 'Pages' },
  ];
  const groups = [];
  for (const surface of surfaces) {
    if (!can(ctx.actor, 'read', surface.type).allowed) continue;
    const { rows } = listEntities({
      type: surface.type as 'product' | 'collection' | 'page',
      q,
      limit: 10,
    });
    if (!rows.length) continue;
    groups.push({
      type: surface.type,
      label: surface.label,
      items: rows.map((r) => ({ id: r.id, slug: r.slug, visibility: r.visibility })),
    });
  }
  if (can(ctx.actor, 'read', 'media').allowed && q.length >= 2) {
    const media = all<{ id: string; title: string | null }>(
      `SELECT id, title FROM media_asset WHERE archived_at IS NULL AND title LIKE ? LIMIT 10`,
      `%${q}%`,
    );
    if (media.length) groups.push({ type: 'media', label: 'Media', items: media.map((m) => ({ id: m.id, slug: m.title })) });
  }
  return { query: q, groups };
}

export function auditRoute(ctx: Ctx) {
  guard(ctx, 'read', 'audit');
  return {
    items: auditList({
      actor: ctx.query.get('actor') ?? undefined,
      action: ctx.query.get('action') ?? undefined,
      resourceType: ctx.query.get('resourceType') ?? undefined,
      resourceId: ctx.query.get('resourceId') ?? undefined,
      outcome: ctx.query.get('outcome') ?? undefined,
      from: ctx.query.get('from') ?? undefined,
      to: ctx.query.get('to') ?? undefined,
      limit: intParam(ctx.query.get('limit'), 100, 500),
    }),
  };
}

export function listUsersRoute(ctx: Ctx) {
  guard(ctx, 'read', 'user');
  return { items: listUsers().map((u) => ({ ...u, grants: grantsFor(u.id) })) };
}

export function createUserRoute(ctx: Ctx) {
  guard(ctx, 'manage_users', 'user');
  const email = String(ctx.body.email ?? '').trim();
  const password = String(ctx.body.password ?? '');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw ApiError.validation('A valid email is required.', [{ path: 'email', message: 'Invalid email.' }]);
  if (password.length < 12) throw ApiError.validation('Password must be at least 12 characters.', [{ path: 'password', message: 'Too short.' }]);
  if (findUserByEmail(email)) throw ApiError.conflict('That email already has an account.');
  const role = (String(ctx.body.role ?? 'viewer') as 'owner' | 'admin' | 'content-editor' | 'catalog-manager' | 'publisher' | 'viewer');
  const user = createUser({ email, name: String(ctx.body.name ?? email), role, password, actor: ctx.actor });
  return user;
}

export function updateUserRoute(ctx: Ctx) {
  guard(ctx, 'manage_users', 'user');
  const id = ctx.params.id;
  try {
    return updateUser(id, {
      role: ctx.body.role as never,
      status: ctx.body.status as never,
      name: ctx.body.name as never,
    }, ctx.actor!);
  } catch (err) {
    // PERM-07: the last active Owner can never be demoted or disabled.
    throw err instanceof Error && err.message.includes('Owner') ? ApiError.conflict(err.message) : err;
  }
}

export function settingsRoute(ctx: Ctx) {
  guard(ctx, 'read', 'settings');
  const { rows } = listEntities({ type: 'settings', visibility: 'all', limit: 1 });
  const entity = rows[0];
  if (!entity) return { entity: null, payload: null };
  const revision = get<{ payload: string }>(`SELECT payload FROM content_revision WHERE id = ?`, entity.working_revision_id ?? 0);
  let payload: Record<string, unknown> = {};
  if (revision) {
    try {
      payload = JSON.parse(revision.payload) as Record<string, unknown>;
    } catch {
      payload = {};
    }
  }
  return { entity, payload };
}

function describeUser(userId: string) {
  const user = listUsers().find((u) => u.id === userId);
  return user ?? null;
}

function capabilitiesFor(userId: string) {
  const actor = actorFor(userId);
  if (!actor) return {};
  const surfaces: ResourceType[] = ['product', 'collection', 'media', 'page', 'theme', 'settings', 'release', 'user', 'audit', 'import', 'navigation', 'global'];
  const out: Record<string, Record<string, boolean>> = {};
  for (const surface of surfaces) {
    out[surface] = {
      read: can(actor, 'read', surface).allowed,
      edit: can(actor, 'edit', surface).allowed,
      create: can(actor, 'create', surface).allowed,
      archive: can(actor, 'archive', surface).allowed,
      price: can(actor, 'price', surface, null, 'price').allowed,
      publish: can(actor, 'publish', 'release', null, null).allowed && surface !== 'user',
    };
  }
  return out;
}

function quickActionsFor(userId: string) {
  const actor = actorFor(userId);
  if (!actor) return [];
  const actions = [];
  if (can(actor, 'edit', 'page').allowed) actions.push({ label: 'Chỉnh trang chủ', href: '/admin/pages' });
  if (can(actor, 'create', 'product').allowed) actions.push({ label: 'Thêm sản phẩm', href: '/admin/products' });
  if (can(actor, 'create', 'media').allowed) actions.push({ label: 'Tải ảnh lên', href: '/admin/media' });
  if (can(actor, 'create', 'global').allowed) actions.push({ label: 'Tạo khuyến mãi', href: '/admin/promotions' });
  return actions;
}

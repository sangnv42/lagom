// Staff authentication: scrypt password hashing, server-side sessions with revocation, and a login
// rate limit. MFA, invitations and password recovery are not implemented; callers surface them as
// "Not configured" instead of faking them (SEC-01, SEC-02 — see docs/admin/permission-matrix.md).

import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { all, get, nowIso, run } from './db.ts';
import { record } from './audit.ts';
import type { Actor, Role } from './permissions.ts';

export const SESSION_COOKIE = 'lagom_admin';
const SESSION_TTL_HOURS = 12;
const RATE_WINDOW_MINUTES = 15;
const RATE_MAX_FAILURES = 8;

type Row = Record<string, unknown>;

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: 'active' | 'disabled';
  mfaEnrolled: boolean;
  createdAt: string;
};

function hash(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString('hex');
}

export function listUsers(): PublicUser[] {
  return all<Row>(`SELECT * FROM staff_user ORDER BY created_at`).map(toPublicUser);
}

export function findUser(id: string): PublicUser | null {
  const row = get<Row>(`SELECT * FROM staff_user WHERE id = ?`, id);
  return row ? toPublicUser(row) : null;
}

export function findUserByEmail(email: string): PublicUser | null {
  const row = get<Row>(`SELECT * FROM staff_user WHERE email = ?`, normalizeEmail(email));
  return row ? toPublicUser(row) : null;
}

export function activeOwnerCount(): number {
  return Number(
    get<{ n: number }>(`SELECT COUNT(*) AS n FROM staff_user WHERE role = 'owner' AND status = 'active'`)?.n ?? 0,
  );
}

export function createUser(input: {
  email: string;
  name: string;
  role: Role;
  password: string;
  actor: Actor | null;
}): PublicUser {
  const salt = randomBytes(16).toString('hex');
  const id = randomUUID();
  const now = nowIso();
  run(
    `INSERT INTO staff_user (id, email, name, role, status, password_alg, password_hash, password_salt, created_at, updated_at)
     VALUES (?,?,?,?, 'active', 'scrypt', ?, ?, ?, ?)`,
    id,
    normalizeEmail(input.email),
    input.name,
    input.role,
    hash(input.password, salt),
    salt,
    now,
    now,
  );
  record({ actor: input.actor, action: 'user.create', resourceType: 'user', resourceId: id, outcome: 'ok', after: { role: input.role } });
  return findUser(id)!;
}

/**
 * Changing a role or status. PERM-07: the last active Owner can never be demoted or disabled, which
 * would lock everyone out of the ownership-only surface.
 */
export function updateUser(
  id: string,
  patch: { role?: Role; status?: 'active' | 'disabled'; name?: string },
  actor: Actor,
): PublicUser {
  const current = get<Row>(`SELECT * FROM staff_user WHERE id = ?`, id);
  if (!current) throw new Error(`Unknown user ${id}`);
  const wasActiveOwner = current.role === 'owner' && current.status === 'active';
  const staysActiveOwner = (patch.role ?? current.role) === 'owner' && (patch.status ?? current.status) === 'active';
  if (wasActiveOwner && !staysActiveOwner && activeOwnerCount() <= 1) {
    throw new Error('At least one active Owner must remain.'); // PERM-07
  }
  run(
    `UPDATE staff_user SET role = ?, status = ?, name = ?, updated_at = ? WHERE id = ?`,
    patch.role ?? (current.role as string),
    patch.status ?? (current.status as string),
    patch.name ?? (current.name as string),
    nowIso(),
    id,
  );
  // PERM-08: removing access revokes outstanding sessions immediately.
  if ((patch.status ?? current.status) !== 'active') revokeAllForUser(id);
  record({
    actor,
    action: 'user.update',
    resourceType: 'user',
    resourceId: id,
    outcome: 'ok',
    before: { role: current.role, status: current.status },
    after: { role: patch.role ?? current.role, status: patch.status ?? current.status },
  });
  return findUser(id)!;
}

export function setGrants(
  userId: string,
  grants: { resourceType: string; resourceId: string | null; action: string; fieldGroup?: string | null }[],
  actor: Actor,
): void {
  run(`DELETE FROM permission_grant WHERE user_id = ?`, userId);
  for (const g of grants) {
    run(
      `INSERT INTO permission_grant (user_id, resource_type, resource_id, action, field_group) VALUES (?,?,?,?,?)`,
      userId,
      g.resourceType,
      g.resourceId,
      g.action,
      g.fieldGroup ?? null,
    );
  }
  record({ actor, action: 'user.grants', resourceType: 'user', resourceId: userId, outcome: 'ok', after: { grants } });
}

export function grantsFor(userId: string) {
  return all<Row>(`SELECT * FROM permission_grant WHERE user_id = ?`, userId).map((g) => ({
    resourceType: g.resource_type as string,
    resourceId: (g.resource_id as string | null) ?? null,
    action: g.action as string,
    fieldGroup: (g.field_group as string | null) ?? null,
  }));
}

export function actorFor(userId: string): Actor | null {
  const row = get<Row>(`SELECT * FROM staff_user WHERE id = ?`, userId);
  if (!row) return null;
  return {
    userId,
    role: row.role as Role,
    status: row.status === 'active' ? 'active' : 'disabled',
    grants: grantsFor(userId) as Actor['grants'],
  };
}

// ---- login rate limiting (SEC-01) ----

export function checkRateLimit(email: string): { blocked: boolean; retryAfterSeconds: number } {
  const since = new Date(Date.now() - RATE_WINDOW_MINUTES * 60_000).toISOString();
  const failures = Number(
    get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM login_attempt WHERE email = ? AND ok = 0 AND at >= ?`,
      normalizeEmail(email),
      since,
    )?.n ?? 0,
  );
  if (failures >= RATE_MAX_FAILURES) {
    const last = get<{ at: string }>(
      `SELECT at FROM login_attempt WHERE email = ? AND ok = 0 ORDER BY id DESC LIMIT 1`,
      normalizeEmail(email),
    );
    const retry = last ? Math.max(1, Math.ceil((new Date(last.at).getTime() + RATE_WINDOW_MINUTES * 60_000 - Date.now()) / 1000)) : 60;
    return { blocked: true, retryAfterSeconds: retry };
  }
  return { blocked: false, retryAfterSeconds: 0 };
}

export type LoginResult =
  | { ok: true; actor: Actor; sessionToken: string }
  | { ok: false; reason: 'rate_limited' | 'invalid'; retryAfterSeconds?: number };

export function login(email: string, password: string): LoginResult {
  const emailKey = normalizeEmail(email);
  const limit = checkRateLimit(emailKey);
  if (limit.blocked) return { ok: false, reason: 'rate_limited', retryAfterSeconds: limit.retryAfterSeconds };

  const row = get<Row>(`SELECT * FROM staff_user WHERE email = ?`, emailKey);
  const ok = !!row && row.status === 'active' && verifyPassword(password, row.password_salt as string, row.password_hash as string);
  run(`INSERT INTO login_attempt (email, at, ok) VALUES (?,?,?)`, emailKey, nowIso(), ok ? 1 : 0);

  if (!row || !ok) {
    record({ actor: null, action: 'session.login', resourceType: 'session', resourceId: emailKey, outcome: 'denied' });
    return { ok: false, reason: 'invalid' };
  }

  const actor = actorFor(row.id as string)!;
  const token = createSession(row.id as string);
  record({ actor, action: 'session.login', resourceType: 'session', outcome: 'ok' });
  return { ok: true, actor, sessionToken: token };
}

export function verifyPassword(password: string, salt: string, expectedHex: string): boolean {
  const actual = Buffer.from(hash(password, salt), 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createSession(userId: string): string {
  const token = randomBytes(32).toString('base64url');
  const now = nowIso();
  const expires = new Date(Date.now() + SESSION_TTL_HOURS * 3_600_000).toISOString();
  run(`INSERT INTO session (id, user_id, created_at, expires_at) VALUES (?,?,?,?)`, token, userId, now, expires);
  return token;
}

export function resolveSession(token: string): { actor: Actor; expiresAt: string } | null {
  const row = get<Row>(`SELECT * FROM session WHERE id = ?`, token);
  if (!row || row.revoked_at) return null;
  if (new Date(row.expires_at as string).getTime() < Date.now()) return null;
  const actor = actorFor(row.user_id as string);
  // Status is re-read on every request, so a disabled account loses access mid-session (PERM-08).
  if (!actor || actor.status !== 'active') return null;
  return { actor, expiresAt: row.expires_at as string };
}

export function revokeSession(token: string, actor: Actor | null): void {
  run(`UPDATE session SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL`, nowIso(), token);
  record({ actor, action: 'session.logout', resourceType: 'session', outcome: 'ok' });
}

export function revokeAllForUser(userId: string): void {
  run(`UPDATE session SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`, nowIso(), userId);
}

export function sessionCount(): number {
  return Number(
    get<{ n: number }>(`SELECT COUNT(*) AS n FROM session WHERE revoked_at IS NULL AND expires_at > ?`, nowIso())?.n ?? 0,
  );
}

function normalizeEmail(email: string): string {
  return String(email ?? '').trim().toLowerCase();
}

function toPublicUser(row: Row): PublicUser {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    role: row.role as Role,
    status: row.status === 'active' ? 'active' : 'disabled',
    mfaEnrolled: Number(row.mfa_enrolled) === 1,
    createdAt: row.created_at as string,
  };
}

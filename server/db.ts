// SQLite storage: connection, migrations, transaction and query helpers.
// Uses the SQLite driver bundled with Node, so persistence adds no runtime dependency.
// Docs: docs/admin/data-model.md

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export type SqlParam = string | number | null | bigint;

const SCHEMA_VERSION = 1;

let database: DatabaseSync | null = null;
let txDepth = 0;

/** Booleans and undefined are not valid SQLite params; normalize at the boundary. */
function normalize(value: unknown): SqlParam {
  if (value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value as SqlParam;
}

export function dbPath(): string {
  return process.env.LAGOM_DB ?? resolve(process.cwd(), 'lagom.db');
}

export function db(): DatabaseSync {
  if (!database) {
    const path = dbPath();
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    database = new DatabaseSync(path);
    database.exec('PRAGMA journal_mode = WAL');
    database.exec('PRAGMA foreign_keys = ON');
    migrate(database);
  }
  return database;
}

/** Test hook: close and forget the handle so a test can point at a fresh file. */
export function closeDb(): void {
  if (database) {
    database.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    database.close();
    database = null;
  }
}

export function all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T[] {
  return db().prepare(sql).all(...params.map(normalize)) as T[];
}

export function get<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T | undefined {
  return db().prepare(sql).get(...params.map(normalize)) as T | undefined;
}

export function run(sql: string, ...params: unknown[]): { changes: number; lastInsertRowid: number } {
  const result = db().prepare(sql).run(...params.map(normalize));
  return { changes: Number(result.changes), lastInsertRowid: Number(result.lastInsertRowid) };
}

export function scalar<T = unknown>(sql: string, ...params: unknown[]): T | undefined {
  const row = get<Record<string, unknown>>(sql, ...params);
  if (!row) return undefined;
  return Object.values(row)[0] as T;
}

/** Nested-safe transactions. Inner calls use savepoints so a helper can be reused inside a tx. */
export function tx<T>(fn: () => T): T {
  const d = db();
  txDepth += 1;
  const savepoint = `sp_${txDepth}`;
  if (txDepth === 1) d.exec('BEGIN IMMEDIATE');
  else d.exec(`SAVEPOINT ${savepoint}`);
  try {
    const result = fn();
    if (txDepth === 1) d.exec('COMMIT');
    else d.exec(`RELEASE ${savepoint}`);
    txDepth -= 1;
    return result;
  } catch (err) {
    try {
      if (txDepth === 1) d.exec('ROLLBACK');
      else d.exec(`ROLLBACK TO ${savepoint}`);
    } catch {
      // a rolled-back transaction must not mask the original error
    }
    txDepth -= 1;
    throw err;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

function migrate(d: DatabaseSync): void {
  d.exec(`CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  const current = Number(
    d.prepare(`SELECT value FROM schema_meta WHERE key = 'version'`).get()?.value ?? 0,
  );
  if (current > SCHEMA_VERSION) {
    throw new Error(`Database schema version ${current} is newer than this build (${SCHEMA_VERSION}).`);
  }
  d.exec(SCHEMA_SQL);
  d.prepare(
    `INSERT INTO schema_meta (key, value) VALUES ('version', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(String(SCHEMA_VERSION));
}

// content_revision and audit_event are append-only: no UPDATE or DELETE statement for them exists
// anywhere in this codebase (AUDIT-03, HIST-01).
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS entity (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  slug TEXT,
  visibility TEXT NOT NULL DEFAULT 'unpublished',
  working_revision_id INTEGER,
  published_revision_id INTEGER,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS entity_slug ON entity(type, slug)
  WHERE slug IS NOT NULL AND visibility != 'archived';

CREATE TABLE IF NOT EXISTS content_revision (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id TEXT NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  payload TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  parent_revision_id INTEGER,
  label TEXT NOT NULL DEFAULT 'draft',
  actor_user_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS revision_entity ON content_revision(entity_id, id DESC);

CREATE TABLE IF NOT EXISTS staff_user (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  password_alg TEXT NOT NULL DEFAULT 'scrypt',
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  mfa_enrolled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES staff_user(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS session_user ON session(user_id);

CREATE TABLE IF NOT EXISTS login_attempt (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  at TEXT NOT NULL,
  ok INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS login_attempt_email ON login_attempt(email, at);

CREATE TABLE IF NOT EXISTS permission_grant (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES staff_user(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  action TEXT NOT NULL,
  field_group TEXT
);

CREATE TABLE IF NOT EXISTS release (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  note TEXT,
  manifest TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  activated_at TEXT
);

CREATE TABLE IF NOT EXISTS release_active (
  key TEXT PRIMARY KEY,
  release_id TEXT NOT NULL REFERENCES release(id),
  activated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS media_asset (
  id TEXT PRIMARY KEY,
  title TEXT,
  alt_text TEXT,
  decorative INTEGER NOT NULL DEFAULT 0,
  caption TEXT,
  focal_x REAL,
  focal_y REAL,
  notes TEXT,
  source TEXT,
  current_version_id TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS media_version (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES media_asset(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  sha256 TEXT NOT NULL UNIQUE,
  bytes INTEGER NOT NULL,
  mime TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  processing_status TEXT NOT NULL DEFAULT 'stored',
  contains_printed_price INTEGER NOT NULL DEFAULT 0,
  embedded_price_vnd INTEGER,
  created_at TEXT NOT NULL,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS media_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id TEXT NOT NULL REFERENCES media_asset(id) ON DELETE CASCADE,
  asset_version_id TEXT NOT NULL REFERENCES media_version(id),
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  field TEXT NOT NULL,
  alt_override TEXT,
  crop_override TEXT
);
CREATE INDEX IF NOT EXISTS usage_asset ON media_usage(asset_id);

CREATE TABLE IF NOT EXISTS route (
  path TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  redirect_to TEXT,
  redirect_status INTEGER,
  locale TEXT NOT NULL DEFAULT 'vi-VN',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS import_job (
  id TEXT PRIMARY KEY,
  namespace TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  filename TEXT NOT NULL,
  dry_run INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL,
  rows_total INTEGER NOT NULL DEFAULT 0,
  rows_new INTEGER NOT NULL DEFAULT 0,
  rows_unchanged INTEGER NOT NULL DEFAULT 0,
  rows_modified INTEGER NOT NULL DEFAULT 0,
  rows_invalid INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  created_by TEXT,
  applied_at TEXT
);

CREATE TABLE IF NOT EXISTS import_row (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL REFERENCES import_job(id) ON DELETE CASCADE,
  external_key TEXT NOT NULL,
  decision TEXT NOT NULL,
  message TEXT,
  entity_id TEXT,
  revision_id INTEGER,
  UNIQUE(job_id, external_key)
);

CREATE TABLE IF NOT EXISTS audit_event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  revision_id INTEGER,
  release_id TEXT,
  outcome TEXT NOT NULL,
  changed_before TEXT,
  changed_after TEXT,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_at ON audit_event(at DESC);

CREATE TABLE IF NOT EXISTS taxonomy_term (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(type, key)
);

CREATE TABLE IF NOT EXISTS review (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id TEXT NOT NULL,
  revision_id INTEGER NOT NULL,
  requester TEXT,
  reviewer TEXT,
  decision TEXT,
  feedback TEXT,
  requested_at TEXT,
  decided_at TEXT
);

CREATE TABLE IF NOT EXISTS schedule (
  id TEXT PRIMARY KEY,
  release_id TEXT NOT NULL,
  due_at TEXT NOT NULL,
  timezone TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_result TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS idempotency (
  key TEXT PRIMARY KEY,
  actor_user_id TEXT,
  result TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

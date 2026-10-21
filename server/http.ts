// Minimal HTTP layer: routing, body handling, cookie parsing, API-01 error mapping, CSRF guard and
// static file serving. Written directly on node:http so the server stays dependency-free.

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Socket } from 'node:net';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { ApiError, isApiError } from './errors.ts';
import { SESSION_COOKIE, resolveSession } from './auth.ts';
import { record } from './audit.ts';
import type { Actor } from './permissions.ts';

export const MAX_JSON_BYTES = 4 * 1024 * 1024;
export const MAX_MEDIA_BYTES = 25 * 1024 * 1024;

export type Route = {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /** Pattern segments starting with ':' are captured, e.g. '/api/admin/{type}/{id}'. */
  pattern: string;
  handler: (ctx: Ctx) => unknown | Promise<unknown>;
  /** Public routes skip the session requirement (only the public resolver and login use this). */
  public?: boolean;
  /** Raw body mode for media and import file uploads. */
  raw?: boolean;
};

export type Ctx = {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  params: Record<string, string>;
  query: URLSearchParams;
  actor: Actor | null;
  sessionToken: string | null;
  body: Record<string, unknown>;
  rawBody: Buffer;
  idempotencyKey: string | null;
  cookie: (name: string, value: string, maxAgeSeconds: number) => void;
  clearCookie: (name: string) => void;
};

const MUTATING = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
// SameSite=Lax blocks cross-site form posts, but a same-site request can still be forged, so
// mutations additionally require this header the browser will not set cross-site by accident.
const CSRF_HEADER = 'x-requested-with';
const CSRF_HEADER_VALUE = 'LagomAdmin';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

export function compile(routes: Route[]) {
  const compiled = routes.map((r) => ({ ...r, parts: r.pattern.split('/').filter(Boolean) }));
  return function match(method: string, pathname: string): { route: Route; params: Record<string, string> } | null {
    const parts = pathname.split('/').filter(Boolean);
    for (const route of compiled) {
      if (route.method !== method) continue;
      if (route.parts.length !== parts.length) continue;
      const params: Record<string, string> = {};
      let ok = true;
      for (let i = 0; i < route.parts.length; i += 1) {
        const p = route.parts[i];
        if (p.startsWith(':')) params[p.slice(1)] = decodeURIComponent(parts[i]);
        else if (p !== parts[i]) { ok = false; break; }
      }
      if (ok) return { route, params };
    }
    return null;
  };
}

export function createHandler(routes: Route[], staticRoot: string) {
  const match = compile(routes);
  return async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const started = Date.now();
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const method = req.method ?? 'GET';
    try {
      const found = match(method, url.pathname);
      if (!found) {
        if (url.pathname.startsWith('/api/')) throw ApiError.notFound(`No route for ${method} ${url.pathname}.`);
        return serveStatic(res, staticRoot, url.pathname);
      }

      const token = readCookie(req)[SESSION_COOKIE] ?? null;
      const session = token ? resolveSession(token) : null;
      const actor = session?.actor ?? null;
      if (!found.route.public && !actor) throw ApiError.unauthenticated();
      if (MUTATING.has(method) && req.headers[CSRF_HEADER] !== CSRF_HEADER_VALUE) {
        throw ApiError.unauthorized('Missing admin request header.');
      }

      const rawBody = await readBody(req, found.route.raw ? MAX_MEDIA_BYTES : MAX_JSON_BYTES);
      let body: Record<string, unknown> = {};
      if (!found.route.raw && rawBody.length) {
        body = parseJsonBody(rawBody);
      }

      const ctx: Ctx = {
        req,
        res,
        url,
        params: found.params,
        query: url.searchParams,
        actor,
        sessionToken: token,
        body,
        rawBody,
        idempotencyKey: (req.headers['idempotency-key'] as string | undefined) ?? null,
        cookie: (name, value, maxAgeSeconds) => appendCookie(res, name, value, maxAgeSeconds),
        clearCookie: (name) => appendCookie(res, name, '', 0),
      };

      const result = await found.route.handler(ctx);
      if (res.writableEnded) return;
      if (result === null || result === undefined) {
        res.writeHead(204).end();
        return;
      }
      sendJson(res, 200, result);
      void started;
    } catch (err) {
      respondError(req, res, err);
    }
  };
}

export function startServer(handler: (req: IncomingMessage, res: ServerResponse) => void, port: number) {
  const server = createServer((req, res) => {
    void handler(req, res);
  });
  // Long media uploads must not be cut off by the default socket timeout.
  server.on('connection', (socket: Socket) => socket.setTimeout(120_000));
  server.listen(port, () => {
    process.stdout.write(`Lagom admin API listening on http://localhost:${port}\n`);
  });
  return server;
}

function respondError(req: IncomingMessage, res: ServerResponse, err: unknown): void {
  if (isApiError(err)) {
    if (err.kind === 'unauthorized' || err.kind === 'unauthenticated') {
      record({ actor: null, action: 'api.denied', resourceType: 'settings', resourceId: req.url ?? '', outcome: 'denied', after: { reason: err.message } });
    }
    if (res.writableEnded) return;
    sendJson(res, err.status, {
      error: {
        kind: err.kind,
        message: err.message,
        ...(err.fields.length ? { fields: err.fields } : {}),
        ...(err.details ?? {}),
      },
    });
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  // SEC-06: the raw failure goes to the log, the client gets a generic line.
  process.stderr.write(`[api] ${req.method} ${req.url} failed: ${message}\n`);
  if (res.writableEnded) return;
  sendJson(res, 500, { error: { kind: 'server_error', message: 'The server could not complete that request.' } });
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body), 'cache-control': 'no-store' });
  res.end(body);
}

function parseJsonBody(raw: Buffer): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw.toString('utf8')) as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      // An array is legal JSON but not a valid payload object; treat it as a validation failure.
      throw new Error('not an object');
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw ApiError.validation('Request body must be a JSON object.');
  }
}

function readBody(req: IncomingMessage, max: number): Promise<Buffer> {
  return new Promise((resolvePromise, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > max) {
        reject(ApiError.validation(`Request body exceeds the ${Math.floor(max / 1024 / 1024)} MB limit.`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolvePromise(Buffer.concat(chunks)));
    req.on('error', (err) => reject(err));
  });
}

function readCookie(req: IncomingMessage): Record<string, string> {
  const header = req.headers.cookie;
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function appendCookie(res: ServerResponse, name: string, value: string, maxAgeSeconds: number): void {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  const previous = res.getHeader('set-cookie');
  const list = Array.isArray(previous) ? previous : previous ? [String(previous)] : [];
  res.setHeader('set-cookie', [...list, parts.join('; ')]);
}

const STATIC_CACHE = 'public, max-age=31536000, immutable';

function serveStatic(res: ServerResponse, root: string, pathname: string): void {
  const decoded = decodeURIComponent(pathname);
  const candidates = [join(root, decoded), join(root, decoded, 'index.html')];
  for (const candidate of candidates) {
    const safe = resolve(candidate);
    if (!safe.startsWith(resolve(root))) continue; // never serve outside the static root
    if (existsSync(safe) && statSync(safe).isFile()) {
      const ext = extname(safe).toLowerCase();
      const headers: Record<string, string> = { 'content-type': MIME[ext] ?? 'application/octet-stream' };
      if (ext !== '.html') headers['cache-control'] = STATIC_CACHE;
      res.writeHead(200, headers);
      res.end(readFileSync(safe));
      return;
    }
  }
  // SPA history fallback, so /admin/products/ and deep storefront routes resolve client-side.
  const index = join(root, 'index.html');
  if (existsSync(index)) {
    res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-cache' });
    res.end(readFileSync(index));
    return;
  }
  res.writeHead(404, { 'content-type': MIME['.txt'] });
  res.end(`404 ${normalize(pathname)}\n`);
}

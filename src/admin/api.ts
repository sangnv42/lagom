// Admin API client. Every mutating call carries the CSRF header the server requires, and errors are
// normalized to the API-01 shape so screens can show field-level problems instead of a blank state.

export type ApiFieldError = { path: string; message: string };

export class ApiFailure extends Error {
  kind: string;
  status: number;
  fields: ApiFieldError[];
  details: Record<string, unknown>;

  constructor(kind: string, message: string, status: number, fields: ApiFieldError[] = [], details: Record<string, unknown> = {}) {
    super(message);
    this.kind = kind;
    this.status = status;
    this.fields = fields;
    this.details = details;
  }
}

const CSRF_HEADER = 'X-Requested-With';
const CSRF_VALUE = 'LagomAdmin';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method, credentials: 'same-origin', headers: {} };
  const headers = init.headers as Record<string, string>;
  if (method !== 'GET') headers[CSRF_HEADER] = CSRF_VALUE;
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(path, init);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    throw new ApiFailure('server_error', 'The server returned an unreadable response.', res.status);
  }
  if (!res.ok) {
    const err = (parsed.error ?? {}) as Record<string, unknown>;
    const { error, ...rest } = parsed;
    void error;
    throw new ApiFailure(
      String(err.kind ?? 'server_error'),
      String(err.message ?? 'Request failed.'),
      res.status,
      (err.fields as ApiFieldError[]) ?? [],
      rest,
    );
  }
  return parsed as T;
}

export const api = {
  get: <T,>(path: string) => request<T>('GET', path),
  post: <T,>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T,>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  del: <T,>(path: string) => request<T>('DELETE', path),

  /** Raw-body upload: media bytes and price-list text, matched to the server's PUT/POST raw routes. */
  putRaw: async <T,>(path: string, body: BodyInit, filename: string): Promise<T> => {
    const url = `${path}${path.includes('?') ? '&' : '?'}filename=${encodeURIComponent(filename)}`;
    const res = await fetch(url, {
      method: path.includes('/imports/') ? 'POST' : 'PUT',
      credentials: 'same-origin',
      headers: { [CSRF_HEADER]: CSRF_VALUE, 'content-type': 'application/octet-stream' },
      body,
    });
    const text = await res.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      throw new ApiFailure('server_error', 'The upload returned an unreadable response.', res.status);
    }
    if (!res.ok) {
      const err = (parsed.error ?? {}) as Record<string, unknown>;
      throw new ApiFailure(String(err.kind ?? 'server_error'), String(err.message ?? 'Upload failed.'), res.status);
    }
    return parsed as T;
  },

  /** Idempotent POST: publishing and import apply, so a double click cannot publish or import twice. */
  postWithIdempotency: <T,>(path: string, key: string, body?: unknown, raw: { bytes: BodyInit; type: string } | null = null) =>
    fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        [CSRF_HEADER]: CSRF_VALUE,
        'Idempotency-Key': key,
        ...(raw ? { 'content-type': raw.type } : body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      body: raw ? raw.bytes : body !== undefined ? JSON.stringify(body) : undefined,
    })
      .then(async (res) => {
        const text = await res.text();
        let parsed: Record<string, unknown> = {};
        try {
          parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
        } catch {
          throw new ApiFailure('server_error', 'The publish request returned an unreadable response.', res.status);
        }
        if (!res.ok) {
          const err = (parsed.error ?? {}) as Record<string, unknown>;
          throw new ApiFailure(String(err.kind ?? 'server_error'), String(err.message ?? 'Publish failed.'), res.status, (err.fields as ApiFieldError[]) ?? []);
        }
        return parsed as T;
      }),
};

/**
 * Keys the server owns. Echoing them back on a save is refused outright (API-02), so editors strip
 * them after loading. This mirrors PROTECTED_FIELDS in server/permissions.ts.
 */
const PROTECTED_FIELDS = [
  'id', 'entityId', 'version', 'visibility', 'workingRevisionId', 'publishedRevisionId',
  'role', 'status', 'import',
];

export function editablePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!PROTECTED_FIELDS.includes(key)) out[key] = value;
  }
  return out;
}

export function describeFailure(err: unknown): { message: string; fields: ApiFieldError[] } {
  if (err instanceof ApiFailure) return { message: err.message, fields: err.fields };
  return { message: err instanceof Error ? err.message : 'Unexpected error.', fields: [] };
}

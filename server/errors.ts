// Typed API errors mapped to the API-01 shape by server/http.ts.

export type ErrorKind =
  | 'unauthenticated'
  | 'unauthorized'
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'rate_limited'
  | 'server_error';

export type FieldError = { path: string; message: string };

export class ApiError extends Error {
  kind: ErrorKind;
  fields: FieldError[];
  details?: Record<string, unknown>;

  constructor(kind: ErrorKind, message: string, fields: FieldError[] = [], details?: Record<string, unknown>) {
    super(message);
    this.kind = kind;
    this.fields = fields;
    this.details = details;
  }

  static unauthenticated(message = 'Sign in to continue.') {
    return new ApiError('unauthenticated', message);
  }

  static unauthorized(message: string, details?: Record<string, unknown>) {
    return new ApiError('unauthorized', message, [], details);
  }

  static notFound(message = 'Not found.') {
    // Existence itself can be the secret, so callers use 404 for out-of-scope reads (AC-37).
    return new ApiError('not_found', message);
  }

  static validation(message: string, fields: FieldError[] = []) {
    return new ApiError('validation', message, fields);
  }

  static conflict(message: string, details?: Record<string, unknown>) {
    return new ApiError('conflict', message, [], details);
  }

  static rateLimited(message: string, seconds = 60) {
    return new ApiError('rate_limited', message, [], { retryAfterSeconds: seconds });
  }

  get status(): number {
    switch (this.kind) {
      case 'unauthenticated':
        return 401;
      case 'unauthorized':
        return 403;
      case 'not_found':
        return 404;
      case 'validation':
        return 422;
      case 'conflict':
        return 409;
      case 'rate_limited':
        return 429;
      default:
        return 500;
    }
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

import { HttpErrorResponse } from '@angular/common/http';

/** A failed API call, reduced to what the UI needs. Understands RFC 9457 problem+json bodies. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly title: string,
    readonly detail: string | null = null,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(detail ?? title);
    this.name = 'ApiError';
  }

  get notFound(): boolean {
    return this.status === 404;
  }

  get offline(): boolean {
    return this.status === 0;
  }

  /** Human friendly text for error states. */
  get userMessage(): string {
    if (this.offline) return "We couldn't reach the gallery server. Check your connection and try again.";
    if (this.notFound) return this.detail ?? 'We could not find that.';
    if (this.status === 429) return 'Too many requests – please wait a moment and try again.';
    if (this.status >= 500) return 'The gallery server is having a moment. Please try again shortly.';
    return this.detail ?? this.title;
  }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { title?: unknown; detail?: unknown } | null;
    const title = typeof body?.title === 'string' ? body.title : err.statusText || 'Request failed';
    const detail = typeof body?.detail === 'string' ? body.detail : null;
    const retry = Number(err.headers?.get('Retry-After'));
    return new ApiError(err.status, title, detail, Number.isFinite(retry) && retry > 0 ? retry : null);
  }
  return new ApiError(-1, err instanceof Error ? err.message : 'Unexpected error');
}

/** Network failures, gateway errors and rate limiting are worth another try; client errors are not. */
export function isRetriable(err: unknown): boolean {
  if (!(err instanceof HttpErrorResponse)) return false;
  return err.status === 0 || err.status === 429 || err.status === 502 || err.status === 503 || err.status === 504;
}

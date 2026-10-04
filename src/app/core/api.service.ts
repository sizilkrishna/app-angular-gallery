import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, retry, shareReplay, throwError, timer, catchError } from 'rxjs';
import { toApiError, isRetriable } from './api-error';
import { APP_CONFIG } from './config';
import { Artwork, Collection, DIMENSION_META, DIMENSIONS, Dimension, Filters, Paged, Pagination } from './models';
import { lowerKeys, startYear, toInt, toText } from './util';

type Row = Record<string, unknown>;
interface PageBody { records?: Row[]; pagination?: Partial<Record<keyof Pagination, unknown>> }
interface ItemBody { record?: Row }

const MAX_RETRIES = 2;

/**
 * Typed client for the Symfony art catalogue API (docs/openapi.yaml in api-symfony-php).
 *
 * - GET requests send no custom headers, so browsers never need a CORS preflight.
 * - Network errors, 429 and 502/503/504 are retried twice with backoff (honouring Retry-After).
 * - Taxonomy lookups are cached for the lifetime of the app instance.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(APP_CONFIG).apiUrl.replace(/\/+$/, '');
  private readonly cache = new Map<string, Observable<unknown>>();

  // ---- artworks -----------------------------------------------------------------------------

  artwork(id: number): Observable<Artwork> {
    return this.get<ItemBody>(`/art/all/${id}`).pipe(map((b) => toArtwork(b.record ?? {})));
  }

  artworksBy(dimension: Dimension, id: number, page = 1, limit = 24): Observable<Paged<Artwork>> {
    return this.get<PageBody>(`/art/${dimension}/${id}`, { page, limit }).pipe(map((b) => toPaged(b, toArtwork)));
  }

  /** Full-text search. Supports "quoted phrases", `or` and `-exclusion`. Filters narrow the match. */
  search(q: string, filters: Filters = {}, page = 1, limit = 24): Observable<Paged<Artwork>> {
    return this.get<PageBody>('/search', { q, page, limit, ...filterParams(filters) }).pipe(
      map((b) => toPaged(b, toArtwork)),
    );
  }

  /** Taxonomy filters only (at least one required by the API). */
  filter(filters: Filters, page = 1, limit = 24): Observable<Paged<Artwork>> {
    return this.get<PageBody>('/filter', { page, limit, ...filterParams(filters) }).pipe(
      map((b) => toPaged(b, toArtwork)),
    );
  }

  /** Not cached by the API (Cache-Control: no-store), so each call can return something new. */
  random(limit = 1): Observable<Artwork[]> {
    return this.get<PageBody>('/random', { limit }).pipe(map((b) => (b.records ?? []).map(toArtwork)));
  }

  // ---- taxonomies ---------------------------------------------------------------------------

  collections(dimension: Dimension, opts: { page?: number; limit?: number; letter?: string } = {}): Observable<Paged<Collection>> {
    const { page = 1, limit = 48, letter } = opts;
    const path = dimension === 'author' && letter ? `/info/author/${encodeURIComponent(letter)}` : `/info/${dimension}`;
    return this.cached(`list:${path}:${page}:${limit}`, () =>
      this.get<PageBody>(path, { page, limit }).pipe(
        map((b) => {
          const paged = toPaged(b, (row) => toCollection(dimension, row));
          // The API orders alphabetically; periods read better chronologically.
          if (dimension === 'timeframe') paged.items.sort((a, c) => startYear(a.name) - startYear(c.name));
          return paged;
        }),
      ),
    );
  }

  collection(dimension: Dimension, id: number): Observable<Collection> {
    return this.cached(`item:${dimension}:${id}`, () =>
      this.get<ItemBody>(`/info/${dimension}/${id}`).pipe(map((b) => toCollection(dimension, b.record ?? {}))),
    );
  }

  // ---- telemetry ----------------------------------------------------------------------------

  /** POST /api/logger. `category` must match [A-Za-z0-9_.:-]{1,50}; `value` is 1–1000 characters. */
  log(category: string, value: string): Observable<void> {
    return this.http
      .post(`${this.base}/logger`, { category, value: value.slice(0, 1000) })
      .pipe(map(() => undefined), catchError((e) => throwError(() => toApiError(e))));
  }

  // ---- plumbing -----------------------------------------------------------------------------

  private get<T>(path: string, params: Record<string, string | number | undefined> = {}): Observable<T> {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') httpParams = httpParams.set(key, String(value));
    }
    return this.http.get<T>(`${this.base}${path}`, { params: httpParams }).pipe(
      retry({
        count: MAX_RETRIES,
        delay: (error, attempt) => {
          if (!isRetriable(error)) return throwError(() => error);
          const retryAfter = toApiError(error).retryAfterSeconds;
          return timer(Math.min(retryAfter ? retryAfter * 1000 : attempt * 400, 5000));
        },
      }),
      catchError((e) => throwError(() => toApiError(e))),
    );
  }

  private cached<T>(key: string, factory: () => Observable<T>): Observable<T> {
    let hit = this.cache.get(key) as Observable<T> | undefined;
    if (!hit) {
      hit = factory().pipe(
        // Failures must not stick: drop the entry so a retry hits the network again.
        catchError((e) => {
          this.cache.delete(key);
          return throwError(() => e);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.cache.set(key, hit);
    }
    return hit;
  }
}

// ---- mappers (exported for tests) ---------------------------------------------------------------

export function filterParams(filters: Filters): Record<string, number> {
  const out: Record<string, number> = {};
  for (const dim of DIMENSIONS) {
    const id = filters[dim];
    if (id && id > 0) out[DIMENSION_META[dim].param] = id;
  }
  return out;
}

export function toPaged<T>(body: PageBody, map: (row: Row) => T): Paged<T> {
  const records = Array.isArray(body.records) ? body.records : [];
  const p = body.pagination ?? {};
  const limit = Math.max(1, toInt(p.limit, records.length || 1));
  const total = toInt(p.total, records.length);
  return {
    items: records.map((r) => map(r)),
    pagination: { total, page: Math.max(1, toInt(p.page, 1)), limit, pages: toInt(p.pages, Math.ceil(total / limit)) },
  };
}

export function toArtwork(raw: Row): Artwork {
  const r = lowerKeys(raw);
  return {
    id: toInt(r['id']),
    title: toText(r['title']),
    date: toText(r['date']),
    technique: toText(r['technique']),
    url: toText(r['url']),
    authorId: toInt(r['author_id']),
    author: toText(r['author']),
    bornDied: toText(r['born_died']),
    formId: toInt(r['form_id']),
    form: toText(r['form']),
    locationId: toInt(r['location_id']),
    location: toText(r['location']),
    schoolId: toInt(r['school_id']),
    school: toText(r['school']),
    timeframeId: toInt(r['timeframe_id']),
    timeframe: toText(r['timeframe']),
    typeId: toInt(r['type_id']),
    type: toText(r['type']),
  };
}

export function toCollection(dimension: Dimension, raw: Row): Collection {
  const r = lowerKeys(raw);
  const isAuthor = dimension === 'author';
  return {
    dimension,
    id: toInt(r['id']),
    name: toText(r[dimension]),
    count: toInt(r['count']),
    image: !isAuthor && r['fimage'] ? toText(r['fimage']) : null,
    subtitle: isAuthor && r['born_died'] ? toText(r['born_died']) : null,
    school: isAuthor && r['school'] ? toText(r['school']) : null,
    schoolId: isAuthor && r['school_id'] ? toInt(r['school_id']) : null,
  };
}

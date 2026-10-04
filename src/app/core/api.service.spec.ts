import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api-error';
import { ApiService, filterParams, toArtwork, toCollection, toPaged } from './api.service';
import { APP_CONFIG } from './config';
import { environment } from '../../environments/environment';

const BASE = 'http://api.test/api';

describe('ApiService', () => {
  let api: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: APP_CONFIG, useValue: { ...environment, apiUrl: BASE + '/' } }],
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('maps an artwork record (lowercase keys, numeric strings coerced)', () => {
    let result: ReturnType<typeof toArtwork> | undefined;
    api.artwork(7).subscribe((a) => (result = a));
    const req = http.expectOne(`${BASE}/art/all/7`);
    expect(req.request.headers.keys()).toEqual([]); // no custom headers => no CORS preflight
    req.flush({ success: true, record: { id: '7', title: 'Night Watch', author_id: '3', author: 'Rembrandt', born_died: '1606-1669', url: 'a/b.jpg', timeframe_id: 2 } });
    expect(result).toMatchObject({ id: 7, title: 'Night Watch', authorId: 3, author: 'Rembrandt', bornDied: '1606-1669', timeframeId: 2, form: '' });
  });

  it('sends page, limit and taxonomy filters with their short names', () => {
    api.search('portrait', { form: 2, timeframe: 5 }, 3, 24).subscribe();
    const req = http.expectOne((r) => r.url === `${BASE}/search`);
    expect(req.request.params.get('q')).toBe('portrait');
    expect(req.request.params.get('fo')).toBe('2');
    expect(req.request.params.get('ti')).toBe('5');
    expect(req.request.params.get('page')).toBe('3');
    expect(req.request.params.has('au')).toBe(false);
    req.flush({ success: true, records: [], pagination: { total: 0, page: 3, limit: 24, pages: 0 } });
  });

  it('uses the letter endpoint for authors and orders periods chronologically', () => {
    let names: string[] = [];
    api.collections('timeframe', { limit: 100 }).subscribe((p) => (names = p.items.map((i) => i.name)));
    http.expectOne((r) => r.url === `${BASE}/info/timeframe`).flush({
      records: [{ id: 3, timeframe: '1601-1650', count: 1 }, { id: 1, timeframe: '1051-1100', count: 1 }, { id: 2, timeframe: '1501-1550', count: 1 }],
      pagination: { total: 3, page: 1, limit: 100, pages: 1 },
    });
    expect(names).toEqual(['1051-1100', '1501-1550', '1601-1650']);

    api.collections('author', { letter: 'R' }).subscribe();
    http.expectOne((r) => r.url === `${BASE}/info/author/R`).flush({ records: [], pagination: {} });
  });

  it('caches taxonomy lookups but not failures', () => {
    api.collection('form', 1).subscribe();
    api.collection('form', 1).subscribe();
    http.expectOne(`${BASE}/info/form/1`).flush({ record: { id: 1, form: 'painting', count: 4, fimage: 'x.jpg' } });

    api.collection('form', 9).subscribe({ error: () => undefined });
    http.expectOne(`${BASE}/info/form/9`).flush({ title: 'Not Found', detail: 'Form not found.' }, { status: 404, statusText: 'Not Found' });
    api.collection('form', 9).subscribe({ error: () => undefined });
    http.expectOne(`${BASE}/info/form/9`).flush('x', { status: 404, statusText: 'Not Found' }); // second call hit the network again
  });

  it('turns RFC 9457 problem bodies into ApiError and does not retry client errors', () => {
    let error: unknown;
    api.artwork(99).subscribe({ error: (e) => (error = e) });
    http.expectOne(`${BASE}/art/all/99`).flush({ title: 'Not Found', status: 404, detail: 'Artwork not found.' }, { status: 404, statusText: 'Not Found' });
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, notFound: true, detail: 'Artwork not found.' });
  });

  it('retries 503 twice, then gives up', () => {
    vi.useFakeTimers();
    let error: unknown;
    api.random(1).subscribe({ error: (e) => (error = e) });
    for (let i = 0; i < 3; i++) {
      http.expectOne((r) => r.url === `${BASE}/random`).flush('', { status: 503, statusText: 'Unavailable' });
      vi.advanceTimersByTime(6000);
    }
    expect(error).toMatchObject({ status: 503 });
  });

  it('posts log entries as JSON, truncated to the API limit', () => {
    api.log('message', 'x'.repeat(1500)).subscribe();
    const req = http.expectOne(`${BASE}/logger`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.category).toBe('message');
    expect(req.request.body.value).toHaveLength(1000);
    req.flush({ success: true }, { status: 201, statusText: 'Created' });
  });
});

describe('mappers', () => {
  it('accepts upper-case keys (API_KEY_CASE=upper)', () => {
    expect(toArtwork({ ID: 4, TITLE: 'X', AUTHOR_ID: 2 })).toMatchObject({ id: 4, title: 'X', authorId: 2 });
  });
  it('maps authors and generic taxonomies into one Collection shape', () => {
    expect(toCollection('author', { id: 1, author: 'Monet', born_died: '1840-1926', school_id: 2, school: 'French', count: '12' })).toEqual({
      dimension: 'author', id: 1, name: 'Monet', count: 12, image: null, subtitle: '1840-1926', school: 'French', schoolId: 2,
    });
    expect(toCollection('form', { id: 2, form: 'painting', fimage: 'a/b.jpg', count: 3 })).toMatchObject({ name: 'painting', image: 'a/b.jpg', subtitle: null, school: null });
  });
  it('survives a missing or partial pagination block', () => {
    expect(toPaged({ records: [{}, {}] }, (r) => r).pagination).toEqual({ total: 2, page: 1, limit: 2, pages: 1 });
  });
  it('drops empty filters', () => {
    expect(filterParams({ author: 4, form: 0, type: undefined })).toEqual({ au: 4 });
  });
});

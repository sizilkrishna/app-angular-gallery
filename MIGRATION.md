# Migration notes

## Why Angular again (and not a different framework)
- **Angular is not the unstable part – version 8 is.** Angular 8 (2019), TypeScript 3.5, RxJS 6.4, Karma/Protractor/TSLint are all end-of-life. Current Angular (22) has a predictable release cadence, automated `ng update` migrations and long-term support windows.
- Google builds on Angular *and* on an internal framework (Wiz); I could not find a reliable public source for what Google Arts & Culture itself runs, so I did not base the decision on it. GitHub's own pages are server-rendered Rails with Turbo and React.
- Your domain model, routes and RxJS knowledge carry straight over; a rewrite in React/Next.js or SvelteKit would be a larger, riskier change for no functional gain. If you later prefer React, `core/` (API client, models, mappers) and `tools/mock-api.mjs` port directly.

## What was wrong with the old app
| Finding | Now |
|---|---|
| Angular 8 / TS 3.5 / RxJS 6 / Protractor / TSLint | Angular 22, TS 6, RxJS 7, Vitest |
| 7 overlapping image & masonry libraries (masonry-layout, ngx-masonry, @thisissoon/angular-masonry, ng-lazyload-image, ngx-progressive-image-loader, iv-viewer, ng2-image-viewer), HammerJS, deprecated `@angular/flex-layout`, Angular Material | Zero UI dependencies: CSS columns, native `loading=lazy`, ~150-line custom zoom/pan/pinch viewer |
| `/admin` page "protected" by an MD5 check in the client bundle (salt visible to anyone) | Removed. The API already protects `/api/logs` with `X-API-Key`; never ship that key to a browser. Read logs server-side |
| Every unhandled error redirected the user to `/error` and POSTed stack traces | Errors show inline with a *Try again* button; at most 5 de-duplicated reports per session |
| Retried **every** failure 5× (including 404/400) | Retries only network errors, 429, 502–504 (twice, honouring `Retry-After`) – the API now rate-limits at 120 req/min |
| Called `/detailinfo/*` and expected UPPERCASE keys, string pagination (`totalpages`) | Uses the current contract: `/info/*`, lowercase keys, `{total,page,limit,pages}`, RFC 9457 errors. Mappers also accept `API_KEY_CASE=upper` |
| Client-side rendered only (no SEO / link previews), no `404` status | SSR: real content for crawlers, per-artwork title/description/Open Graph/JSON-LD (`VisualArtwork`), canonical URLs, true 404s |
| Dead code: `paste` page, `help` ("You don't need help"), Firebase rules, unused `nehal` page | Removed (re-add `nehal` if it is wanted) |
| Privacy text was a generic template mentioning cookies/tracking | Rewritten to describe what the app really does – **please have it reviewed** |

## New in this version
Home hero + "surprise me", chronological *Journey through time*, A–Z artist index, collection pages, deep-zoom viewer (wheel, pinch, double-click, keyboard, fullscreen), live search with filters and `"phrase"` / `or` / `-exclude` syntax, related works by artist and by period+form, **My gallery** (favourites kept on-device), dark/light theme, skip link + focus management + reduced-motion support, shareable URLs for every state (`?page=`, `?q=`, filters), PWA manifest.

## Honest scope check: "better than Google Arts & Culture"
This is a solid, fast, accessible browsing experience for this catalogue, and in several areas (open URLs, keyboard use, speed) it is comparable. It is **not** better overall, and cannot be with the current data: Arts & Culture's draw is curated stories, partner-supplied gigapixel images, Street View tours and AR. What would close the gap, in order of value:
1. **Images:** hotlinking full-size originals from wga.hu is the biggest weakness (slow grids, dependence on their servers, and you should confirm their terms permit it). Put a resizing proxy/CDN in front (`imageProxy` is already wired, including `srcset`), or mirror images you are licensed to host.
2. **Explore by colour** (their signature feature): extract a dominant-colour palette per artwork in the API and filter on it.
3. **Curated stories/tours:** needs content, but a simple "story" = ordered list of artwork ids + text is easy to add.

## API recommendations (api-symfony-php)
1. `/api/info/author` omits the `fimage` that the `author` table already has – returning it would give artist cards portraits.
2. Add `width`, `height` (and a dominant colour) to artworks: removes layout shift in the grid and enables colour search.
3. Add a numeric `year_from`/`year_to` and `sort` parameter (chronological order, "A–Z").
4. A dedicated `POST /api/contact` instead of storing messages in `log_table` (the contact form currently uses the logger, 1000-char limit).
5. **Security:** `.env` is committed and contains an `APP_SECRET` and a database password. Rotate both and keep real values out of git. The README is also stale (`DATABASE_DSN` vs the code's `DATABASE_URL`, no mention of `LOGS_API_KEY`, rate limits or CORS).
6. Set `CORS_ALLOW_ORIGIN` to your production origin – the default only allows localhost.

## What I verified – and what I could not
- ✅ Production + development builds, 21 unit tests (API mapping, retry/no-retry, caching, image URLs, favourites, pager).
- ✅ Every route server-rendered against a mock built from the API's OpenAPI file and controllers: correct content, SEO tags, 404 statuses, legacy redirects.
- ⚠️ **Not tested against your real API** (no PHP/PostgreSQL in my sandbox) – run `npm start` against your stack and check a few pages. In particular confirm what `art.url` looks like (the code accepts relative paths resolved against `imageBaseUrl` *and* absolute URLs).
- ⚠️ **Not tested in a real browser** (none available): the zoom viewer's pointer/pinch handling and the visual design are untested visually. Expect to tweak spacing/typography.
- The service worker from the old PWA setup is not included; add `ng add @angular/pwa` if offline support matters.

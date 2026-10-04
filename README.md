# Mercurial Gallery of Art – Angular 22

Front end for the [art catalogue API](https://github.com/sizilkrishna/api-symfony-php) (Symfony 7 + PostgreSQL).
Migrated from the original Angular 8 app. Server-side rendered, signals-based, zoneless, ~95 kB gzipped on first load.

## Requirements
- **Node.js ≥ 22.22.3 or ≥ 24.15** (Angular 22 requirement)
- A running API: either your Symfony stack (`docker compose up` in `api-symfony-php`, listens on `:8080`) **or** the bundled mock.

## Run it
```bash
npm install
npm run mock-api     # optional: fake API on :8080 with 240 generated artworks (no PHP/Postgres needed)
npm start            # http://localhost:4200
npm test             # unit tests (Vitest)
npm run build        # production build -> dist/mgo-gallery (browser + SSR server)
npm run start:ssr    # run the built SSR server on :4000
```

## Configure (before deploying)
| What | Where |
|---|---|
| API base URL | `src/environments/environment.production.ts` → `apiUrl` (**placeholder – you must change it**) |
| Public site URL (canonical / Open Graph) | same file → `siteUrl` |
| Image source / resizing proxy | `imageBaseUrl`, `imageProxy` |
| Allowed hostnames for SSR | env var `ALLOWED_HOSTS=your.domain,www.your.domain` (Angular rejects other `Host` headers) |
| Browser access to the API | API env `CORS_ALLOW_ORIGIN` must match your site origin (regex), e.g. `^https://your\.domain$` |

Deploy with the included `Dockerfile` (Cloud Run, Fly.io, Railway, …). Firebase Hosting can front a Cloud Run service; plain static hosting no longer works because pages are server-rendered.

## Routes
`/` · `/explore/:dimension` · `/collection/:dimension/:id` · `/art/:id` · `/search?q=&fo=&sc=&ti=&ty=&au=&lo=` · `/favorites` · `/about` · `/contact` · `/privacy`
`dimension` = `author | timeframe | form | type | school | location`. All old URLs (`/arts/author/3`, `/arts/showcase/7`, `/gallery/authors`, `/filter`, `/info/legal` …) redirect to the new ones.

## Structure
```
src/app/core/     API client, models, image/SEO/theme/favourites services, error handler
src/app/shared/   art-card, collection-card, art-image, zoom-viewer, pager, states, icons
src/app/pages/    home, explore, collection, artwork, search, favorites, info, not-found
tools/mock-api.mjs   API stand-in that follows docs/openapi.yaml
```
See **MIGRATION.md** for what changed, why, and what to do next.

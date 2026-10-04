import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

/**
 * Hostnames this server may render for (Angular's protection against Host-header / SSRF attacks).
 * Set ALLOWED_HOSTS to a comma separated list in production, e.g. "mgoart.web.app,www.example.com".
 */
const allowedHosts = (process.env['ALLOWED_HOSTS'] ?? 'localhost,127.0.0.1')
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean);

const app = express();
const angularApp = new AngularNodeAppEngine({ allowedHosts });

app.disable('x-powered-by');

/** Basic hardening headers on every response. */
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

/** Liveness probe for load balancers / Cloud Run. */
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

/** Hashed build assets are immutable; everything else (icons, manifest) revalidates daily. */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1d',
    index: false,
    redirect: false,
    setHeaders: (res, path) => {
      if (/-[A-Z0-9]{8}\.(js|css)$/i.test(path)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  }),
);

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => {
      if (!response) return next();
      // Catalogue pages change rarely: let CDNs / browsers reuse them briefly.
      if (response.status === 200 && !response.headers.has('cache-control')) {
        response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
      }
      return writeResponseToNodeResponse(response, res);
    })
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) throw error;
    console.log(`MGO Gallery SSR listening on http://localhost:${port}`);
  });
}

/** Request handler used by the Angular CLI (dev server / build) or serverless platforms. */
export const reqHandler = createNodeRequestHandler(app);

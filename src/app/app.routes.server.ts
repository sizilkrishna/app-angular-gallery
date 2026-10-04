import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Static pages are prerendered at build time. Everything that depends on catalogue data is rendered
 * on the server per request so that crawlers and link previews see real content.
 */
export const serverRoutes: ServerRoute[] = [
  { path: 'about', renderMode: RenderMode.Prerender },
  { path: 'contact', renderMode: RenderMode.Prerender },
  { path: 'privacy', renderMode: RenderMode.Prerender },
  { path: 'favorites', renderMode: RenderMode.Client }, // personal (localStorage) – nothing useful to render on the server
  { path: '**', renderMode: RenderMode.Server },
];

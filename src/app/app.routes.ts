import { Routes } from '@angular/router';

/**
 * URL map. The first block keeps every link from the old Angular 8 app working (301-style redirects),
 * so shared links and search-engine results from mgoart.web.app don't break.
 */
export const routes: Routes = [
  { path: '', title: 'Discover', loadComponent: () => import('./pages/home').then((m) => m.Home), pathMatch: 'full' },

  { path: 'explore/:dimension', loadComponent: () => import('./pages/explore').then((m) => m.Explore) },
  { path: 'collection/:dimension/:id', loadComponent: () => import('./pages/collection').then((m) => m.CollectionPage) },
  { path: 'art/:id', loadComponent: () => import('./pages/artwork').then((m) => m.ArtworkPage) },
  { path: 'search', loadComponent: () => import('./pages/search').then((m) => m.SearchPage) },
  { path: 'favorites', title: 'My gallery', loadComponent: () => import('./pages/favorites').then((m) => m.FavoritesPage) },
  { path: 'about', title: 'About & credits', loadComponent: () => import('./pages/info').then((m) => m.About) },
  { path: 'contact', title: 'Contact', loadComponent: () => import('./pages/info').then((m) => m.Contact) },
  { path: 'privacy', title: 'Privacy', loadComponent: () => import('./pages/info').then((m) => m.Privacy) },

  // ---- legacy URLs from the Angular 8 app ----
  { path: 'home', redirectTo: '/', pathMatch: 'full' },
  { path: 'gallery', redirectTo: '/explore/author', pathMatch: 'full' },
  { path: 'gallery/authors', redirectTo: '/explore/author' },
  { path: 'gallery/forms', redirectTo: '/explore/form' },
  { path: 'gallery/locations', redirectTo: '/explore/location' },
  { path: 'gallery/schools', redirectTo: '/explore/school' },
  { path: 'gallery/timeframes', redirectTo: '/explore/timeframe' },
  { path: 'gallery/types', redirectTo: '/explore/type' },
  { path: 'arts/showcase/:id', redirectTo: ({ params }) => `/art/${encodeURIComponent(params['id'] ?? '')}` },
  { path: 'arts/:dimension/:id', redirectTo: ({ params }) => `/collection/${encodeURIComponent(params['dimension'] ?? '')}/${encodeURIComponent(params['id'] ?? '')}` },
  { path: 'filter', redirectTo: '/search' },
  { path: 'info/about', redirectTo: '/about' },
  { path: 'info/contact', redirectTo: '/contact' },
  { path: 'info/legal', redirectTo: '/privacy' },

  { path: '**', title: 'Page not found', loadComponent: () => import('./pages/not-found').then((m) => m.NotFound) },
];

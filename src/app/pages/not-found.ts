import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../core/seo.service';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container nf">
      <p class="kicker">404</p>
      <h1>This page is not on the wall.</h1>
      <p class="lead">The link may be old or mistyped. Try searching, or let us pick something for you.</p>
      <p><a class="btn" routerLink="/">Back to the gallery</a> <a class="btn ghost" routerLink="/search">Search</a></p>
    </div>`,
  styles: `.nf { text-align: center; padding-block: 5rem; } h1 { font: 600 2rem var(--font-serif); margin: .25rem 0 .75rem; }`,
})
export class NotFound {
  constructor() {
    const seo = inject(SeoService);
    seo.set({ title: 'Page not found', noindex: true });
    seo.setStatus(404);
  }
}

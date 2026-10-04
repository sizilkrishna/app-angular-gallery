import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoritesService } from '../core/favorites.service';
import { SeoService } from '../core/seo.service';
import { ArtCard } from '../shared/art-card';
import { EmptyState } from '../shared/states';

@Component({
  selector: 'app-favorites',
  imports: [ArtCard, EmptyState, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container">
      <header class="page-head">
        <p class="kicker">Saved on this device</p>
        <h1>My gallery</h1>
        @if (fav.count() > 0) {
          <p class="lead">{{ fav.count() }} {{ fav.count() === 1 ? 'artwork' : 'artworks' }}
            · <button type="button" class="link" (click)="clear()">Clear all</button></p>
        }
      </header>

      @if (!fav.ready()) {
        <p class="lead" role="status">Loading your gallery…</p>
      } @else if (fav.count() === 0) {
        <app-empty-state title="Your gallery is empty">
          Tap the heart on any artwork to collect it here. <a routerLink="/">Find something you love</a>.
        </app-empty-state>
      } @else {
        <div class="masonry">@for (a of fav.list(); track a.id) { <app-art-card [art]="a" /> }</div>
      }
    </div>`,
  styles: `h1 { font: 600 2rem var(--font-serif); margin: 0; } .link { background: none; border: 0; color: var(--accent); cursor: pointer; font: inherit; padding: 0; }`,
})
export class FavoritesPage {
  protected readonly fav = inject(FavoritesService);
  private readonly seo = inject(SeoService);
  constructor() { effect(() => this.seo.set({ title: 'My gallery', path: '/favorites', noindex: true })); }
  protected clear(): void {
    if (confirm('Remove all saved artworks from this device?')) this.fav.clear();
  }
}

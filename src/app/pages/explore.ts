import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { DIMENSION_META, Dimension, isDimension } from '../core/models';
import { SeoService } from '../core/seo.service';
import { toPage } from '../core/util';
import { CollectionCard } from '../shared/collection-card';
import { Pager } from '../shared/pager';
import { EmptyState, ErrorState, SkeletonGrid } from '../shared/states';
import { NotFound } from './not-found';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

@Component({
  selector: 'app-explore',
  imports: [RouterLink, CollectionCard, Pager, ErrorState, EmptyState, SkeletonGrid, NotFound, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (dim(); as d) {
      <div class="container">
        <header class="page-head">
          <p class="kicker">Browse</p>
          <h1>{{ meta()!.plural }}</h1>
          <p class="lead">{{ meta()!.blurb }}</p>
        </header>

        @if (d === 'author') {
          <nav class="az" aria-label="Filter artists by first letter">
            <a [routerLink]="[]" [queryParams]="{ letter: null, page: null }" [class.on]="!letterValue()">All</a>
            @for (l of alphabet; track l) {
              <a [routerLink]="[]" [queryParams]="{ letter: l, page: null }" [class.on]="letterValue() === l">{{ l }}</a>
            }
          </nav>
        }

        @if (data.error()) {
          <app-error-state [error]="data.error()" (retry)="data.reload()" />
        } @else if (data.value(); as page) {
          @if (page.items.length === 0) {
            <app-empty-state title="No matches">Try another letter.</app-empty-state>
          } @else {
            <p class="count" aria-live="polite">{{ page.pagination.total | number }} {{ meta()!.plural.toLowerCase() }}</p>
            <div class="cards" [class.authors]="d === 'author'">
              @for (c of page.items; track c.id) { <app-collection-card [c]="c" /> }
            </div>
            <app-pager [page]="page.pagination.page" [pages]="page.pagination.pages" />
          }
        } @else {
          <app-skeleton-grid [count]="12" />
        }
      </div>
    } @else {
      <app-not-found />
    }`,
  styles: `
    .az { display: flex; flex-wrap: wrap; gap: .3rem; margin-bottom: 1.25rem; }
    .az a { min-width: 2.2rem; height: 2.2rem; padding: 0 .55rem; display: inline-grid; place-items: center; border-radius: .5rem; color: var(--ink); text-decoration: none; background: var(--surface-2); font-size: .9rem; }
    .az a.on, .az a:hover { background: var(--ink); color: var(--bg); }
    .count { color: var(--muted); margin: 0 0 1rem; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); gap: 1rem; } .cards.authors { grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr)); }`,
})
export class Explore {
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);

  readonly dimension = input<string>();
  readonly page = input<string>();
  readonly letter = input<string>();

  protected readonly alphabet = ALPHABET;
  protected readonly dim = computed<Dimension | null>(() => (isDimension(this.dimension()) ? (this.dimension() as Dimension) : null));
  protected readonly meta = computed(() => (this.dim() ? DIMENSION_META[this.dim()!] : null));
  protected readonly letterValue = computed(() => {
    const l = (this.letter() ?? '').toUpperCase();
    return /^[A-Z]$/.test(l) ? l : '';
  });

  protected readonly data = rxResource({
    params: () => (this.dim() ? { dim: this.dim()!, page: toPage(this.page()), letter: this.letterValue() } : undefined),
    stream: ({ params }) =>
      this.api.collections(params.dim, {
        page: params.page,
        letter: params.letter || undefined,
        limit: params.dim === 'timeframe' ? 100 : params.dim === 'author' ? 60 : 48,
      }),
  });

  constructor() {
    effect(() => {
      const m = this.meta();
      if (m) this.seo.set({ title: `Browse ${m.plural.toLowerCase()}`, description: m.blurb, path: `/explore/${m.key}`, noindex: !!this.letterValue() || toPage(this.page()) > 1 });
    });
  }
}

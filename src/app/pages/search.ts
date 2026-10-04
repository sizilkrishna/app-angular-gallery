import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, linkedSignal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs';
import { ApiService } from '../core/api.service';
import { Collection, DIMENSIONS, DIMENSION_META, Dimension, Filters } from '../core/models';
import { SeoService } from '../core/seo.service';
import { valueOf } from '../core/resource';
import { titleCase, toInt, toPage } from '../core/util';
import { ArtCard } from '../shared/art-card';
import { Icon } from '../shared/icon';
import { Pager } from '../shared/pager';
import { EmptyState, ErrorState, SkeletonGrid } from '../shared/states';

const FACETS: Dimension[] = ['form', 'type', 'school', 'timeframe'];

@Component({
  selector: 'app-search-page',
  imports: [RouterLink, ArtCard, Icon, Pager, ErrorState, EmptyState, SkeletonGrid, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container">
      <header class="page-head">
        <h1>Search</h1>
        <div class="box">
          <app-icon name="search" />
          <input type="search" [value]="draft()" (input)="draft.set($any($event.target).value)" maxlength="200" autocomplete="off"
                 placeholder="Try  portrait,  &quot;last judgment&quot;,  rembrandt or landscape -winter" aria-label="Search" />
        </div>
        <p class="tips">Tips: use <code>"quotes"</code> for exact phrases, <code>or</code> to combine, and <code>-word</code> to exclude.</p>
      </header>

      <section class="facets" aria-label="Filters">
        @for (f of facets; track f.dim) {
          <label>
            <span>{{ f.label }}</span>
            <select (change)="setFilter(f.dim, $any($event.target).value)">
              <option value="">Any</option>
              @for (c of items(f.res); track c.id) {
                <option [value]="c.id" [selected]="filters()[f.dim] === c.id">{{ titleCase(c.name) }}</option>
              }
            </select>
          </label>
        }
        @if (filters().author) {
          <a class="chip" [routerLink]="[]" [queryParams]="{ au: null, page: null }" queryParamsHandling="merge" aria-label="Remove artist filter">
            Artist: {{ name(authorInfo) ?? '#' + filters().author }} ✕
          </a>
        }
        @if (filters().location) {
          <a class="chip" [routerLink]="[]" [queryParams]="{ lo: null, page: null }" queryParamsHandling="merge" aria-label="Remove place filter">
            Place: {{ name(placeInfo, true) ?? '#' + filters().location }} ✕
          </a>
        }
      </section>

      @if (!params()) {
        <section class="start">
          <p class="lead">Start typing, or try one of these:</p>
          <p>@for (s of suggestions; track s) { <a class="chip" [routerLink]="[]" [queryParams]="{ q: s }">{{ s }}</a> }</p>
        </section>
      } @else if (results.error()) {
        <app-error-state [error]="results.error()" (retry)="results.reload()" />
      } @else if (results.value(); as page) {
        @if (page.items.length === 0) {
          <app-empty-state title="No results">Nothing matched. Try fewer words, or remove a filter.</app-empty-state>
        } @else {
          <p class="count" aria-live="polite">{{ page.pagination.total | number }} {{ page.pagination.total === 1 ? 'result' : 'results' }}@if (params()!.q) { for “{{ params()!.q }}” }</p>
          <div class="masonry">@for (a of page.items; track a.id) { <app-art-card [art]="a" /> }</div>
          <app-pager [page]="page.pagination.page" [pages]="page.pagination.pages" />
        }
      } @else {
        <app-skeleton-grid [count]="12" />
      }
    </div>`,
  styles: `
    h1 { font: 600 2rem var(--font-serif); margin: 0 0 1rem; }
    .box { display: flex; align-items: center; gap: .75rem; max-width: 42rem; padding: 0 1.1rem; height: 3.2rem; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--muted); }
    .box:focus-within { border-color: var(--accent); } .box input { flex: 1; border: 0; outline: 0; background: transparent; color: var(--ink); font: inherit; font-size: 1.05rem; min-width: 0; }
    .tips { color: var(--muted); font-size: .85rem; margin: .6rem 0 0; } code { background: var(--surface-2); padding: .05rem .3rem; border-radius: .25rem; }
    .facets { display: flex; flex-wrap: wrap; align-items: end; gap: .75rem 1rem; margin-bottom: 1.5rem; }
    label { display: grid; gap: .2rem; font-size: .8rem; color: var(--muted); }
    select { height: 2.4rem; min-width: 9rem; max-width: 14rem; padding: 0 .6rem; border-radius: .6rem; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font: inherit; }
    .count { color: var(--muted); }`,
})
export class SearchPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  readonly q = input<string>();
  readonly page = input<string>();
  readonly au = input<string>();
  readonly fo = input<string>();
  readonly lo = input<string>();
  readonly sc = input<string>();
  readonly ti = input<string>();
  readonly ty = input<string>();

  protected readonly titleCase = titleCase;
  protected readonly suggestions = ['portrait', 'self-portrait', 'landscape', 'madonna', 'still life', '"last judgment"', 'rembrandt', 'cathedral'];
  protected readonly draft = linkedSignal(() => this.q() ?? '');

  protected readonly filters = computed<Filters>(() => {
    const raw = { author: this.au(), form: this.fo(), location: this.lo(), school: this.sc(), timeframe: this.ti(), type: this.ty() };
    const out: Filters = {};
    for (const d of DIMENSIONS) if (toInt(raw[d]) > 0) out[d] = toInt(raw[d]);
    return out;
  });

  /** `undefined` while there is nothing to search for (no text and no filter). */
  protected readonly params = computed(() => {
    const q = (this.q() ?? '').trim().slice(0, 200);
    const filters = this.filters();
    return q || Object.keys(filters).length ? { q, filters, page: toPage(this.page()) } : undefined;
  });

  protected readonly results = rxResource({
    params: () => this.params(),
    stream: ({ params: p }) => (p.q ? this.api.search(p.q, p.filters, p.page, 24) : this.api.filter(p.filters, p.page, 24)),
  });

  protected readonly facets = FACETS.map((dim) => ({
    dim,
    label: DIMENSION_META[dim].singular,
    res: rxResource({ stream: () => this.api.collections(dim, { limit: 100 }) }),
  }));
  protected readonly authorInfo = rxResource({ params: () => this.filters().author, stream: ({ params }) => this.api.collection('author', params) });
  protected readonly placeInfo = rxResource({ params: () => this.filters().location, stream: ({ params }) => this.api.collection('location', params) });

  constructor() {
    // Live search: update the URL ~350 ms after the user stops typing (the URL is the single source of truth).
    toObservable(this.draft)
      .pipe(debounceTime(350), distinctUntilChanged(), filter((v) => v.trim() !== (this.q() ?? '').trim()), takeUntilDestroyed())
      .subscribe((v) =>
        this.router.navigate([], { queryParams: { q: v.trim() || null, page: null }, queryParamsHandling: 'merge', replaceUrl: true }),
      );

    effect(() => this.seo.set({ title: this.q() ? `Search: ${this.q()}` : 'Search', path: '/search', noindex: true }));
  }

  protected items(res: { hasValue(): boolean; value(): { items: Collection[] } | undefined }) {
    return res.hasValue() ? (res.value()?.items ?? []) : [];
  }

  protected name(res: Parameters<typeof valueOf<Collection>>[0], title = false): string | undefined {
    const n = valueOf(res)?.name;
    return n && title ? titleCase(n) : n;
  }

  protected setFilter(dim: Dimension, value: string): void {
    void this.router.navigate([], { queryParams: { [DIMENSION_META[dim].param]: value || null, page: null }, queryParamsHandling: 'merge' });
  }
}

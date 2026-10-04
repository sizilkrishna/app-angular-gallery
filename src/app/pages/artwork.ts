import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, effect, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ApiService } from '../core/api.service';
import { FavoritesService } from '../core/favorites.service';
import { ImageService } from '../core/image.service';
import { SeoService } from '../core/seo.service';
import { valueOf } from '../core/resource';
import { sentenceCase, titleCase, toInt } from '../core/util';
import { ArtCard } from '../shared/art-card';
import { Icon } from '../shared/icon';
import { ErrorState, SkeletonGrid } from '../shared/states';
import { ZoomViewer } from '../shared/zoom-viewer';
import { NotFound } from './not-found';

@Component({
  selector: 'app-artwork',
  imports: [RouterLink, ArtCard, Icon, ErrorState, SkeletonGrid, ZoomViewer, NotFound],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!artId()) {
      <app-not-found />
    } @else if (art.error(); as err) {
      <div class="container"><app-error-state [error]="err" (retry)="art.reload()" /></div>
    } @else if (art.value(); as a) {
      <div class="container">
        <app-zoom-viewer [src]="original()" [alt]="a.title + (a.author ? ' by ' + a.author : '')" />

        <div class="layout">
          <header>
            <h1>{{ a.title }}</h1>
            <p class="lead">
              <a [routerLink]="['/collection/author', a.authorId]">{{ a.author }}</a>
              @if (a.bornDied) { <span class="dim"> ({{ a.bornDied }})</span> }
              @if (a.date) { <span class="dim"> · {{ a.date }}</span> }
            </p>
          </header>

          <div class="actions">
            <button type="button" class="btn" [class.ghost]="!fav.has(a.id)" [attr.aria-pressed]="fav.has(a.id)" (click)="fav.toggle(a)">
              <app-icon name="heart" [filled]="fav.has(a.id)" /> {{ fav.has(a.id) ? 'In my gallery' : 'Save' }}
            </button>
            <button type="button" class="btn ghost" (click)="share(a.title)"><app-icon [name]="shared() ? 'check' : 'share'" /> {{ shared() ? 'Link copied' : 'Share' }}</button>
            <a class="btn ghost" [href]="original()" target="_blank" rel="noopener noreferrer"><app-icon name="external" /> Original</a>
          </div>

          <dl class="facts">
            @if (a.technique) { <div><dt>Technique</dt><dd>{{ sentence(a.technique) }}</dd></div> }
            @if (a.form) { <div><dt>Art form</dt><dd><a [routerLink]="['/collection/form', a.formId]">{{ title(a.form) }}</a></dd></div> }
            @if (a.type) { <div><dt>Subject</dt><dd><a [routerLink]="['/collection/type', a.typeId]">{{ title(a.type) }}</a></dd></div> }
            @if (a.school) { <div><dt>School</dt><dd><a [routerLink]="['/collection/school', a.schoolId]">{{ title(a.school) }}</a></dd></div> }
            @if (a.timeframe) { <div><dt>Period</dt><dd><a [routerLink]="['/collection/timeframe', a.timeframeId]">{{ a.timeframe }}</a></dd></div> }
            @if (a.location) { <div><dt>Location</dt><dd><a [routerLink]="['/collection/location', a.locationId]">{{ title(a.location) }}</a></dd></div> }
          </dl>
        </div>

        @if (byArtist.value(); as list) {
          @if (list.length) {
            <section class="block" aria-labelledby="h-artist">
              <h2 id="h-artist">More by {{ a.author }}</h2>
              <div class="masonry">@for (r of list; track r.id) { <app-art-card [art]="r" /> }</div>
              <p><a [routerLink]="['/collection/author', a.authorId]">See all works by {{ a.author }} →</a></p>
            </section>
          }
        }
        @if (samePeriod.value(); as list) {
          @if (list.length) {
            <section class="block" aria-labelledby="h-period">
              <h2 id="h-period">More {{ title(a.form) }} from {{ a.timeframe }}</h2>
              <div class="masonry">@for (r of list; track r.id) { <app-art-card [art]="r" /> }</div>
            </section>
          }
        }
      </div>
    } @else {
      <div class="container"><app-skeleton-grid [count]="3" /></div>
    }`,
  styles: `
    .layout { display: grid; grid-template-columns: 1.2fr 1fr; gap: 1rem 3rem; margin-top: 1.5rem; }
    header { grid-column: 1; } h1 { font: 600 clamp(1.6rem, 3vw, 2.4rem)/1.15 var(--font-serif); margin: 0 0 .4rem; }
    .lead a { color: var(--ink); } .dim { color: var(--muted); }
    .actions { grid-column: 1; display: flex; flex-wrap: wrap; gap: .6rem; }
    .facts { grid-column: 2; grid-row: 1 / span 2; margin: 0; display: grid; gap: .1rem; align-content: start; }
    .facts div { display: grid; grid-template-columns: 7rem 1fr; gap: .75rem; padding: .6rem 0; border-bottom: 1px solid var(--line); }
    dt { color: var(--muted); font-size: .88rem; } dd { margin: 0; } dd a { color: var(--accent); }
    .block { margin-top: 3.5rem; } .block h2 { font: 600 1.4rem var(--font-serif); margin: 0 0 1rem; }
    @media (max-width: 800px) { .layout { grid-template-columns: 1fr; } .facts, header, .actions { grid-column: 1; grid-row: auto; } }`,
})
export class ArtworkPage {
  private readonly api = inject(ApiService);
  private readonly images = inject(ImageService);
  private readonly seo = inject(SeoService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly fav = inject(FavoritesService);

  readonly id = input<string>();
  protected readonly artId = computed(() => (toInt(this.id()) > 0 ? toInt(this.id()) : 0));
  protected readonly shared = signal(false);
  protected readonly sentence = sentenceCase;
  protected readonly title = titleCase;

  protected readonly art = rxResource({ params: () => this.artId() || undefined, stream: ({ params }) => this.api.artwork(params) });
  protected readonly loaded = computed(() => valueOf(this.art));
  protected readonly original = computed(() => this.images.original(this.loaded()?.url));

  protected readonly byArtist = rxResource({
    params: () => {
      const a = this.loaded();
      return a?.authorId ? { id: a.authorId, self: a.id } : undefined;
    },
    stream: ({ params }) => this.api.artworksBy('author', params.id, 1, 9).pipe(map((p) => p.items.filter((x) => x.id !== params.self).slice(0, 8))),
  });
  protected readonly samePeriod = rxResource({
    params: () => {
      const a = this.loaded();
      return a?.timeframeId && a.formId ? { ti: a.timeframeId, fo: a.formId, self: a.id } : undefined;
    },
    stream: ({ params }) =>
      this.api.filter({ timeframe: params.ti, form: params.fo }, 1, 9).pipe(map((p) => p.items.filter((x) => x.id !== params.self).slice(0, 8))),
  });

  constructor() {
    effect(() => {
      if (this.art.error()) {
        this.seo.set({ title: 'Artwork not found', noindex: true });
        if ((this.art.error() as { notFound?: boolean }).notFound) this.seo.setStatus(404);
        return;
      }
      const a = this.loaded();
      if (!a) return;
      const image = this.images.original(a.url);
      const path = `/art/${a.id}`;
      this.seo.set({
        title: a.author ? `${a.title} – ${a.author}` : a.title,
        description: [a.title, a.date && `(${a.date})`, a.author && `by ${a.author}.`, a.technique && sentenceCase(a.technique) + '.'].filter(Boolean).join(' '),
        image,
        path,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'VisualArtwork',
          name: a.title,
          image,
          ...(a.author && { creator: { '@type': 'Person', name: a.author } }),
          ...(a.date && { dateCreated: a.date }),
          ...(a.technique && { artMedium: a.technique }),
          ...(a.form && { artform: titleCase(a.form) }),
        },
      });
    });
  }

  protected async share(title: string): Promise<void> {
    if (!this.browser) return;
    const url = location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        this.shared.set(true);
        setTimeout(() => this.shared.set(false), 2000);
      }
    } catch { /* user cancelled or clipboard unavailable */ }
  }
}

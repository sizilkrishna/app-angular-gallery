import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ApiService } from '../core/api.service';
import { ImageService } from '../core/image.service';
import { SeoService } from '../core/seo.service';
import { valueOf } from '../core/resource';
import { ArtCard } from '../shared/art-card';
import { ArtImage } from '../shared/art-image';
import { CollectionCard } from '../shared/collection-card';
import { Icon } from '../shared/icon';
import { SkeletonGrid } from '../shared/states';
import { DIMENSION_META, Dimension } from '../core/models';

@Component({
  selector: 'app-home',
  imports: [RouterLink, ArtCard, ArtImage, CollectionCard, Icon, SkeletonGrid],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hero" aria-label="Featured artwork">
      @if (hero.hasValue() && hero.value(); as art) {
        <div class="bg" [style.background-image]="'url(' + bgUrl(art.url) + ')'"></div>
        <div class="container inner">
          <div class="text">
            <p class="kicker">Artwork of the moment</p>
            <h1><a [routerLink]="['/art', art.id]">{{ art.title }}</a></h1>
            <p class="by">
              <a [routerLink]="['/collection/author', art.authorId]">{{ art.author }}</a>
              @if (art.date) { · {{ art.date }} }
            </p>
            <div class="row">
              <a class="btn" [routerLink]="['/art', art.id]">View &amp; zoom</a>
              <button type="button" class="btn ghost" (click)="hero.reload()" [disabled]="hero.isLoading()">
                <app-icon name="shuffle" /> Surprise me
              </button>
            </div>
          </div>
          <a class="frame" [routerLink]="['/art', art.id]" [attr.aria-label]="'Open ' + art.title">
            <app-art-image priority [url]="art.url" [alt]="art.title" [width]="1080" sizes="(min-width: 900px) 50vw, 100vw" />
          </a>
        </div>
      } @else {
        <div class="container inner"><div class="text"><h1>Mercurial Gallery of Art</h1><p class="by">Discover European art, one masterpiece at a time.</p></div></div>
      }
    </section>

    <div class="container">
      @for (row of rails; track row.dim) {
        @if (row.res.hasValue() && row.res.value(); as page) {
          <section class="block" [attr.aria-labelledby]="'h-' + row.dim">
            <header class="head">
              <h2 [id]="'h-' + row.dim">{{ row.title }}</h2>
              <a [routerLink]="['/explore', row.dim]">See all</a>
            </header>
            <div class="rail">
              @for (c of page.items; track c.id) { <app-collection-card [c]="c" /> }
            </div>
          </section>
        }
      }

      <section class="block" aria-labelledby="h-az">
        <header class="head"><h2 id="h-az">Artists A–Z</h2><a routerLink="/explore/author">See all</a></header>
        <div class="az">
          @for (l of letters; track l) { <a [routerLink]="['/explore/author']" [queryParams]="{ letter: l }">{{ l }}</a> }
        </div>
      </section>

      <section class="block" aria-labelledby="h-picks">
        <header class="head">
          <h2 id="h-picks">Fresh picks</h2>
          <button type="button" class="link" (click)="picks.reload()" [disabled]="picks.isLoading()">Shuffle</button>
        </header>
        @if (picks.hasValue() && picks.value(); as arts) {
          <div class="masonry">
            @for (a of arts; track a.id) { <app-art-card [art]="a" /> }
          </div>
        } @else if (picks.isLoading()) {
          <app-skeleton-grid [count]="8" />
        }
      </section>
    </div>`,
  styles: `
    .hero { position: relative; overflow: hidden; color: #fff; background: #151412; }
    .bg { position: absolute; inset: -2rem; background-size: cover; background-position: center; filter: blur(34px) brightness(.45) saturate(1.2); transform: scale(1.1); }
    .inner { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 2.5rem; align-items: center; padding-block: 3rem; min-height: 28rem; }
    .text h1 { font: 600 clamp(1.8rem, 4vw, 3rem)/1.1 var(--font-serif); margin: .25rem 0 .75rem; }
    .text h1 a, .by a { color: inherit; text-decoration: none; } .text h1 a:hover { text-decoration: underline; }
    .kicker { margin: 0; text-transform: uppercase; letter-spacing: .12em; font-size: .75rem; opacity: .75; }
    .by { font-size: 1.1rem; opacity: .9; margin: 0 0 1.5rem; } .by a { text-decoration: underline; text-underline-offset: 3px; }
    .row { display: flex; flex-wrap: wrap; gap: .75rem; }
    .btn.ghost { color: #fff; border-color: rgb(255 255 255 / .5); background: transparent; }
    .frame { display: block; justify-self: center; max-width: 100%; max-height: 30rem; border-radius: .35rem; overflow: hidden; box-shadow: 0 24px 60px rgb(0 0 0 / .5); }
    .frame app-art-image { max-height: 30rem; } .frame app-art-image ::ng-deep img { max-height: 30rem; width: auto; max-width: 100%; margin-inline: auto; }
    @media (max-width: 800px) { .inner { grid-template-columns: 1fr; padding-block: 2rem; } .frame { order: -1; } }
    .block { margin-top: 3rem; } .head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 1rem; }
    .head h2 { font: 600 1.5rem var(--font-serif); margin: 0; } .head a, .link { color: var(--accent); font-size: .92rem; background: none; border: 0; cursor: pointer; font-family: inherit; }
    .rail { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(15rem, 18rem); gap: 1rem; overflow-x: auto; padding-bottom: .75rem; scroll-snap-type: x proximity; }
    .rail > * { scroll-snap-align: start; }
    .az { display: flex; flex-wrap: wrap; gap: .4rem; } .az a { display: grid; place-items: center; width: 2.6rem; height: 2.6rem; border-radius: .6rem; background: var(--surface-2); color: var(--ink); text-decoration: none; font: 600 1rem var(--font-serif); }
    .az a:hover { background: var(--accent); color: #fff; }`,
})
export class Home {
  private readonly api = inject(ApiService);
  private readonly images = inject(ImageService);
  private readonly seo = inject(SeoService);

  protected readonly letters = 'ABCDEFGHIJKLMNOPRSTUVWZ'.split('');
  protected readonly hero = rxResource({ stream: () => this.api.random(1).pipe(map((a) => a[0] ?? null)) });
  protected readonly picks = rxResource({ stream: () => this.api.random(12) });
  protected readonly rails = (['timeframe', 'form', 'type', 'school'] as Dimension[]).map((dim) => ({
    dim,
    title: dim === 'timeframe' ? 'Journey through time' : `Browse by ${DIMENSION_META[dim].singular.toLowerCase()}`,
    res: rxResource({ stream: () => this.api.collections(dim, { limit: dim === 'timeframe' ? 100 : 16 }) }),
  }));

  constructor() {
    effect(() => {
      const url = valueOf(this.hero)?.url;
      this.seo.set({ path: '/', image: url ? this.images.original(url) : undefined });
    });
  }

  protected bgUrl(url: string): string {
    return this.images.src(url, 320);
  }
}

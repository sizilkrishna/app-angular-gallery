import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoritesService } from '../core/favorites.service';
import { ArtImage } from './art-image';
import { Icon } from './icon';

/** The few fields every artwork card needs (satisfied by both `Artwork` and `Favorite`). */
export interface ArtSummary {
  id: number;
  title: string;
  author: string;
  authorId: number;
  date: string;
  url: string;
}

@Component({
  selector: 'app-art-card',
  imports: [RouterLink, ArtImage, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card">
      <a class="media" [routerLink]="['/art', art().id]" tabindex="-1" aria-hidden="true">
        <app-art-image [url]="art().url" [alt]="''" [width]="520" />
      </a>
      <div class="meta">
        <a class="title" [routerLink]="['/art', art().id]">{{ art().title }}</a>
        <span class="sub">
          @if (art().author) { <a [routerLink]="['/collection/author', art().authorId]">{{ art().author }}</a> }
          @if (art().date) { <span class="date">{{ art().date }}</span> }
        </span>
      </div>
      <button type="button" class="fav" [class.on]="fav.has(art().id)" [attr.aria-pressed]="fav.has(art().id)"
              [attr.aria-label]="(fav.has(art().id) ? 'Remove from' : 'Add to') + ' my gallery: ' + art().title"
              (click)="fav.toggle(art())">
        <app-icon name="heart" [filled]="fav.has(art().id)" />
      </button>
    </article>`,
  styles: `
    :host { display: block; }
    .card { position: relative; border-radius: var(--radius); overflow: hidden; background: var(--surface); box-shadow: var(--shadow-sm); transition: box-shadow .2s, transform .2s; }
    .card:hover { box-shadow: var(--shadow); transform: translateY(-2px); }
    .media { display: block; }
    .meta { display: grid; gap: .15rem; padding: .7rem .85rem .85rem; }
    .title { font-family: var(--font-serif); font-size: 1rem; line-height: 1.3; color: var(--ink); text-decoration: none; }
    .title:hover { text-decoration: underline; }
    .sub { color: var(--muted); font-size: .85rem; display: flex; flex-wrap: wrap; gap: .25rem .6rem; }
    .sub a { color: inherit; }
    .fav { position: absolute; top: .5rem; right: .5rem; display: grid; place-items: center; width: 2.25rem; height: 2.25rem; border-radius: 50%;
      border: 0; cursor: pointer; color: #fff; background: rgb(0 0 0 / .45); backdrop-filter: blur(6px); opacity: 0; transition: opacity .15s, background .15s; }
    .card:hover .fav, .fav:focus-visible, .fav.on { opacity: 1; }
    .fav.on { background: var(--accent); }
    @media (hover: none) { .fav { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .card, .card:hover { transition: none; transform: none; } }`,
})
export class ArtCard {
  readonly art = input.required<ArtSummary>();
  protected readonly fav = inject(FavoritesService);
}

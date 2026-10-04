import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Collection, DIMENSION_META } from '../core/models';
import { titleCase } from '../core/util';
import { ArtImage } from './art-image';

/** A card for an artist, period, art form, subject, school or place. */
@Component({
  selector: 'app-collection-card',
  imports: [RouterLink, ArtImage, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="c" [class.text]="!c().image" [routerLink]="['/collection', c().dimension, c().id]">
      @if (c().image) {
        <app-art-image cover [url]="c().image!" [alt]="''" [width]="480" />
        <span class="scrim"></span>
      } @else {
        <span class="initial" aria-hidden="true">{{ initial() }}</span>
      }
      <span class="label">
        <strong>{{ name() }}</strong>
        @if (c().subtitle) { <small>{{ c().subtitle }}</small> }
        <small>
          @if (c().school) { {{ school() }} · }
          {{ c().count | number }} {{ c().count === 1 ? 'work' : 'works' }}
        </small>
      </span>
    </a>`,
  styles: `
    :host { display: block; }
    .c { position: relative; display: block; border-radius: var(--radius); overflow: hidden; color: #fff; text-decoration: none; min-height: 11rem;
      background: var(--surface); box-shadow: var(--shadow-sm); transition: box-shadow .2s, transform .2s; --ar: 4 / 3; }
    .c:hover, .c:focus-visible { box-shadow: var(--shadow); transform: translateY(-2px); }
    .scrim { position: absolute; inset: 0; background: linear-gradient(to top, rgb(0 0 0 / .78), rgb(0 0 0 / 0) 62%); }
    .label { position: absolute; inset: auto 0 0 0; display: grid; gap: .1rem; padding: .9rem 1rem; }
    .label strong { font-family: var(--font-serif); font-size: 1.1rem; line-height: 1.2; font-weight: 600; }
    .label small { opacity: .85; font-size: .8rem; }
    .text { color: var(--ink); aspect-ratio: 4 / 3; background: linear-gradient(145deg, var(--surface), var(--surface-2)); }
    .text .initial { position: absolute; top: -.15em; right: .08em; font: 700 7rem/1 var(--font-serif); color: var(--accent); opacity: .16; }
    @media (prefers-reduced-motion: reduce) { .c, .c:hover { transition: none; transform: none; } }`,
})
export class CollectionCard {
  readonly c = input.required<Collection>();
  protected readonly name = computed(() => (this.c().dimension === 'author' ? this.c().name : titleCase(this.c().name)));
  protected readonly school = computed(() => titleCase(this.c().school ?? ''));
  protected readonly initial = computed(() => (this.c().name.trim()[0] ?? DIMENSION_META[this.c().dimension].singular[0]).toUpperCase());
}

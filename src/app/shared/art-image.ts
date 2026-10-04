import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, booleanAttribute, computed, inject, input, signal, viewChild } from '@angular/core';
import { ImageService } from '../core/image.service';
import { Icon } from './icon';

/**
 * An artwork image with a skeleton while loading and a tidy placeholder if the source is missing.
 * `cover` crops to a fixed aspect ratio (grids); the default keeps the natural proportions.
 */
@Component({
  selector: 'app-art-image',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.cover]': 'cover()' },
  template: `
    @if (failed()) {
      <div class="ph" role="img" [attr.aria-label]="alt()"><app-icon name="frame" /></div>
    } @else {
      <img #img [src]="src()" [attr.srcset]="srcset()" [attr.sizes]="srcset() ? sizes() : null" [alt]="alt()"
           [attr.loading]="priority() ? 'eager' : 'lazy'" [attr.fetchpriority]="priority() ? 'high' : 'auto'"
           decoding="async" (error)="failed.set(true)" />
    }`,
  styles: `
    :host { display: block; position: relative; overflow: hidden; background: var(--skeleton); }
    :host(:not(.cover)) { min-height: 8rem; }
    :host(.cover) { aspect-ratio: var(--ar, 4 / 3); }
    img { display: block; width: 100%; height: auto; }
    :host(.cover) img { height: 100%; object-fit: cover; }
    .ph { display: grid; place-items: center; width: 100%; height: 100%; min-height: 8rem; color: var(--muted); font-size: 2rem; }`,
})
export class ArtImage {
  private readonly images = inject(ImageService);
  readonly url = input.required<string>();
  readonly alt = input('');
  /** Approximate display width in CSS px (drives the proxy size when one is configured). */
  readonly width = input(480);
  readonly sizes = input('(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw');
  readonly cover = input(false, { transform: booleanAttribute });
  readonly priority = input(false, { transform: booleanAttribute });

  protected readonly failed = signal(false);
  protected readonly src = computed(() => this.images.src(this.url(), this.width()));
  protected readonly srcset = computed(() => this.images.srcset(this.url()));
  private readonly img = viewChild<ElementRef<HTMLImageElement>>('img');

  constructor() {
    // Images that failed while the server-rendered HTML was loading never fire (error) in Angular.
    afterNextRender(() => {
      const el = this.img()?.nativeElement;
      if (el?.complete && el.naturalWidth === 0) this.failed.set(true);
    });
  }
}

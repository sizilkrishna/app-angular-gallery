import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ImageService } from '../core/image.service';
import { DIMENSION_META, Dimension, isDimension } from '../core/models';
import { SeoService } from '../core/seo.service';
import { valueOf } from '../core/resource';
import { titleCase, toInt, toPage } from '../core/util';
import { ArtCard } from '../shared/art-card';
import { Pager } from '../shared/pager';
import { EmptyState, ErrorState, SkeletonGrid } from '../shared/states';
import { NotFound } from './not-found';

@Component({
  selector: 'app-collection',
  imports: [RouterLink, ArtCard, Pager, ErrorState, EmptyState, SkeletonGrid, NotFound, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!key()) {
      <app-not-found />
    } @else if (info.error(); as err) {
      <div class="container"><app-error-state [error]="err" (retry)="info.reload()" /></div>
    } @else {
      <div class="container">
        <header class="page-head">
          <p class="kicker"><a [routerLink]="['/explore', key()!.dim]">{{ meta()!.singular }}</a></p>
          @if (info.value(); as c) {
            <h1>{{ name() }}</h1>
            <p class="lead">
              @if (c.subtitle) { {{ c.subtitle }} · }
              @if (c.school && c.schoolId) { <a [routerLink]="['/collection/school', c.schoolId]">{{ schoolName() }}</a> · }
              {{ c.count | number }} {{ c.count === 1 ? 'work' : 'works' }}
            </p>
          } @else { <h1 class="ghost">Loading…</h1> }
        </header>

        @if (arts.error()) {
          <app-error-state [error]="arts.error()" (retry)="arts.reload()" />
        } @else if (arts.value(); as page) {
          @if (page.items.length === 0) {
            <app-empty-state title="No artworks">This collection is empty.</app-empty-state>
          } @else {
            <div class="masonry">
              @for (a of page.items; track a.id) { <app-art-card [art]="a" /> }
            </div>
            <app-pager [page]="page.pagination.page" [pages]="page.pagination.pages" />
          }
        } @else {
          <app-skeleton-grid [count]="12" />
        }
      </div>
    }`,
  styles: `.ghost { opacity: .35; }`,
})
export class CollectionPage {
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);
  private readonly images = inject(ImageService);

  readonly dimension = input<string>();
  readonly id = input<string>();
  readonly page = input<string>();

  protected readonly key = computed<{ dim: Dimension; id: number } | null>(() => {
    const dim = this.dimension();
    const id = toInt(this.id());
    return isDimension(dim) && id > 0 ? { dim, id } : null;
  });
  protected readonly meta = computed(() => (this.key() ? DIMENSION_META[this.key()!.dim] : null));

  protected readonly info = rxResource({
    params: () => this.key() ?? undefined,
    stream: ({ params }) => this.api.collection(params.dim, params.id),
  });
  protected readonly arts = rxResource({
    params: () => (this.key() ? { ...this.key()!, page: toPage(this.page()) } : undefined),
    stream: ({ params }) => this.api.artworksBy(params.dim, params.id, params.page, 24),
  });

  protected readonly name = computed(() => {
    const c = valueOf(this.info);
    return c ? (c.dimension === 'author' ? c.name : titleCase(c.name)) : '';
  });
  protected readonly schoolName = computed(() => titleCase(valueOf(this.info)?.school ?? ''));

  constructor() {
    effect(() => {
      if ((this.info.error() as { notFound?: boolean } | undefined)?.notFound) {
        this.seo.set({ title: 'Not found', noindex: true });
        this.seo.setStatus(404);
        return;
      }
      const c = valueOf(this.info);
      if (!c) return;
      const first = valueOf(this.arts)?.items[0];
      this.seo.set({
        title: this.name(),
        description: `${c.count} works in ${this.meta()!.singular.toLowerCase()} “${this.name()}”${c.subtitle ? ` (${c.subtitle})` : ''}.`,
        path: `/collection/${c.dimension}/${c.id}`,
        image: first ? this.images.original(first.url) : undefined,
        noindex: toPage(this.page()) > 1,
      });
    });
  }
}

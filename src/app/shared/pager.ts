import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from './icon';

/** Real links (`?page=n`), so pagination works without JavaScript, can be shared and is crawlable. */
@Component({
  selector: 'app-pager',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (pages() > 1) {
      <nav aria-label="Pagination">
        @if (page() > 1) {
          <a class="step" rel="prev" [routerLink]="[]" [queryParams]="q(page() - 1)" queryParamsHandling="merge" aria-label="Previous page"><app-icon name="left" /></a>
        }
        @for (item of items(); track $index) {
          @if (item === 0) { <span class="gap" aria-hidden="true">…</span> }
          @else {
            <a [class.current]="item === page()" [attr.aria-current]="item === page() ? 'page' : null"
               [routerLink]="[]" [queryParams]="q(item)" queryParamsHandling="merge" [attr.aria-label]="'Page ' + item">{{ item }}</a>
          }
        }
        @if (page() < pages()) {
          <a class="step" rel="next" [routerLink]="[]" [queryParams]="q(page() + 1)" queryParamsHandling="merge" aria-label="Next page"><app-icon name="right" /></a>
        }
      </nav>
    }`,
  styles: `
    nav { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: .35rem; margin: 2rem 0; }
    a, .gap { min-width: 2.5rem; height: 2.5rem; display: inline-grid; place-items: center; padding: 0 .6rem; border-radius: 999px; color: var(--ink); text-decoration: none; }
    a:hover { background: var(--surface-2); }
    a.current { background: var(--ink); color: var(--bg); font-weight: 600; }
    .gap { color: var(--muted); }`,
})
export class Pager {
  readonly page = input.required<number>();
  readonly pages = input.required<number>();

  /** 1 … 4 5 [6] 7 8 … 20  (0 marks a gap) */
  protected readonly items = computed(() => {
    const total = this.pages();
    const current = this.page();
    const wanted = new Set([1, total, current - 2, current - 1, current, current + 1, current + 2]);
    const sorted = [...wanted].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
    const out: number[] = [];
    sorted.forEach((n, i) => {
      if (i > 0 && n - sorted[i - 1] > 1) out.push(0);
      out.push(n);
    });
    return out;
  });

  protected q(n: number): { page: number | null } {
    return { page: n <= 1 ? null : n };
  }
}

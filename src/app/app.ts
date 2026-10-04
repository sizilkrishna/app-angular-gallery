import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, pairwise, startWith } from 'rxjs';
import { FavoritesService } from './core/favorites.service';
import { APP_CONFIG } from './core/config';
import { DIMENSION_META } from './core/models';
import { ThemeService } from './core/theme.service';
import { Icon } from './shared/icon';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKey($event)' },
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly cfg = inject(APP_CONFIG);
  protected readonly theme = inject(ThemeService);
  protected readonly favorites = inject(FavoritesService);
  private readonly router = inject(Router);
  private readonly searchBox = viewChild.required<ElementRef<HTMLInputElement>>('searchBox');
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  protected readonly year = new Date().getFullYear();
  protected readonly nav = (['author', 'timeframe', 'form', 'type', 'school', 'location'] as const).map((d) => ({
    path: ['/explore', d],
    label: DIMENSION_META[d].plural,
  }));

  constructor() {
    // Move focus to the page content after in-app navigation (not on first load) for keyboard / screen reader users.
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), startWith(null), pairwise(), takeUntilDestroyed())
      .subscribe(([prev]) => {
        if (prev !== null) this.main().nativeElement.focus({ preventScroll: true });
      });
  }

  protected search(event: Event, value: string): void {
    event.preventDefault();
    const q = value.trim();
    if (q) void this.router.navigate(['/search'], { queryParams: { q } });
  }

  protected onKey(e: KeyboardEvent): void {
    const t = e.target as HTMLElement | null;
    const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      this.searchBox().nativeElement.focus();
    }
  }
}

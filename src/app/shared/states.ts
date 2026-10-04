import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { toApiError } from '../core/api-error';

@Component({
  selector: 'app-error-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="box" role="alert">
      <h2>{{ error().notFound ? 'Not found' : 'Something went wrong' }}</h2>
      <p>{{ error().userMessage }}</p>
      @if (!error().notFound) { <button type="button" class="btn" (click)="retry.emit()">Try again</button> }
    </div>`,
  styles: `.box { text-align: center; padding: 4rem 1rem; } h2 { font-family: var(--font-serif); margin: 0 0 .5rem; } p { color: var(--muted); margin: 0 0 1.25rem; }`,
})
export class ErrorState {
  readonly err = input<unknown>(undefined, { alias: 'error' });
  readonly retry = output<void>();
  protected readonly error = computed(() => toApiError(this.err()));
}

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="box"><h2>{{ title() }}</h2><p><ng-content /></p></div>`,
  styles: `.box { text-align: center; padding: 4rem 1rem; } h2 { font-family: var(--font-serif); margin: 0 0 .5rem; } p { color: var(--muted); margin: 0; }`,
})
export class EmptyState {
  readonly title = input('Nothing here yet');
}

/** Placeholder tiles shown while a list loads (also marks the region busy for assistive tech). */
@Component({
  selector: 'app-skeleton-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid" role="status" aria-label="Loading">
      @for (n of tiles(); track n) { <div class="tile" [style.--ar]="ratios[n % ratios.length]"></div> }
    </div>`,
  styles: `
    .grid { columns: 4 14rem; column-gap: 1rem; }
    .tile { break-inside: avoid; margin-bottom: 1rem; aspect-ratio: var(--ar); border-radius: var(--radius); background: var(--skeleton); animation: pulse 1.4s ease-in-out infinite; }
    @keyframes pulse { 50% { opacity: .55; } }
    @media (prefers-reduced-motion: reduce) { .tile { animation: none; } }`,
})
export class SkeletonGrid {
  readonly count = input(12);
  protected readonly ratios = ['4 / 3', '3 / 4', '1 / 1', '5 / 4', '3 / 4', '4 / 3'];
  protected readonly tiles = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}

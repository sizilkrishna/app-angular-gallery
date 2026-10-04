import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const ICONS = {
  search: ['M4 11a7 7 0 1 0 14 0a7 7 0 1 0-14 0', 'm20 20-3.5-3.5'],
  heart: ['M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z'],
  sun: ['M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0', 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'],
  moon: ['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'],
  plus: ['M12 5v14M5 12h14'],
  minus: ['M5 12h14'],
  expand: ['M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3'],
  reset: ['M3 12a9 9 0 1 0 3-6.7L3 8', 'M3 3v5h5'],
  share: ['M15 5a3 3 0 1 0 6 0a3 3 0 1 0-6 0', 'M3 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0', 'M15 19a3 3 0 1 0 6 0a3 3 0 1 0-6 0', 'm8.6 13.5 6.8 4M15.4 6.5l-6.8 4'],
  external: ['M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3'],
  left: ['m15 18-6-6 6-6'],
  right: ['m9 18 6-6-6-6'],
  shuffle: ['M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5'],
  frame: ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', 'M7 9a2 2 0 1 0 4 0a2 2 0 1 0-4 0', 'm21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21'],
  check: ['M20 6 9 17l-5-5'],
} as const;

export type IconName = keyof typeof ICONS;

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true" focusable="false" [attr.fill]="filled() ? 'currentColor' : 'none'">
      @for (d of paths(); track $index) { <path [attr.d]="d" /> }
    </svg>`,
  styles: `:host { display: inline-flex; width: 1.25em; height: 1.25em; } svg { width: 100%; height: 100%; }`,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly filled = input(false);
  protected readonly paths = computed(() => ICONS[this.name()]);
}

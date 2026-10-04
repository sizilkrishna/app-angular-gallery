import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';

export type ThemeChoice = 'system' | 'light' | 'dark';
const KEY = 'mgo:theme';

/** Light / dark / system theme. The initial paint is handled by a tiny inline script in index.html. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly choice = signal<ThemeChoice>('system');
  readonly isDark = computed(() => {
    const c = this.choice();
    return c === 'dark' || (c === 'system' && this.browser && matchMedia('(prefers-color-scheme: dark)').matches);
  });

  constructor() {
    if (this.browser) {
      try {
        const saved = localStorage.getItem(KEY);
        if (saved === 'light' || saved === 'dark') this.choice.set(saved);
      } catch { /* storage unavailable (private mode) – keep default */ }
    }
    effect(() => {
      const c = this.choice();
      if (c === 'system') this.doc.documentElement.removeAttribute('data-theme');
      else this.doc.documentElement.setAttribute('data-theme', c);
    });
  }

  toggle(): void {
    const next: ThemeChoice = this.isDark() ? 'light' : 'dark';
    this.choice.set(next);
    try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
  }
}

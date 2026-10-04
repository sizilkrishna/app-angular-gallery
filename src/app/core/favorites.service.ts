import { Injectable, afterNextRender, computed, signal } from '@angular/core';
import { Artwork } from './models';

/** Just enough of an artwork to render a card without another API call. */
export interface Favorite {
  id: number;
  title: string;
  author: string;
  authorId: number;
  date: string;
  url: string;
  savedAt: number;
}

const KEY = 'mgo:favorites:v1';
const MAX = 500;

/**
 * "My gallery": favourite artworks kept in localStorage. Loaded after hydration so server and
 * client markup always match; `ready` tells pages when it is safe to show an empty state.
 */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly map = signal<Record<number, Favorite>>({});
  readonly ready = signal(false);
  readonly list = computed(() => Object.values(this.map()).sort((a, b) => b.savedAt - a.savedAt));
  readonly count = computed(() => this.list().length);

  constructor() {
    afterNextRender(() => {
      this.map.set(this.read());
      this.ready.set(true);
    });
  }

  has(id: number): boolean {
    return id in this.map();
  }

  toggle(art: Pick<Artwork, 'id' | 'title' | 'author' | 'authorId' | 'date' | 'url'>): void {
    const next = { ...this.map() };
    if (art.id in next) delete next[art.id];
    else if (Object.keys(next).length < MAX) {
      next[art.id] = { id: art.id, title: art.title, author: art.author, authorId: art.authorId, date: art.date, url: art.url, savedAt: Date.now() };
    }
    this.map.set(next);
    this.write(next);
  }

  clear(): void {
    this.map.set({});
    this.write({});
  }

  private read(): Record<number, Favorite> {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}');
      if (!parsed || typeof parsed !== 'object') return {};
      const out: Record<number, Favorite> = {};
      for (const v of Object.values(parsed as Record<string, Favorite>)) {
        if (v && typeof v.id === 'number' && typeof v.title === 'string') out[v.id] = v;
      }
      return out;
    } catch {
      return {};
    }
  }

  private write(value: Record<number, Favorite>): void {
    try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* quota / private mode */ }
  }
}

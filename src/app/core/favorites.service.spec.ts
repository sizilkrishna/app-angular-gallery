import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { FavoritesService } from './favorites.service';

const art = { id: 5, title: 'T', author: 'A', authorId: 1, date: '1600', url: 'x.jpg' };

describe('FavoritesService', () => {
  beforeEach(() => { localStorage.clear(); TestBed.resetTestingModule(); });

  it('toggles, counts and persists', () => {
    const s = TestBed.inject(FavoritesService);
    s.toggle(art);
    expect(s.has(5)).toBe(true);
    expect(s.count()).toBe(1);
    expect(JSON.parse(localStorage.getItem('mgo:favorites:v1')!)['5'].title).toBe('T');
    s.toggle(art);
    expect(s.has(5)).toBe(false);
  });

  it('ignores corrupt storage', () => {
    localStorage.setItem('mgo:favorites:v1', '{not json');
    const s = TestBed.inject(FavoritesService);
    expect(s.count()).toBe(0);
    s.toggle(art);
    expect(s.count()).toBe(1);
  });
});

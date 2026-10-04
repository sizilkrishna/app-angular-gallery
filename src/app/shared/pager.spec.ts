import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { Pager } from './pager';

function render(page: number, pages: number): string[] {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const f = TestBed.createComponent(Pager);
  f.componentRef.setInput('page', page);
  f.componentRef.setInput('pages', pages);
  f.detectChanges();
  return Array.from((f.nativeElement as HTMLElement).querySelectorAll('a:not(.step), .gap')).map((e) => e.textContent!.trim());
}

describe('Pager', () => {
  it('shows a windowed list with gaps', () => { TestBed.resetTestingModule(); expect(render(10, 20)).toEqual(['1', '…', '8', '9', '10', '11', '12', '…', '20']); });
  it('renders nothing for a single page', () => { TestBed.resetTestingModule(); expect(render(1, 1)).toEqual([]); });
});

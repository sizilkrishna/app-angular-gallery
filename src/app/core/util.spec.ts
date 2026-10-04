import { describe, expect, it } from 'vitest';
import { sentenceCase, startYear, titleCase, toPage } from './util';

describe('util', () => {
  it('startYear orders period labels', () => { expect(startYear('1251-1300')).toBe(1251); expect(startYear('Unknown')).toBe(Infinity); });
  it('toPage clamps to a positive integer', () => { expect(toPage('3')).toBe(3); expect(toPage('-4')).toBe(1); expect(toPage('abc')).toBe(1); expect(toPage(undefined)).toBe(1); });
  it('cases text', () => { expect(sentenceCase(' oil on canvas')).toBe('Oil on canvas'); expect(titleCase('still-life PAINTING')).toBe('Still-life Painting'); });
});

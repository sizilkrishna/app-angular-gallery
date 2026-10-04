import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { APP_CONFIG } from './config';
import { ImageService } from './image.service';
import { environment } from '../../environments/environment';

function make(over: Partial<typeof environment> = {}): ImageService {
  TestBed.configureTestingModule({ providers: [{ provide: APP_CONFIG, useValue: { ...environment, imageBaseUrl: 'https://img.test/art/', imageProxy: '', ...over } }] });
  return TestBed.inject(ImageService);
}

describe('ImageService', () => {
  it('resolves relative paths against the base and leaves absolute URLs alone', () => {
    const s = make();
    expect(s.original('a/aachen/x.jpg')).toBe('https://img.test/art/a/aachen/x.jpg');
    expect(s.original('/a/x.jpg')).toBe('https://img.test/art/a/x.jpg');
    expect(s.original('https://cdn.test/x.jpg')).toBe('https://cdn.test/x.jpg');
    expect(s.original('')).toBe('');
    expect(s.original(null)).toBe('');
  });
  it('serves originals and no srcset when no proxy is configured', () => {
    const s = make();
    expect(s.src('a/x.jpg', 480)).toBe('https://img.test/art/a/x.jpg');
    expect(s.srcset('a/x.jpg')).toBeNull();
  });
  it('routes through the proxy and builds a srcset when configured', () => {
    const s = make({ imageProxy: 'https://p.test/?url={url}&w={w}' });
    expect(s.src('a/x.jpg', 480)).toBe('https://p.test/?url=https%3A%2F%2Fimg.test%2Fart%2Fa%2Fx.jpg&w=480');
    expect(s.srcset('a/x.jpg')).toContain('&w=320 320w');
    expect(s.srcset('a/x.jpg')!.split(', ')).toHaveLength(5);
  });
});

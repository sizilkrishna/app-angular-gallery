import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from './config';

const ABSOLUTE = /^(?:https?:)?\/\//i;
export const SRCSET_WIDTHS = [320, 480, 720, 1080, 1600];

/**
 * Resolves artwork image URLs. Works with relative paths (resolved against `imageBaseUrl`) and
 * absolute URLs. If `imageProxy` is configured, requests are routed through it so the browser gets
 * right-sized images (and a `srcset`) instead of the full-size originals.
 */
@Injectable({ providedIn: 'root' })
export class ImageService {
  private readonly cfg = inject(APP_CONFIG);

  /** Full URL of the original. */
  original(url: string | null | undefined): string {
    if (!url) return '';
    if (ABSOLUTE.test(url)) return url;
    return this.cfg.imageBaseUrl.replace(/\/+$/, '') + '/' + url.replace(/^\/+/, '');
  }

  /** URL to display at roughly `width` CSS pixels. */
  src(url: string | null | undefined, width?: number): string {
    const original = this.original(url);
    if (!original || !this.cfg.imageProxy || !width) return original;
    return this.proxy(original, width);
  }

  /** `srcset` – only available when a resizing proxy is configured. */
  srcset(url: string | null | undefined): string | null {
    const original = this.original(url);
    if (!original || !this.cfg.imageProxy) return null;
    return SRCSET_WIDTHS.map((w) => `${this.proxy(original, w)} ${w}w`).join(', ');
  }

  private proxy(original: string, width: number): string {
    return this.cfg.imageProxy.replace('{url}', encodeURIComponent(original)).replace('{w}', String(width));
  }
}

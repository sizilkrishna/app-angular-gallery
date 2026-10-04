import { DOCUMENT } from '@angular/common';
import { Injectable, RESPONSE_INIT, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { APP_CONFIG } from './config';

export interface PageMeta {
  title?: string;
  description?: string;
  /** Absolute image URL for social previews. */
  image?: string;
  /** Path of this page (e.g. `/art/12`) – used for the canonical link and og:url. */
  path?: string;
  /** schema.org JSON-LD object. */
  jsonLd?: object | null;
  noindex?: boolean;
}

/** Sets <title>, description, Open Graph / Twitter tags, canonical link and JSON-LD (server + browser). */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  private readonly cfg = inject(APP_CONFIG);
  private readonly response = inject(RESPONSE_INIT, { optional: true });

  /** Sets the HTTP status of the server-rendered response (no-op in the browser) so missing pages are real 404s. */
  setStatus(status: number): void {
    if (this.response) this.response.status = status;
  }

  set(page: PageMeta): void {
    const name = this.cfg.siteName;
    const title = page.title ? `${page.title} · ${name}` : name;
    const description = page.description ?? 'Explore thousands of paintings, sculptures and architecture – by artist, period, art form and more.';
    const url = this.cfg.siteUrl.replace(/\/+$/, '') + (page.path ?? '');

    this.title.setTitle(title);
    this.tag('name', 'description', description);
    this.tag('property', 'og:title', page.title ?? name);
    this.tag('property', 'og:description', description);
    this.tag('property', 'og:site_name', name);
    this.tag('property', 'og:type', 'website');
    this.tag('property', 'og:url', url);
    this.tag('property', 'og:image', page.image ?? null);
    this.tag('name', 'twitter:card', page.image ? 'summary_large_image' : 'summary');
    this.tag('name', 'twitter:title', page.title ?? name);
    this.tag('name', 'twitter:image', page.image ?? null);
    this.tag('name', 'robots', page.noindex ? 'noindex' : null);
    this.canonical(url);
    this.jsonLd(page.jsonLd ?? null);
  }

  private tag(attr: 'name' | 'property', key: string, content: string | null): void {
    if (content === null) this.meta.removeTag(`${attr}='${key}'`);
    else this.meta.updateTag({ [attr]: key, content }, `${attr}='${key}'`);
  }

  private canonical(url: string): void {
    let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.rel = 'canonical';
      this.doc.head.appendChild(link);
    }
    link.href = url;
  }

  private jsonLd(data: object | null): void {
    const id = 'seo-jsonld';
    this.doc.getElementById(id)?.remove();
    if (!data) return;
    const script = this.doc.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    // "<" is escaped so catalogue text can never close the script element.
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    this.doc.head.appendChild(script);
  }
}

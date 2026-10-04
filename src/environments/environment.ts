/** Development defaults. `npm run mock-api` or the Symfony docker-compose stack both listen on :8080. */
export const environment = {
  production: false,
  /** Base URL of the Symfony API, including the `/api` prefix. */
  apiUrl: 'https://localhost:8000/api',
  /** Artwork `url` values that are not absolute are resolved against this base. */
  imageBaseUrl: 'https://www.wga.hu/art/',
  /**
   * Optional image resizing proxy / CDN. `{url}` is replaced with the encoded source URL and `{w}`
   * with the requested pixel width. Empty = load source images directly.
   * Example: 'https://images.example.com/?url={url}&w={w}&output=webp'
   */
  imageProxy: '',
  siteUrl: 'http://localhost:4200',
  siteName: 'Mercurial Gallery of Art',
};

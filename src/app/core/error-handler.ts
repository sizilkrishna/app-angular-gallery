import { isPlatformBrowser } from '@angular/common';
import { ErrorHandler, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { ApiError } from './api-error';
import { ApiService } from './api.service';

const MAX_REPORTS_PER_SESSION = 5;

/**
 * Logs every unexpected error to the console and reports a few of them to the API's logger.
 * Unlike the old app it never hijacks navigation: failures are shown inline where they happen.
 */
@Injectable()
export class AppErrorHandler implements ErrorHandler {
  private readonly api = inject(ApiService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly seen = new Set<string>();

  handleError(error: unknown): void {
    console.error(error);
    // ApiErrors are already presented by the page that triggered them; don't double-report.
    if (!this.browser || error instanceof ApiError) return;
    const message = (error instanceof Error ? `${error.name}: ${error.message}` : String(error)).slice(0, 500);
    if (this.seen.has(message) || this.seen.size >= MAX_REPORTS_PER_SESSION) return;
    this.seen.add(message);
    this.api.log('client-error', `${location.pathname} ${message}`).subscribe({ error: () => undefined });
  }
}

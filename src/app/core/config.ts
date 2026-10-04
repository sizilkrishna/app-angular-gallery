import { InjectionToken } from '@angular/core';
import { environment } from '../../environments/environment';

export type AppConfig = typeof environment;

/** Injectable so tests (and, later, runtime config) can override the build-time environment. */
export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG', {
  providedIn: 'root',
  factory: () => environment,
});

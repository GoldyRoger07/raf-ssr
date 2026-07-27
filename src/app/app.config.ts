import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { AppPreset } from './theme/app-preset';
import { APP_BASE_HREF } from '@angular/common'

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: APP_BASE_HREF,
      useValue: '/raf/'
    },
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(),
    providePrimeNG({
      theme: {
        preset: AppPreset,
        options: {
          // Le mode sombre s'active via la classe .app-dark sur <html>.
          // Absence de la classe = mode clair (thème par défaut).
          darkModeSelector: '.app-dark',
          // Compatibilité avec Tailwind CSS v4 : styles PrimeNG dans un layer
          // dédié, en dessous des utilitaires Tailwind.
          cssLayer: {
            name: 'primeng',
            order: 'theme, base, primeng, utilities',
          },
        },
      },
    }),
  ],
};

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { apiUrlInterceptor } from './core/api-url';
import { authInterceptor } from './core/auth';

registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    // a ordem importa: o authInterceptor reconhece as rotas do painel pelo caminho /api/admin
    provideHttpClient(withInterceptors([authInterceptor, apiUrlInterceptor])),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
  ],
};

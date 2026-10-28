import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

// a vitrine e as fotos vêm da API em outro domínio: abre a conexão enquanto o resto do app ainda carrega
if (environment.apiUrl) {
  for (const cors of [true, false]) {
    const link = Object.assign(document.createElement('link'), { rel: 'preconnect', href: environment.apiUrl });
    if (cors) link.crossOrigin = 'anonymous'; // fetch da API usa conexão com CORS; <img> usa outra
    document.head.append(link);
  }
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

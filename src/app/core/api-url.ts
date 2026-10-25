import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

/** Envia as chamadas /api para o endereço da API quando ela fica em outro domínio (ex.: Vercel). */
export const apiUrlInterceptor: HttpInterceptorFn = (req, next) =>
  environment.apiUrl && req.url.startsWith('/api/')
    ? next(req.clone({ url: environment.apiUrl + req.url }))
    : next(req);

import { Injectable, inject } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, EMPTY, timer, switchMap } from 'rxjs';
import { AuthService } from './auth';

/**
 * Baixa o código das outras páginas em segundo plano, logo depois que a primeira abre:
 * no clique, a página troca na hora em vez de esperar o download.
 * Telas da loja: para todo mundo. Telas do painel: só para quem está logado (o cliente não baixa o painel).
 */
@Injectable({ providedIn: 'root' })
export class SmartPreload implements PreloadingStrategy {
  private auth = inject(AuthService);

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    const kind = route.data?.['preload'];
    if (kind === 'store' || (kind === 'admin' && this.auth.loggedIn())) {
      // espera 1,5s para não disputar a internet com a página que acabou de abrir
      return timer(1500).pipe(switchMap(() => load()));
    }
    return EMPTY;
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, concat, from, of, switchMap, tap } from 'rxjs';
import { AuthService } from './auth';
import { shrinkImage } from './image-resize';
import { Dashboard, Order, OrderPage, OrderStatus, StoreSettings } from './models';

export type Resource = 'categories' | 'products' | 'promotions' | 'coupons' | 'combos' | 'banners' | 'users';

/** Chamadas do painel administrativo (o token é colocado pelo authInterceptor). */
@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = '/api/admin';

  // última resposta de cada lista, para a tela abrir na hora quando o lojista volta a ela
  private cache = new Map<string, unknown>();
  private cacheToken: string | null = null;

  /** Emite a última resposta guardada (se houver) e depois a resposta nova da API. */
  private cached<T>(key: string, request: Observable<T>): Observable<T> {
    if (this.cacheToken !== this.auth.token()) {
      // outro login: não mostra dados da sessão anterior
      this.cache.clear();
      this.cacheToken = this.auth.token();
    }
    const fresh = request.pipe(tap((value) => this.cache.set(key, value)));
    return this.cache.has(key) ? concat(of(this.cache.get(key) as T), fresh) : fresh;
  }

  // CRUD genérico: todos os cadastros do painel seguem o mesmo formato de URL
  list<T>(resource: Resource, params: Record<string, string> = {}) {
    const key = `${resource}?${new URLSearchParams(params)}`;
    return this.cached(key, this.http.get<T[]>(`${this.base}/${resource}`, { params }));
  }

  get<T>(resource: Resource, id: number) {
    return this.http.get<T>(`${this.base}/${resource}/${id}`);
  }

  save<T>(resource: Resource, body: unknown, id?: number | null) {
    return id
      ? this.http.put<T>(`${this.base}/${resource}/${id}`, body)
      : this.http.post<T>(`${this.base}/${resource}`, body);
  }

  remove(resource: Resource, id: number) {
    return this.http.delete<void>(`${this.base}/${resource}/${id}`);
  }

  upload(file: File) {
    return from(shrinkImage(file)).pipe(
      switchMap((image) => {
        const form = new FormData();
        form.append('file', image);
        return this.http.post<{ url: string }>(`${this.base}/uploads`, form);
      }),
    );
  }

  dashboard(days = 30) {
    return this.cached(`dashboard?${days}`, this.http.get<Dashboard>(`${this.base}/dashboard`, { params: { days } }));
  }

  orders(params: Record<string, string | number>) {
    const key = `orders?${new URLSearchParams(params as Record<string, string>)}`;
    return this.cached(key, this.http.get<OrderPage>(`${this.base}/orders`, { params }));
  }

  setOrderStatus(id: number, status: OrderStatus) {
    return this.http.patch<Order>(`${this.base}/orders/${id}/status`, { status });
  }

  changeMyPassword(current_password: string, new_password: string) {
    return this.http.post<{ access_token: string; name: string }>(`${this.base}/me/password`, {
      current_password,
      new_password,
    });
  }

  // verificação em duas etapas da conta logada
  mfaSetup() {
    return this.http.post<{ secret: string; otpauth_uri: string }>(`${this.base}/me/mfa/setup`, {});
  }

  mfaEnable(code: string) {
    return this.http.post<{ recovery_codes: string[]; access_token: string }>(`${this.base}/me/mfa/enable`, { code });
  }

  mfaDisable(password: string, code: string) {
    return this.http.post<{ access_token: string; name: string }>(`${this.base}/me/mfa/disable`, { password, code });
  }

  settings() {
    return this.http.get<StoreSettings>(`${this.base}/settings`);
  }

  saveSettings(body: StoreSettings) {
    return this.http.put<StoreSettings>(`${this.base}/settings`, body);
  }
}

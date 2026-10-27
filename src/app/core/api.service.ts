import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, concat, defer, filter, finalize, of, shareReplay, tap } from 'rxjs';
import {
  Combo,
  HomeData,
  Order,
  OrderRequest,
  ProductDetail,
  ProductFilters,
  ProductPage,
  Quote,
  QuoteRequest,
  WelcomeOffer,
  StoreSettings,
  Category,
} from './models';

// guardadas também no aparelho: na próxima visita, topo/rodapé e vitrine aparecem antes da rede responder
const PERSIST = new Set(['/api/store', '/api/home']);
const STORAGE_PREFIX = 'jc-cache:';

/** Chamadas públicas da vitrine. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // última resposta de cada consulta (texto JSON), para a página abrir na hora quando o cliente volta a ela
  private cache = new Map<string, string>();
  // consultas a caminho: se a pré-busca ainda não voltou quando a página abre, as duas usam o mesmo pedido
  private inFlight = new Map<string, Observable<unknown>>();

  /**
   * Mostra na hora a última resposta guardada e busca a nova em seguida. A nova só é emitida se mudou
   * alguma coisa, para a tela não piscar nem perder o que o cliente já escolheu (tamanho, cor...).
   */
  private cached<T>(key: string, request: Observable<T>): Observable<T> {
    return defer(() => {
      const saved = this.cache.get(key) ?? this.readStorage(key);
      let shared = this.inFlight.get(key) as Observable<T> | undefined;
      if (!shared) {
        shared = request.pipe(
          tap((value) => this.remember(key, value)),
          finalize(() => this.inFlight.delete(key)),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
        this.inFlight.set(key, shared);
      }
      const fresh = shared.pipe(filter((value) => JSON.stringify(value) !== saved));
      return saved ? concat(of(JSON.parse(saved) as T), fresh) : fresh;
    });
  }

  /** Busca antes do clique (dedo encostou no produto): quando a página abrir, os dados já estão aqui. */
  prefetchProduct(slug: string) {
    const key = `/api/products/${slug}`;
    if (!this.cache.has(key)) this.product(slug).subscribe({ error: () => {} });
  }

  private remember(key: string, value: unknown) {
    const text = JSON.stringify(value);
    this.cache.set(key, text);
    if (PERSIST.has(key)) {
      try {
        localStorage.setItem(STORAGE_PREFIX + key, text);
      } catch {
        // navegação anônima ou armazenamento cheio: funciona só com a memória
      }
    }
  }

  private readStorage(key: string) {
    if (!PERSIST.has(key)) return undefined;
    try {
      return localStorage.getItem(STORAGE_PREFIX + key) ?? undefined;
    } catch {
      return undefined;
    }
  }

  store() {
    return this.cached('/api/store', this.http.get<StoreSettings>('/api/store'));
  }

  home() {
    return this.cached('/api/home', this.http.get<HomeData>('/api/home'));
  }

  categories() {
    return this.cached('/api/categories', this.http.get<Category[]>('/api/categories'));
  }

  products(filters: Record<string, string | string[] | number | boolean | null | undefined>) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value === null || value === undefined || value === '' || value === false) continue;
      for (const v of Array.isArray(value) ? value : [value]) params = params.append(key, String(v));
    }
    return this.cached(`/api/products?${params}`, this.http.get<ProductPage>('/api/products', { params }));
  }

  productFilters() {
    return this.cached('/api/products/filters', this.http.get<ProductFilters>('/api/products/filters'));
  }

  product(slug: string) {
    return this.cached(`/api/products/${slug}`, this.http.get<ProductDetail>(`/api/products/${slug}`));
  }

  combos() {
    return this.cached('/api/combos', this.http.get<Combo[]>('/api/combos'));
  }

  quote(body: QuoteRequest) {
    return this.http.post<Quote>('/api/cart/quote', body);
  }

  placeOrder(body: OrderRequest) {
    return this.http.post<Order>('/api/orders', body);
  }

  /** POST: código e telefone vão no corpo, não na URL (URLs ficam em logs e históricos). */
  trackOrder(code: string, phone: string) {
    return this.http.post<Order>('/api/orders/track', { code, phone });
  }

  privacy() {
    return this.http.get<{ text: string; is_template: boolean }>('/api/privacy');
  }

  welcome() {
    return this.http.get<WelcomeOffer | null>('/api/welcome');
  }

  exchange() {
    return this.http.get<{ text: string; is_template: boolean }>('/api/exchange');
  }
}

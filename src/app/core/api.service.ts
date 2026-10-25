import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
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
  StoreSettings,
  Category,
} from './models';

/** Chamadas públicas da vitrine. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  store() {
    return this.http.get<StoreSettings>('/api/store');
  }

  home() {
    return this.http.get<HomeData>('/api/home');
  }

  categories() {
    return this.http.get<Category[]>('/api/categories');
  }

  products(filters: Record<string, string | string[] | number | boolean | null | undefined>) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value === null || value === undefined || value === '' || value === false) continue;
      for (const v of Array.isArray(value) ? value : [value]) params = params.append(key, String(v));
    }
    return this.http.get<ProductPage>('/api/products', { params });
  }

  productFilters() {
    return this.http.get<ProductFilters>('/api/products/filters');
  }

  product(slug: string) {
    return this.http.get<ProductDetail>(`/api/products/${slug}`);
  }

  combos() {
    return this.http.get<Combo[]>('/api/combos');
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
}

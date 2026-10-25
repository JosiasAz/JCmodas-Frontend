import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { StoreSettings } from './models';

/** Configurações públicas da loja (WhatsApp, frete, Pix...), carregadas uma vez. */
@Injectable({ providedIn: 'root' })
export class StoreService {
  private api = inject(ApiService);
  readonly settings = signal<StoreSettings | null>(null);

  readonly pixPercent = computed(() => this.settings()?.pix_discount_percent ?? 0);
  readonly maxInstallments = computed(() => this.settings()?.max_installments ?? 1);

  load() {
    this.api.store().subscribe((s) => this.settings.set(s));
  }

  pixPrice(price: number) {
    return price * (1 - this.pixPercent() / 100);
  }

  /** Link do WhatsApp da loja com uma mensagem pronta. */
  whatsappLink(message: string) {
    const phone = (this.settings()?.whatsapp || '').replace(/\D/g, '');
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }
}

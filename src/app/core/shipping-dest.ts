import { Injectable, computed, signal } from '@angular/core';

const KEY = 'jc-dest';

/** CEP de destino que o cliente já informou (carrinho e checkout compartilham). */
@Injectable({ providedIn: 'root' })
export class ShippingDest {
  readonly cep = signal('');
  readonly city = signal('');
  readonly state = signal('');

  readonly ready = computed(() => this.cep().replace(/\D/g, '').length === 8);

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved?.cep) {
        this.cep.set(saved.cep);
        this.city.set(saved.city || '');
        this.state.set(saved.state || '');
      }
    } catch {
      /* ignora */
    }
  }

  set(cep: string, city = '', state = '') {
    this.cep.set(cep);
    if (city) this.city.set(city);
    if (state) this.state.set(state.toUpperCase());
    this.persist();
  }

  setPlace(city: string, state: string) {
    this.city.set(city);
    this.state.set(state.toUpperCase());
    this.persist();
  }

  quoteFields() {
    const cep = this.cep().trim();
    return {
      cep: cep || undefined,
      city: this.city().trim() || undefined,
      state: this.state().trim() || undefined,
    };
  }

  private persist() {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ cep: this.cep(), city: this.city(), state: this.state() }),
      );
    } catch {
      /* navegação privada */
    }
  }
}

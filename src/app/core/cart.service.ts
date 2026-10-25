import { Injectable, computed, effect, signal } from '@angular/core';
import { Order, QuoteRequest } from './models';

/** Peça avulsa no carrinho. Guardamos nome/imagem só para exibir antes da API responder. */
export interface CartItem {
  product_id: number;
  variant_id: number;
  quantity: number;
  name: string;
  image: string | null;
  detail: string;
}

/** Combo no carrinho: um variant_id para cada peça do kit. */
export interface CartCombo {
  combo_id: number;
  quantity: number;
  variant_ids: number[];
  name: string;
}

interface CartState {
  items: CartItem[];
  combos: CartCombo[];
  coupon: string | null;
}

const STORAGE_KEY = 'jc-cart';
const LAST_ORDER_KEY = 'jc-last-order';

// mesmas chaves que a API devolve em QuoteLine.key
export const itemKey = (i: { variant_id: number }) => `p:${i.variant_id}`;
export const comboKey = (c: { combo_id: number; variant_ids: number[] }) =>
  `c:${c.combo_id}:${c.variant_ids.join(',')}`;

@Injectable({ providedIn: 'root' })
export class CartService {
  private state = signal<CartState>(this.load());

  readonly items = computed(() => this.state().items);
  readonly combos = computed(() => this.state().combos);
  readonly coupon = computed(() => this.state().coupon);
  readonly count = computed(
    () =>
      this.state().items.reduce((n, i) => n + i.quantity, 0) +
      this.state().combos.reduce((n, c) => n + c.quantity, 0),
  );
  readonly isEmpty = computed(() => this.count() === 0);

  /** Corpo pronto para /api/cart/quote e /api/orders. */
  readonly request = computed<QuoteRequest>(() => ({
    items: this.state().items.map(({ product_id, variant_id, quantity }) => ({ product_id, variant_id, quantity })),
    combos: this.state().combos.map(({ combo_id, quantity, variant_ids }) => ({ combo_id, quantity, variant_ids })),
    coupon_code: this.state().coupon,
  }));

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
      } catch {
        /* navegação privada: o carrinho só vive na sessão */
      }
    });
  }

  addItem(item: CartItem) {
    this.state.update((s) => {
      const found = s.items.find((i) => i.variant_id === item.variant_id);
      const items = found
        ? s.items.map((i) => (i === found ? { ...i, quantity: i.quantity + item.quantity } : i))
        : [...s.items, item];
      return { ...s, items };
    });
  }

  addCombo(combo: CartCombo) {
    this.state.update((s) => {
      const key = comboKey(combo);
      const found = s.combos.find((c) => comboKey(c) === key);
      const combos = found
        ? s.combos.map((c) => (c === found ? { ...c, quantity: c.quantity + combo.quantity } : c))
        : [...s.combos, combo];
      return { ...s, combos };
    });
  }

  /** Altera a quantidade de uma linha (pela chave da API). Quantidade 0 remove. */
  setQuantity(key: string, quantity: number) {
    this.state.update((s) => ({
      ...s,
      items: s.items
        .map((i) => (itemKey(i) === key ? { ...i, quantity } : i))
        .filter((i) => i.quantity > 0),
      combos: s.combos
        .map((c) => (comboKey(c) === key ? { ...c, quantity } : c))
        .filter((c) => c.quantity > 0),
    }));
  }

  /** Remove do carrinho o que a API não reconheceu (produto desativado, combo alterado...). */
  keepOnly(keys: string[]) {
    const valid = new Set(keys);
    this.state.update((s) => ({
      ...s,
      items: s.items.filter((i) => valid.has(itemKey(i))),
      combos: s.combos.filter((c) => valid.has(comboKey(c))),
    }));
  }

  setCoupon(code: string | null) {
    this.state.update((s) => ({ ...s, coupon: code?.trim().toUpperCase() || null }));
  }

  clear() {
    this.state.set({ items: [], combos: [], coupon: null });
  }

  saveLastOrder(order: Order) {
    try {
      sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
    } catch {
      /* ignora */
    }
  }

  lastOrder(): Order | null {
    try {
      return JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY) || 'null');
    } catch {
      return null;
    }
  }

  private load(): CartState {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved?.items && saved?.combos) return saved;
    } catch {
      /* ignora carrinho corrompido */
    }
    return { items: [], combos: [], coupon: null };
  }
}

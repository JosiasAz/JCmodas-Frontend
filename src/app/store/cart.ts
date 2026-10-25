import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { CartService } from '../core/cart.service';
import { Quote } from '../core/models';
import { StoreService } from '../core/store.service';
import { Icon } from '../shared/icon';
import { MoneyPipe } from '../shared/money.pipe';
import { CartTotals } from './cart-totals';
import { ImgPipe } from '../shared/img.pipe';

@Component({
  selector: 'app-cart',
  imports: [FormsModule, RouterLink, Icon, MoneyPipe, CartTotals, ImgPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart {
  private api = inject(ApiService);
  protected cart = inject(CartService);
  protected store = inject(StoreService);

  protected quote = signal<Quote | null>(null);
  protected loading = signal(false);
  protected couponInput = this.cart.coupon() ?? '';

  protected freeShippingProgress = computed(() => {
    const q = this.quote();
    const min = this.store.settings()?.free_shipping_min ?? 0;
    if (!q || !min) return null;
    return Math.min(100, ((min - q.free_shipping_missing) / min) * 100);
  });

  constructor() {
    // recalcula no servidor sempre que o carrinho muda (preços, promoções e estoque sempre atualizados)
    effect((onCleanup) => {
      const request = this.cart.request();
      if (this.cart.isEmpty()) {
        this.quote.set(null);
        return;
      }
      this.loading.set(true);
      const sub = this.api.quote({ ...request, payment_method: 'cartao', delivery_method: 'entrega' }).subscribe({
        next: (q) => {
          this.quote.set(q);
          this.loading.set(false);
          const keys = q.lines.map((l) => l.key);
          if (keys.length < request.items.length + request.combos.length) this.cart.keepOnly(keys);
        },
        error: () => this.loading.set(false),
      });
      onCleanup(() => sub.unsubscribe());
    });
  }

  applyCoupon() {
    this.cart.setCoupon(this.couponInput);
  }

  removeCoupon() {
    this.couponInput = '';
    this.cart.setCoupon(null);
  }
}

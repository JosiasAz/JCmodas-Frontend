import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { CartService } from '../core/cart.service';
import { ProductDetail, Variant } from '../core/models';
import { StoreService } from '../core/store.service';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import { MoneyPipe } from '../shared/money.pipe';
import { ProductCard } from '../shared/product-card';
import { ImgPipe } from '../shared/img.pipe';

const MIN_INSTALLMENT = 30;
const LOW_STOCK = 3;

@Component({
  selector: 'app-product-page',
  imports: [RouterLink, Icon, MoneyPipe, ProductCard, ImgPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-page.html',
  styleUrl: './product-page.scss',
})
export class ProductPage {
  private api = inject(ApiService);
  private cart = inject(CartService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private title = inject(Title);
  protected store = inject(StoreService);

  readonly slug = input.required<string>();

  protected detail = signal<ProductDetail | null>(null);
  protected notFound = signal(false);
  protected image = signal(0);
  protected color = signal<string | null>(null);
  protected variant = signal<Variant | null>(null);
  protected quantity = signal(1);
  protected sizeError = signal(false);

  protected product = computed(() => this.detail()?.product);
  protected colors = computed(() => [
    ...new Set((this.product()?.variants ?? []).map((v) => v.color).filter((c): c is string => !!c)),
  ]);
  protected sizes = computed(() =>
    (this.product()?.variants ?? []).filter((v) => !this.colors().length || v.color === this.color()),
  );
  protected installments = computed(() => {
    const price = this.product()?.final_price ?? 0;
    const n = Math.min(this.store.maxInstallments(), Math.floor(price / MIN_INSTALLMENT));
    return n > 1 ? { n, value: price / n } : null;
  });
  // o % já aparece no selo vermelho; evita "-20%" e "20% OFF" lado a lado
  protected badges = computed(() => {
    const p = this.product();
    return (p?.badges ?? []).filter((b) => !(p?.discount_percent && /%/.test(b)));
  });
  protected cartHint = computed(() => this.product()?.badges.find((b) => /leve/i.test(b)));
  protected maxQty = computed(() => this.variant()?.stock ?? 1);
  protected lowStock = LOW_STOCK;

  protected whatsappLink = computed(() => {
    const p = this.product();
    if (!p) return '';
    const size = this.variant() ? ` no tamanho ${this.variant()!.size}` : '';
    return this.store.whatsappLink(`Olá! Tenho interesse no produto "${p.name}"${size}. Ainda tem disponível?`);
  });

  constructor() {
    effect((onCleanup) => {
      const slug = this.slug();
      this.detail.set(null);
      this.notFound.set(false);
      const request = this.api.product(slug).subscribe({
        next: (d) => {
          this.detail.set(d);
          this.image.set(0);
          this.quantity.set(1);
          this.variant.set(null);
          this.color.set(d.product.variants.find((v) => v.stock > 0)?.color ?? d.product.variants[0]?.color ?? null);
          this.title.setTitle(`${d.product.name} | JC Moda`);
          // produto de tamanho único já vem selecionado
          const inStock = d.product.variants.filter((v) => v.stock > 0);
          if (d.product.variants.length === 1 && inStock.length === 1) this.variant.set(inStock[0]);
        },
        error: () => this.notFound.set(true),
      });
      onCleanup(() => request.unsubscribe());
    });
  }

  pickColor(color: string) {
    this.color.set(color);
    this.variant.set(null);
  }

  pickSize(v: Variant) {
    if (!v.stock) return;
    this.variant.set(v);
    this.sizeError.set(false);
    this.quantity.set(Math.min(this.quantity(), v.stock));
  }

  changeQty(delta: number) {
    this.quantity.update((q) => Math.max(1, Math.min(this.maxQty(), q + delta)));
  }

  add(goToCheckout = false) {
    const p = this.product();
    const v = this.variant();
    if (!p) return;
    if (!v) {
      this.sizeError.set(true);
      return;
    }
    this.cart.addItem({
      product_id: p.id,
      variant_id: v.id!,
      quantity: this.quantity(),
      name: p.name,
      image: p.images[0] ?? null,
      detail: `Tam. ${v.size}${v.color ? ' · ' + v.color : ''}`,
    });
    if (goToCheckout) {
      this.router.navigate(['/checkout']);
    } else {
      this.toast.show(`${p.name} adicionado ao carrinho`, 'ok', { label: 'Ver carrinho', link: '/carrinho' });
    }
  }
}

import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { ApiService } from '../core/api.service';
import { CartService, ORDERED_KEY } from '../core/cart.service';
import { WelcomeOffer } from '../core/models';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import { MoneyPipe } from '../shared/money.pipe';

const VISIT_KEY = 'jc-visit'; // sessionStorage: já passou por aqui nesta visita
const WELCOME_KEY = 'jc-welcome-seen'; // localStorage: quando o pop-up de boas-vindas apareceu

const WELCOME_DELAY_MS = 40_000; // abrir na chegada aumenta a rejeição: espera 40 s ou a 2ª página
const WELCOME_EVERY_DAYS = 7;
const CART_DELAY_MS = 2_500;
// onde o aviso atrapalharia a compra
const BUSY_PAGES = /^\/(carrinho|checkout|pedido)(\/|\?|$)/;

/**
 * Avisos discretos na parte de baixo da tela (nunca no carrinho/checkout):
 * - carrinho esquecido: ao voltar ao site com itens no carrinho, uma vez por visita;
 * - boas-vindas: o cupom escolhido no painel, depois de 40 s ou na 2ª página, no máximo 1 vez a cada 7 dias.
 */
@Component({
  selector: 'app-store-nudges',
  imports: [RouterLink, Icon, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shown(); as kind) {
      <aside class="nudge" role="dialog" [attr.aria-label]="kind === 'cart' ? 'Carrinho' : 'Cupom de boas-vindas'">
        <button type="button" class="icon-btn close" (click)="close()" aria-label="Fechar"><app-icon name="x" [size]="18" /></button>
        @if (kind === 'cart') {
          <app-icon name="bag" [size]="26" />
          <div>
            <b>Você deixou {{ cart.count() === 1 ? '1 item' : cart.count() + ' itens' }} no carrinho</b>
            <p>{{ cart.items()[0]?.name || 'Seus produtos' }} ainda {{ cart.count() === 1 ? 'está' : 'estão' }} te esperando.</p>
            <a routerLink="/carrinho" class="btn block" (click)="close()">Ver carrinho</a>
          </div>
        } @else if (offer(); as o) {
          <app-icon name="gift" [size]="26" />
          <div>
            <b>Primeira compra? {{ o.offer }}</b>
            <p>Use o cupom <span class="code">{{ o.code }}</span>@if (o.min_order) { em compras acima de {{ o.min_order | money }}}.</p>
            <button type="button" class="btn block" (click)="useCoupon(o)">Usar cupom</button>
          </div>
        }
      </aside>
    }
  `,
  styles: `
    .nudge { position: fixed; z-index: 70; left: 12px; right: 12px; bottom: calc(12px + env(safe-area-inset-bottom));
      display: flex; gap: 14px; align-items: flex-start; max-width: 420px; margin-left: auto;
      padding: 18px 18px 16px; background: #fff; border: 1px solid var(--line); border-radius: 16px;
      box-shadow: 0 12px 40px rgb(0 0 0 / .18); animation: rise .25s ease-out;
      > app-icon { flex-shrink: 0; margin-top: 2px; }
      > div { flex: 1; min-width: 0; padding-right: 28px; }
      b { display: block; font-size: 1.02rem; }
      p { margin: 4px 0 12px; color: var(--ink-2); font-size: .92rem; } }
    .close { position: absolute; top: 4px; right: 4px; }
    .code { padding: 2px 8px; border: 1.5px dashed var(--ink); border-radius: 6px; font-weight: 700; letter-spacing: .04em; }
  `,
})
export class StoreNudges {
  protected cart = inject(CartService);
  private api = inject(ApiService);
  private router = inject(Router);
  private toast = inject(ToastService);

  protected shown = signal<'cart' | 'welcome' | null>(null);
  protected offer = signal<WelcomeOffer | null>(null);
  private pageViews = 0;
  private welcomeTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    const firstOfVisit = !read(sessionStorage, VISIT_KEY);
    write(sessionStorage, VISIT_KEY, '1');

    // carrinho esquecido: só quando a pessoa volta ao site (não a cada página)
    if (firstOfVisit && !this.cart.isEmpty()) {
      setTimeout(() => this.show('cart'), CART_DELAY_MS);
    } else if (this.welcomeAllowed()) {
      this.api.welcome().subscribe({
        next: (offer) => {
          if (!offer) return;
          this.offer.set(offer);
          this.welcomeTimer = setTimeout(() => this.show('welcome'), WELCOME_DELAY_MS);
        },
        error: () => undefined,
      });
    }

    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => {
        if (BUSY_PAGES.test(this.router.url)) this.shown.set(null);
        // 2ª página vista: a pessoa está engajada, pode oferecer o cupom
        if (++this.pageViews === 2 && this.offer()) this.show('welcome');
      });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.welcomeTimer));
  }

  private welcomeAllowed() {
    if (read(localStorage, ORDERED_KEY)) return false;
    const seen = Number(read(localStorage, WELCOME_KEY) || 0);
    return Date.now() - seen > WELCOME_EVERY_DAYS * 24 * 60 * 60 * 1000;
  }

  private show(kind: 'cart' | 'welcome') {
    if (this.shown() || BUSY_PAGES.test(this.router.url)) return;
    if (kind === 'welcome') {
      // a pessoa pode ter aplicado um cupom ou comprado enquanto navegava
      if (!this.offer() || this.cart.coupon() || !this.welcomeAllowed()) return;
      clearTimeout(this.welcomeTimer);
      write(localStorage, WELCOME_KEY, String(Date.now()));
    }
    this.shown.set(kind);
  }

  close() {
    this.shown.set(null);
  }

  useCoupon(offer: WelcomeOffer) {
    this.cart.setCoupon(offer.code);
    this.toast.show(`Cupom ${offer.code} aplicado: o desconto aparece no carrinho`);
    this.close();
  }
}

function read(storage: Storage, key: string) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function write(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    /* navegação privada: o aviso só deixa de lembrar que já apareceu */
  }
}

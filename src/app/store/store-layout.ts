import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth';
import { CartService } from '../core/cart.service';
import { StoreService } from '../core/store.service';
import { formatCnpj } from '../shared/br-format';
import { Icon } from '../shared/icon';
import { StoreNudges } from './store-nudges';
import { MoneyPipe } from '../shared/money.pipe';

@Component({
  selector: 'app-store-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, Icon, MoneyPipe, StoreNudges],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './store-layout.html',
  styleUrl: './store-layout.scss',
  host: { '(document:keydown.escape)': 'closeAll()' },
})
export class StoreLayout {
  protected cart = inject(CartService);
  protected store = inject(StoreService);
  private router = inject(Router);

  protected search = '';
  protected searchOpen = signal(false);
  protected menuOpen = signal(false);
  protected hideWhatsappFloat = signal(false);
  protected auth = inject(AuthService);
  protected year = new Date().getFullYear();
  private searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  protected nav = [
    { label: 'Início', link: '/', exact: true, query: null, icon: 'store' },
    { label: 'Loja', link: '/loja', exact: true, query: null, icon: 'grid' },
    { label: 'Promoções', link: '/loja', exact: false, query: { promo: 1 }, icon: 'tag' },
    { label: 'Combos', link: '/combos', exact: false, query: null, icon: 'gift' },
    { label: 'Meu pedido', link: '/rastrear', exact: false, query: null, icon: 'box' },
  ];

  protected whatsappHelp = computed(() =>
    this.store.whatsappLink('Olá! Vim pelo site da JC Moda e gostaria de ajuda.'),
  );

  protected cnpjText = computed(() => formatCnpj(this.store.settings()?.cnpj || ''));
  protected sellerLabel = computed(() => (this.auth.loggedIn() ? 'Painel da loja' : 'Área do lojista'));

  constructor() {
    // fecha menu e busca ao trocar de página
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((e) => {
        this.closeAll();
        this.hideWhatsappFloat.set(/^\/(carrinho|checkout|pedido)(\/|\?|$)/.test((e as NavigationEnd).urlAfterRedirects));
      });
  }

  toggleSearch() {
    this.menuOpen.set(false);
    this.searchOpen.update((open) => !open);
    if (this.searchOpen()) setTimeout(() => this.searchInput()?.nativeElement.focus());
  }

  toggleMenu() {
    this.searchOpen.set(false);
    this.menuOpen.update((open) => !open);
  }

  closeAll() {
    this.searchOpen.set(false);
    this.menuOpen.set(false);
  }

  submitSearch() {
    const q = this.search.trim();
    this.router.navigate(['/loja'], { queryParams: q ? { q } : {} });
    this.closeAll();
  }
}

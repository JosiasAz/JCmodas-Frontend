import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { HomeData } from '../core/models';
import { StoreService } from '../core/store.service';
import { BannerLink } from '../shared/banner-link';
import { Icon } from '../shared/icon';
import { MoneyPipe } from '../shared/money.pipe';
import { ProductCard } from '../shared/product-card';

@Component({
  selector: 'app-home',
  imports: [RouterLink, Icon, MoneyPipe, ProductCard, BannerLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected store = inject(StoreService);
  protected data = signal<HomeData | null>(null);
  protected slide = signal(0);

  protected heroes = computed(() => this.data()?.banners.hero ?? []);
  /** Loja recém-instalada: nada cadastrado ainda. */
  protected isEmpty = computed(() => {
    const d = this.data();
    return !!d && !d.categories.length && !d.best_sellers.length && !d.combos.length &&
      !Object.values(d.banners).some((list) => list.length);
  });
  protected whatsappLink = computed(() => this.store.whatsappLink('Olá! Vim pelo site da JC Moda.'));

  constructor() {
    inject(ApiService)
      .home()
      .subscribe((d) => this.data.set(d));

    // troca o banner a cada 6 segundos
    const timer = setInterval(() => this.next(), 6000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  next() {
    const total = this.heroes().length;
    if (total) this.slide.update((i) => (i + 1) % total);
  }

  prev() {
    const total = this.heroes().length;
    if (total) this.slide.update((i) => (i - 1 + total) % total);
  }
}

import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { ApiService } from '../core/api.service';
import { Category, ProductFilters, ProductPage } from '../core/models';
import { Icon } from '../shared/icon';
import { ProductCard } from '../shared/product-card';

const SORTS = [
  { value: 'relevance', label: 'Mais relevantes' },
  { value: 'best_sellers', label: 'Mais vendidos' },
  { value: 'newest', label: 'Novidades' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
  { value: 'discount', label: 'Maior desconto' },
];

const PRICE_RANGES = [
  { label: 'Até R$ 60', min: null, max: 60 },
  { label: 'R$ 60 a R$ 120', min: 60, max: 120 },
  { label: 'R$ 120 a R$ 200', min: 120, max: 200 },
  { label: 'Acima de R$ 200', min: 200, max: null },
];

@Component({
  selector: 'app-catalog',
  imports: [FormsModule, RouterLink, Icon, ProductCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
})
export class Catalog {
  private api = inject(ApiService);
  private router = inject(Router);
  private title = inject(Title);

  protected sorts = SORTS;
  protected priceRanges = PRICE_RANGES;
  protected categories = signal<Category[]>([]);
  protected filters = signal<ProductFilters | null>(null);
  protected page = signal<ProductPage | null>(null);
  protected loading = signal(true);
  protected showFilters = signal(false);

  private params = toSignal(inject(ActivatedRoute).queryParamMap, { requireSync: true });

  // estado dos filtros vem sempre da URL (dá para compartilhar o link filtrado)
  protected q = computed(() => this.params().get('q') ?? '');
  protected category = computed(() => this.params().get('categoria') ?? '');
  protected sizes = computed(() => this.params().getAll('tamanho'));
  protected colors = computed(() => this.params().getAll('cor'));
  protected promo = computed(() => this.params().has('promo'));
  protected sort = computed(() => this.params().get('ordem') ?? 'relevance');
  protected min = computed(() => this.params().get('min'));
  protected max = computed(() => this.params().get('max'));
  protected pageNumber = computed(() => Number(this.params().get('pagina') ?? 1));

  protected heading = computed(() => {
    if (this.q()) return `Resultados para "${this.q()}"`;
    if (this.promo()) return 'Promoções';
    return this.categories().find((c) => c.slug === this.category())?.name ?? 'Todos os produtos';
  });

  protected activeCount = computed(
    () =>
      this.sizes().length + this.colors().length + (this.category() ? 1 : 0) + (this.promo() ? 1 : 0) +
      (this.min() || this.max() ? 1 : 0),
  );

  constructor() {
    this.api.categories().subscribe((c) => this.categories.set(c));
    this.api.productFilters().subscribe((f) => this.filters.set(f));

    effect((onCleanup) => {
      this.title.setTitle(`${this.heading()} | JC Moda`);
      this.loading.set(true);
      const request = this.api
        .products({
          q: this.q(),
          category: this.category(),
          size: this.sizes(),
          color: this.colors(),
          on_sale: this.promo(),
          sort: this.sort(),
          min_price: this.min(),
          max_price: this.max(),
          page: this.pageNumber(),
          page_size: 12,
        })
        .subscribe((p) => {
          this.page.set(p);
          this.loading.set(false);
        });
      onCleanup(() => request.unsubscribe()); // filtro mudou antes da resposta: descarta a antiga
    });
  }

  /** Atualiza um ou mais filtros na URL (e volta para a página 1). */
  set(changes: Record<string, string | string[] | number | null>) {
    this.router.navigate([], {
      queryParams: { pagina: null, ...changes },
      queryParamsHandling: 'merge',
    });
  }

  toggle(key: 'tamanho' | 'cor', value: string) {
    const current = key === 'tamanho' ? this.sizes() : this.colors();
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    this.set({ [key]: next.length ? next : null });
  }

  isRange(r: { min: number | null; max: number | null }) {
    return String(r.min ?? '') === (this.min() ?? '') && String(r.max ?? '') === (this.max() ?? '');
  }

  setRange(r: { min: number | null; max: number | null }) {
    this.set(this.isRange(r) ? { min: null, max: null } : { min: r.min, max: r.max });
  }

  goTo(page: number) {
    this.set({ pagina: page > 1 ? page : null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  clearAll() {
    this.router.navigate([], { queryParams: this.q() ? { q: this.q() } : {} });
  }
}

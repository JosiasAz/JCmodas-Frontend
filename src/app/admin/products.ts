import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Category, Product, Variant } from '../core/models';
import { Icon } from '../shared/icon';
import { MoneyPipe } from '../shared/money.pipe';
import { CrudPage } from './crud-page';
import { ImageInput } from './image-input';
import { Pager } from './pager';

const GRIDS = [
  { label: 'P ao GG', sizes: ['P', 'M', 'G', 'GG'] },
  { label: 'P ao XG', sizes: ['P', 'M', 'G', 'GG', 'XG'] },
  { label: '38 ao 46', sizes: ['38', '40', '42', '44', '46'] },
  { label: 'Único', sizes: ['U'] },
];

@Component({
  selector: 'app-products',
  imports: [FormsModule, Icon, MoneyPipe, ImageInput, Pager],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './products.html',
  styles: `
    .name { font-weight: 600; display: block; }
    .stock-zero { color: var(--sale); font-weight: 600; }
    .images { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px; }
    .img { position: relative; width: 84px; height: 104px; border-radius: 8px; overflow: hidden; background: var(--sand);
      border: 2px solid transparent;
      &.cover { border-color: var(--ink); }
      img { width: 100%; height: 100%; object-fit: cover; }
      .tools { position: absolute; inset: auto 0 0; display: flex; justify-content: space-between; padding: 3px;
        background: rgb(255 255 255 / .9); }
      button { border: 0; background: none; cursor: pointer; font-size: .7rem; font-weight: 600; padding: 2px 4px; }
      .tag { position: absolute; top: 4px; left: 4px; font-size: .62rem; }
    }
    .grid-buttons { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 10px; }
    .variants { width: 100%; border-collapse: collapse; margin-bottom: 8px;
      th { text-align: left; font-size: .75rem; color: var(--muted); padding: 4px 6px; }
      td { padding: 4px 6px; }
      .input { min-height: 38px; padding: 6px 10px; } }
    .flags { display: flex; gap: 18px; flex-wrap: wrap; margin: 6px 0 12px; }
    .total-stock { font-size: .85rem; color: var(--muted); }
  `,
})
export class Products extends CrudPage<Product> {
  protected resource = 'products' as const;
  protected override noun = 'Produto';
  protected grids = GRIDS;
  protected categories = signal<Category[]>([]);
  protected search = signal('');
  protected categoryFilter = signal<number | null>(null);
  protected gridColor = '';

  /** ?editar=ID abre o produto direto (link do alerta de estoque baixo) */
  readonly editar = input<string>();

  protected filtered = computed(() => {
    const q = this.search().toLowerCase();
    const cat = this.categoryFilter();
    return (this.items() ?? []).filter(
      (p) => (!q || p.name.toLowerCase().includes(q)) && (!cat || p.category_id === cat),
    );
  });

  protected override rows() {
    return this.filtered();
  }

  override ngOnInit() {
    super.ngOnInit();
    this.api.list<Category>('categories').subscribe((c) => this.categories.set(c));
    const id = Number(this.editar());
    if (id) this.api.get<Product>('products', id).subscribe((p) => this.open(p));
  }

  protected blank() {
    return {
      id: null,
      name: '',
      description: '',
      price: null,
      compare_at_price: null,
      category_id: this.categoryFilter(),
      images: [] as string[],
      featured: false,
      is_new: true,
      active: true,
      variants: [] as Variant[],
    };
  }

  protected override toPayload(form: any) {
    return {
      ...form,
      compare_at_price: form.compare_at_price || null,
      variants: form.variants.filter((v: Variant) => v.size?.trim()),
    };
  }

  totalStock(form: any) {
    return form.variants.reduce((n: number, v: Variant) => n + (Number(v.stock) || 0), 0);
  }

  addGrid(form: any, sizes: string[]) {
    const color = this.gridColor.trim() || null;
    for (const size of sizes) {
      const exists = form.variants.some((v: Variant) => v.size === size && (v.color || null) === color);
      if (!exists) form.variants.push({ size, color, stock: 0 });
    }
  }

  addVariant(form: any) {
    form.variants.push({ size: '', color: this.gridColor.trim() || null, stock: 0 });
  }

  makeCover(form: any, index: number) {
    const [img] = form.images.splice(index, 1);
    form.images.unshift(img);
  }

  toggleActive(p: Product) {
    const body = { ...p, active: !p.active };
    this.api.save<Product>('products', body, p.id).subscribe(() => {
      this.toast.show(body.active ? 'Produto visível na loja' : 'Produto escondido da loja');
      this.load();
    });
  }
}

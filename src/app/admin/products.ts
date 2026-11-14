import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Category, Product, Variant } from '../core/models';
import { Icon } from '../shared/icon';
import { MoneyPipe } from '../shared/money.pipe';
import { errorMessage } from '../core/auth';
import { CrudPage } from './crud-page';
import { ImageInput } from './image-input';
import { Pager } from './pager';
import { ImgPipe } from '../shared/img.pipe';
import { detectColor } from '../core/color-detect';

const GRIDS = [
  { label: 'P ao GG', sizes: ['P', 'M', 'G', 'GG'] },
  { label: 'P ao XG', sizes: ['P', 'M', 'G', 'GG', 'XG'] },
  { label: '38 ao 46', sizes: ['38', '40', '42', '44', '46'] },
  { label: 'Único', sizes: ['U'] },
];

@Component({
  selector: 'app-products',
  imports: [FormsModule, NgTemplateOutlet, RouterLink, RouterLinkActive, Icon, MoneyPipe, ImageInput, Pager, ImgPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './products.html',
  // clicar fora fecha o menu "Planilha"
  host: { '(document:click)': 'closeSheetMenu($event)' },
  styles: `
    .name { font-weight: 600; display: block; }
    .stock-zero { color: var(--sale); font-weight: 600; }
    .no-photo { display: inline-grid; place-items: center; background: var(--sand); color: var(--muted); }
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
    .head-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; justify-content: flex-end;
      > * { flex: none; } label { cursor: pointer; } }
    .sheet-menu { position: relative;
      summary { list-style: none; &::-webkit-details-marker { display: none; } }
      &[open] summary { background: var(--sand); color: var(--ink); }
      .menu { position: absolute; right: 0; top: calc(100% + 6px); z-index: 30; width: 290px; padding: 6px;
        background: #fff; border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 12px 32px rgb(0 0 0 / .12); }
      .item { display: flex; gap: 12px; align-items: flex-start; width: 100%; padding: 10px 12px; border: 0; border-radius: 10px;
        background: none; text-align: left; font: inherit; color: var(--ink); cursor: pointer;
        &:hover { background: var(--sand); }
        app-icon { margin-top: 2px; flex: none; }
        span { display: grid; gap: 2px; }
        small { color: var(--muted); font-size: .8rem; } } }
    .fab { display: none; }
    .grid-buttons { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 10px 0; }
    .color-hint { font-size: .82rem; color: var(--muted); margin: 0 0 10px; }
    .variants-foot { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 4px 4px 12px; border-radius: 999px;
      background: var(--sand); font-weight: 600; font-size: .88rem;
      button { display: grid; place-items: center; width: 28px; height: 28px; border: 0; border-radius: 50%; background: none; cursor: pointer; } }
    .add-color { display: flex; gap: 6px; flex-wrap: wrap; .input { width: 180px; min-height: 36px; } }
    .color-cards { display: grid; gap: 12px; }
    .color-card { border: 1px solid var(--line, #ddd); border-radius: 12px; padding: 12px; display: grid; gap: 10px; min-width: 0; }
    .card-head { display: flex; align-items: center; gap: 8px; justify-content: space-between;
      h4 { margin: 0; font-size: 1rem; }
      .color-name { flex: 1; max-width: 260px; min-height: 38px; font-weight: 600; } }
    .color-card .images { margin-bottom: 0; }
    .sizes { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .size { display: inline-flex; align-items: center; border: 1px solid var(--line, #ddd); border-radius: 8px; overflow: hidden;
      &.on { border-color: var(--ink); }
      .stock { width: 64px; min-height: 36px; padding: 4px 6px; border: 0; border-left: 1px solid var(--line, #ddd); border-radius: 0; } }
    .size-toggle { min-width: 44px; min-height: 36px; padding: 0 10px; border: 0; background: none; cursor: pointer; font-weight: 600; }
    .size.on .size-toggle { background: var(--ink); color: #fff; }
    .add-size { display: inline-flex; gap: 4px; align-items: center; .input { width: 80px; min-height: 36px; } }
    @media (pointer: coarse) {
      .size-toggle, .size .stock, .add-size .input, .add-color .input, .card-head .color-name, .chip button { min-height: 44px; }
      .chip button { width: 44px; }
    }
    .flags { display: flex; gap: 18px; flex-wrap: wrap; margin: 6px 0 12px; }
    .total-stock { font-size: .85rem; color: var(--muted); }
    @media (max-width: 720px) {
      :host { display: block; padding-bottom: 56px; } /* o último cartão não fica atrás do botão da câmera */
      .page-head > div:first-child { flex: 1 1 160px; }
      .head-actions .photo, .head-actions .xls { display: none; } /* planilha é trabalho de computador */
      .head-actions .new { min-height: 44px; padding: 0 14px; font-size: .88rem; background: transparent; color: var(--ink); }
      .fab { position: fixed; z-index: 50; right: 16px; bottom: calc(76px + env(safe-area-inset-bottom));
        display: grid; place-items: center; width: 56px; height: 56px; border-radius: 50%; cursor: pointer;
        background: var(--ink); color: #fff; box-shadow: 0 6px 20px rgb(0 0 0 / .25); -webkit-tap-highlight-color: transparent;
        &:active { transform: scale(.95); } }
      .images { display: grid; grid-template-columns: repeat(3, 1fr); }
      .img { width: auto; height: auto; aspect-ratio: 4 / 5;
        button { padding: 6px 8px; font-size: .78rem; } }
      .add-color { flex-basis: 100%; .input { flex: 1; width: auto; } }
      .flags { flex-direction: column; gap: 12px; }
    }
  `,
})
export class Products extends CrudPage<Product> {
  protected override removeHint =
    'Ele sai da loja e do painel. Pedidos antigos continuam mostrando o que foi comprado.';
  protected resource = 'products' as const;
  protected override noun = 'Produto';
  protected grids = GRIDS;
  protected categories = signal<Category[]>([]);
  protected search = signal('');
  protected categoryFilter = signal<number | null>(null);
  /** Fotos do atalho "Cadastrar com fotos" ainda subindo. */
  protected photoUploads = signal(0);
  protected importing = signal(false);

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
      image_colors: {} as Record<string, string>,
      featured: false,
      is_new: true,
      active: true,
      variants: [] as Variant[],
    };
  }

  protected override toForm(item: Product) {
    const form = { ...structuredClone(item), image_colors: { ...item.image_colors } };
    // guarda o estoque de agora: se alguém comprar enquanto o formulário está aberto, a venda não some
    form.variants = form.variants.map((v: Variant) => ({ ...v, stock_before: v.stock }));
    return form;
  }

  /** cartões de cor do formulário (null = "Sem cor") */
  protected colors = signal<(string | null)[]>([null]);
  /** tamanhos mostrados como botões em cada cor */
  protected sizeOptions = signal<string[]>([]);
  /** variantes desmarcadas nesta edição: remarcar devolve a mesma (com id e estoque) */
  private removed = new Map<string, Variant>();

  override open(item?: Product) {
    super.open(item);
    const d = this.draft();
    const named = [...new Set([...this.colorsOf(d), ...(Object.values(d.image_colors ?? {}) as string[])])];
    const hasNull = !named.length || d.variants.some((v: Variant) => !this.colorOf(v));
    this.colors.set(hasNull ? [null, ...named] : named);
    const used = this.sizesOf(d.variants);
    this.sizeOptions.set(used.length ? used : this.suggestedSizes(d.category_id));
    this.removed.clear();
  }

  private colorOf(v: Variant) {
    return v.color?.trim() || null;
  }

  private sizesOf(variants: Variant[]): string[] {
    return [...new Set(variants.map((v) => v.size?.trim()).filter(Boolean))];
  }

  /** cores já cadastradas nos tamanhos, na ordem em que aparecem */
  colorsOf(form: any): string[] {
    return [...new Set<string>(form.variants.map((v: Variant) => this.colorOf(v)).filter(Boolean))];
  }

  /** grade do último produto cadastrado na mesma categoria; senão P M G GG */
  private suggestedSizes(categoryId: number | null): string[] {
    const last = (this.items() ?? [])
      .filter((p) => categoryId && p.category_id === categoryId && p.variants?.length)
      .sort((a, b) => b.id - a.id)[0];
    const sizes = last ? this.sizesOf(last.variants) : [];
    return sizes.length ? sizes : GRIDS[0].sizes;
  }

  /** produto novo ainda sem tamanho marcado: trocar a categoria troca a grade sugerida */
  onCategory(d: any) {
    if (!d.id && !d.variants.length) this.sizeOptions.set(this.suggestedSizes(d.category_id));
  }

  useGrid(sizes: string[]) {
    this.sizeOptions.update((cur) => [...new Set([...sizes, ...cur])]);
  }

  variantOf(d: any, color: string | null, size: string): Variant | undefined {
    return d.variants.find((v: Variant) => this.colorOf(v) === color && v.size?.trim() === size);
  }

  toggleSize(d: any, color: string | null, size: string) {
    const key = `${color}|${size}`;
    const v = this.variantOf(d, color, size);
    if (v) {
      this.removed.set(key, v);
      d.variants.splice(d.variants.indexOf(v), 1);
    } else {
      d.variants.push(this.removed.get(key) ?? { size, color, stock: 0 });
      this.removed.delete(key);
    }
  }

  addSize(d: any, color: string | null, input: HTMLInputElement) {
    const size = input.value.trim();
    input.value = '';
    if (!size) return;
    if (!this.sizeOptions().includes(size)) this.sizeOptions.update((list) => [...list, size]);
    if (!this.variantOf(d, color, size)) this.toggleSize(d, color, size);
  }

  addColor(d: any, input: HTMLInputElement) {
    const color = input.value.trim();
    if (!color) return;
    if (this.colors().some((c) => c?.toLowerCase() === color.toLowerCase())) {
      this.toast.error(`A cor "${color}" já está na lista.`);
      return;
    }
    input.value = '';
    const list = this.colors();
    if (list.length === 1 && list[0] === null) {
      // primeira cor: o cartão "Sem cor" vira esta cor, com os tamanhos e estoque que já tinha
      d.variants.forEach((v: Variant) => (v.color = color));
      this.colors.set([color]);
      return;
    }
    // copia os tamanhos marcados de uma cor que já existe, com estoque zerado
    const model = list.find((c) => d.variants.some((v: Variant) => this.colorOf(v) === c));
    const sizes = this.sizesOf(d.variants.filter((v: Variant) => this.colorOf(v) === model));
    sizes.forEach((size) => d.variants.push({ size, color, stock: 0 }));
    this.colors.set([...list, color]);
  }

  renameColor(d: any, old: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const name = input.value.trim();
    if (name === old) return;
    if (!name || this.colors().some((c) => c?.toLowerCase() === name.toLowerCase() && c !== old)) {
      if (name) this.toast.error(`A cor "${name}" já está na lista.`);
      input.value = old;
      return;
    }
    d.variants.forEach((v: Variant) => this.colorOf(v) === old && (v.color = name));
    for (const url of Object.keys(d.image_colors)) if (d.image_colors[url] === old) d.image_colors[url] = name;
    this.colors.update((list) => list.map((c) => (c === old ? name : c)));
  }

  async removeColor(d: any, color: string | null) {
    const ok = await this.confirm.ask({
      title: color ? `Remover a cor "${color}"?` : 'Remover os tamanhos sem cor?',
      message: 'Os tamanhos e o estoque desta cor saem do produto. As fotos dela continuam, como fotos gerais.',
      confirmLabel: 'Remover',
      danger: true,
    });
    if (!ok) return;
    d.variants = d.variants.filter((v: Variant) => this.colorOf(v) !== color);
    for (const url of Object.keys(d.image_colors)) if (d.image_colors[url] === color) delete d.image_colors[url];
    const rest = this.colors().filter((c) => c !== color);
    this.colors.set(rest.length ? rest : [null]);
  }

  /** fotos de uma cor; null = fotos gerais (sem cor marcada) */
  photosOf(d: any, color: string | null): string[] {
    return d.images.filter((url: string) => (d.image_colors[url] || null) === color);
  }

  addPhoto(d: any, url: string, color: string | null) {
    if (!d.images.includes(url)) d.images.push(url);
    if (color) d.image_colors[url] = color;
    else delete d.image_colors[url];
  }

  removePhoto(d: any, url: string) {
    d.images.splice(d.images.indexOf(url), 1);
    delete d.image_colors[url];
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

  makeCover(form: any, url: string) {
    form.images.splice(form.images.indexOf(url), 1);
    form.images.unshift(url);
  }

  /** Atalho do celular: escolhe/tira as fotos primeiro e já abre o cadastro com elas. */
  startWithPhotos(event: Event) {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    (event.target as HTMLInputElement).value = '';
    if (!files.length) return;
    this.open();
    for (const file of files) {
      this.photoUploads.update((n) => n + 1);
      const color = detectColor(file);
      this.api.upload(file).subscribe({
        next: async ({ url }) => {
          const name = await color;
          this.photoUploads.update((n) => n - 1);
          // só entra no cadastro novo (se a gaveta foi fechada ou trocada por outro produto, a foto fica de fora)
          const d = this.draft();
          if (!d || d.id) return;
          this.draft.set({
            ...d,
            images: [...d.images, url],
            image_colors: name ? { ...d.image_colors, [url]: name } : d.image_colors,
          });
          this.useDetectedColor(name);
        },
        error: (err) => {
          this.photoUploads.update((n) => n - 1);
          this.toast.error(errorMessage(err));
        },
      });
    }
  }

  /** cor reconhecida na foto vira um cartão de cor (null = foto sem cor reconhecida, vai para "Sem cor") */
  private useDetectedColor(name: string | null) {
    const list = this.colors();
    if (list.includes(name)) return;
    const onlyBlank = list.length === 1 && list[0] === null && !this.draft()?.variants.length;
    // o cartão "Sem cor" vazio sai quando a primeira cor aparece, mas volta se alguma foto não tiver cor
    const blankHasPhotos = this.photosOf(this.draft(), null).length > 0;
    this.colors.set(onlyBlank && name && !blankHasPhotos ? [name] : [...list, name]);
    if (name) this.toast.show(`Cor reconhecida: ${name}. Se não for, é só trocar o nome.`);
  }

  /** Planilha (.xlsx ou .csv) com um produto por linha; produtos entram escondidos até ganharem fotos. */
  importSheet(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.importing.set(true);
    this.api.importProducts(file).subscribe({
      next: async ({ created, skipped, errors }) => {
        this.importing.set(false);
        this.load();
        const lines = [
          created.length ? `${created.length} produto(s) criado(s). Eles estão escondidos da loja: coloque as fotos e toque em "Escondido" para mostrar.` : '',
          skipped.length ? `${skipped.length} já existiam e ficaram como estavam: ${skipped.slice(0, 5).join(', ')}${skipped.length > 5 ? '...' : ''}.` : '',
          errors.length ? `Não entraram (corrija e importe de novo):\n• ${errors.slice(0, 10).join('\n• ')}${errors.length > 10 ? `\n...e mais ${errors.length - 10}` : ''}` : '',
        ].filter(Boolean);
        await this.confirm.ask({
          title: created.length ? 'Planilha importada' : 'Nenhum produto novo',
          message: lines.join('\n\n') || 'A planilha não tinha produtos.',
          confirmLabel: 'Entendi',
          alert: true,
        });
      },
      error: (err) => {
        this.importing.set(false);
        this.toast.error(errorMessage(err));
      },
    });
  }

  closeSheetMenu(event: Event) {
    const menu = document.querySelector<HTMLDetailsElement>('details.sheet-menu');
    if (menu?.open && !menu.contains(event.target as Node)) menu.open = false;
  }

  downloadTemplate() {
    this.api.importTemplate().subscribe((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'modelo-produtos.csv';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  }

  toggleActive(p: Product) {
    const body = { ...p, active: !p.active };
    this.api.save<Product>('products', body, p.id).subscribe(() => {
      this.toast.show(body.active ? 'Produto visível na loja' : 'Produto escondido da loja');
      this.load();
    });
  }
}

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Banner, BannerPlacement, Category } from '../core/models';
import { Icon } from '../shared/icon';
import { CrudPage, fromLocalInput, toLocalInput } from './crud-page';
import { ImageInput } from './image-input';
import { Pager } from './pager';
import { ImgPipe } from '../shared/img.pipe';

const PLACEMENTS: { value: BannerPlacement; label: string; hint: string }[] = [
  { value: 'hero', label: 'Carrossel do topo', hint: 'Banner grande, o primeiro que o cliente vê' },
  { value: 'card', label: 'Cartão', hint: 'Dois lado a lado no meio da página inicial' },
  { value: 'strip', label: 'Faixa', hint: 'Faixa larga com chamada e botão' },
];

const PALETTES = [
  { bg: '#111111', text: '#ffffff' },
  { bg: '#ffffff', text: '#111111' },
  { bg: '#ece6da', text: '#111111' },
  { bg: '#1f3a5f', text: '#ffffff' },
  { bg: '#c8102e', text: '#ffffff' },
  { bg: '#3d4a3a', text: '#ffffff' },
];

@Component({
  selector: 'app-banners',
  imports: [FormsModule, Icon, ImageInput, Pager, ImgPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Anúncios</h1>
        <p class="muted">Banners da página inicial. Programe início e fim para campanhas.</p>
      </div>
      <button class="btn" (click)="open()"><app-icon name="plus" [size]="18" /> Novo anúncio</button>
    </div>

    <div class="banner-list">
      @for (b of pageRows(); track b.id) {
        <article class="banner-item card">
          <div class="mini" [style.background]="b.bg_color" [style.color]="b.text_color">
            <div><strong>{{ b.title }}</strong><span>{{ b.subtitle }}</span></div>
            @if (b.image) {
              <img [src]="b.image | img" alt="" />
            }
          </div>
          <div class="meta">
            <span class="badge soft">{{ placementLabel(b.placement) }}</span>
            <span class="status" [class.on]="b.active" [class.off]="!b.active">{{ b.active ? 'Ativo' : 'Pausado' }}</span>
            <span class="muted small link-to" [title]="b.link">→ {{ b.link }}</span>
            <button class="icon-btn" (click)="open(b)" aria-label="Editar"><app-icon name="edit" [size]="17" /></button>
            <button class="icon-btn" (click)="remove(b, b.title)" aria-label="Excluir"><app-icon name="trash" [size]="17" /></button>
          </div>
        </article>
      } @empty {
        <p class="empty">{{ items() ? 'Nenhum anúncio cadastrado.' : 'Carregando...' }}</p>
      }
    </div>
    <app-pager [page]="page()" [pages]="pages()" [total]="total()" noun="anúncios" (pageChange)="pageNumber.set($event)" />

    @if (draft(); as d) {
      <div class="modal-backdrop" (click)="close()">
        <form class="modal" (click)="$event.stopPropagation()" (ngSubmit)="save()">
          <div class="modal-head">
            <h2>{{ d.id ? 'Editar anúncio' : 'Novo anúncio' }}</h2>
            <button type="button" class="icon-btn" (click)="close()" aria-label="Fechar"><app-icon name="x" /></button>
          </div>

          <!-- prévia ao vivo -->
          <div class="preview" [class]="'preview ' + d.placement" [style.background]="d.bg_color" [style.color]="d.text_color">
            <div>
              <strong>{{ d.title || 'Título do anúncio' }}</strong>
              <span>{{ d.subtitle }}</span>
              <em [style.background]="d.text_color" [style.color]="d.bg_color">{{ d.cta_label || 'Ver agora' }}</em>
            </div>
            @if (d.image && d.placement !== 'strip') {
              <img [src]="d.image | img" alt="" />
            }
          </div>

          <div class="field">
            <span>Onde aparece</span>
            <div class="placements">
              @for (p of placements; track p.value) {
                <label class="choice"><input type="radio" name="placement" [value]="p.value" [(ngModel)]="d.placement" />
                  <div><strong>{{ p.label }}</strong><span class="muted">{{ p.hint }}</span></div></label>
              }
            </div>
          </div>

          <label class="field"><span>Título</span><input class="input" name="title" [(ngModel)]="d.title" required /></label>
          <label class="field"><span>Subtítulo</span><input class="input" name="subtitle" [(ngModel)]="d.subtitle" /></label>
          <div class="row">
            <label class="field"><span>Texto do botão</span><input class="input" name="cta" [(ngModel)]="d.cta_label" /></label>
            <label class="field">
              <span>Leva para</span>
              <select class="input" name="linkPreset" [ngModel]="d.link" (ngModelChange)="d.link = $event">
                @for (l of links(); track l.value) {
                  <option [value]="l.value">{{ l.label }}</option>
                }
                @if (!isPreset(d.link)) {
                  <option [value]="d.link">Outro: {{ d.link }}</option>
                }
              </select>
            </label>
          </div>
          <label class="field">
            <span>Link personalizado <small>(opcional)</small></span>
            <input class="input" name="link" [(ngModel)]="d.link" placeholder="/loja?categoria=polos ou https://..." />
          </label>

          <div class="field">
            <span>Cores</span>
            <div class="palettes">
              @for (p of palettes; track p.bg) {
                <button type="button" class="swatch" [style.background]="p.bg" [style.color]="p.text"
                  [class.on]="d.bg_color === p.bg && d.text_color === p.text" (click)="d.bg_color = p.bg; d.text_color = p.text">Aa</button>
              }
              <label class="custom">Fundo <input type="color" name="bg" [(ngModel)]="d.bg_color" /></label>
              <label class="custom">Texto <input type="color" name="fg" [(ngModel)]="d.text_color" /></label>
            </div>
          </div>

          <div class="field">
            <span>Imagem</span>
            <app-image-input [(value)]="d.image" [aspect]="4 / 5" />
          </div>

          <div class="row" style="--cols: 3">
            <label class="field"><span>Ordem</span><input class="input" type="number" name="sort" [(ngModel)]="d.sort" /></label>
            <label class="field"><span>Início</span><input class="input" type="datetime-local" name="start" [(ngModel)]="d.starts_at" /></label>
            <label class="field"><span>Fim</span><input class="input" type="datetime-local" name="end" [(ngModel)]="d.ends_at" /></label>
          </div>
          <label class="check"><input type="checkbox" name="active" [(ngModel)]="d.active" /> Anúncio ativo</label>

          @if (error()) {
            <p class="form-error">{{ error() }}</p>
          }
          <div class="modal-foot">
            <button type="button" class="btn ghost" (click)="close()">Cancelar</button>
            <button class="btn" type="submit" [disabled]="saving()">Salvar anúncio</button>
          </div>
        </form>
      </div>
    }
  `,
  styles: `
    .banner-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(340px, 100%), 1fr)); gap: 14px; }
    .banner-item { padding: 0; overflow: hidden; }
    .mini { display: flex; justify-content: space-between; gap: 10px; padding: 18px; min-height: 110px;
      div { display: flex; flex-direction: column; gap: 4px; } strong { font-family: var(--font-display); font-size: 1.15rem; }
      span { font-size: .82rem; opacity: .85; } img { width: 64px; height: 80px; object-fit: cover; border-radius: 8px; } }
    .meta { display: flex; align-items: center; gap: 8px; padding: 8px 10px 8px 16px;
      .link-to { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } }
    .preview { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 24px; border-radius: 14px;
      margin-bottom: 18px; min-height: 150px; border: 1px solid var(--line);
      div { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
      strong { font-family: var(--font-display); font-size: 1.5rem; line-height: 1.1; }
      span { opacity: .85; font-size: .9rem; }
      em { font-style: normal; font-weight: 600; font-size: .82rem; padding: 7px 14px; border-radius: 999px; margin-top: 6px; }
      img { width: 110px; height: 136px; object-fit: cover; border-radius: 10px; } }
    .preview.hero { min-height: 190px; strong { font-size: 1.8rem; } }
    .placements { display: grid; gap: 8px; .choice > div { display: flex; flex-direction: column; } }
    .palettes { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .swatch { width: 44px; height: 44px; border-radius: 10px; border: 2px solid var(--line); cursor: pointer; font-weight: 700;
      &.on { outline: 2px solid var(--ink); outline-offset: 2px; } }
    .custom { display: inline-flex; align-items: center; gap: 6px; font-size: .82rem; font-weight: 500 !important;
      input { width: 40px; height: 34px; padding: 0; border: 1px solid var(--line); border-radius: 6px; } }
  `,
})
export class Banners extends CrudPage<Banner> {
  protected resource = 'banners' as const;
  protected override noun = 'Anúncio';
  protected placements = PLACEMENTS;
  protected palettes = PALETTES;
  protected links = signal([
    { value: '/loja', label: 'Todos os produtos' },
    { value: '/loja?promo=1', label: 'Promoções' },
    { value: '/combos', label: 'Combos' },
    { value: '/loja?ordem=newest', label: 'Novidades' },
    { value: '/loja?ordem=best_sellers', label: 'Mais vendidos' },
  ]);

  override ngOnInit() {
    super.ngOnInit();
    this.api.list<Category>('categories').subscribe((cats) =>
      this.links.update((l) => [...l, ...cats.map((c) => ({ value: `/loja?categoria=${c.slug}`, label: `Categoria: ${c.name}` }))]),
    );
  }

  protected blank() {
    return { id: null, title: '', subtitle: '', image: null, cta_label: 'Ver agora', link: '/loja', placement: 'hero',
      bg_color: '#111111', text_color: '#ffffff', sort: 0, starts_at: '', ends_at: '', active: true };
  }

  protected override toForm(b: Banner) {
    return { ...b, starts_at: toLocalInput(b.starts_at), ends_at: toLocalInput(b.ends_at) };
  }

  protected override toPayload(f: any) {
    return { ...f, starts_at: fromLocalInput(f.starts_at), ends_at: fromLocalInput(f.ends_at) };
  }

  isPreset(link: string) {
    return this.links().some((l) => l.value === link);
  }

  placementLabel(p: BannerPlacement) {
    return PLACEMENTS.find((x) => x.value === p)?.label ?? p;
  }
}

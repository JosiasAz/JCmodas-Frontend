import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Combo, Product } from '../core/models';
import { Icon } from '../shared/icon';
import { MoneyPipe } from '../shared/money.pipe';
import { CrudPage } from './crud-page';
import { ImageInput } from './image-input';
import { Pager } from './pager';
import { ImgPipe } from '../shared/img.pipe';

@Component({
  selector: 'app-admin-combos',
  imports: [FormsModule, Icon, MoneyPipe, ImageInput, Pager, ImgPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Combos</h1>
        <p class="muted">Kits com preço fechado. O cliente escolhe o tamanho de cada peça.</p>
      </div>
      <button class="btn" (click)="open()"><app-icon name="plus" [size]="18" /> Novo combo</button>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead><tr><th></th><th>Combo</th><th>Peças</th><th>Preço</th><th>Economia</th><th>Status</th><th></th></tr></thead>
        <tbody>
          @for (c of pageRows(); track c.id) {
            <tr>
              <td class="cell-thumb">
                @if (c.image) {
                  <img class="thumb" [src]="c.image | img" alt="" />
                }
              </td>
              <td class="cell-main"><b>{{ c.name }}</b></td>
              <td class="small" data-label="Peças">
                @for (i of c.items; track i.product_id) {
                  {{ i.quantity }}x {{ i.product.name }}<br />
                }
              </td>
              <td data-label="Preço"><s class="muted small">{{ c.original_price | money }}</s><br /><b>{{ c.price | money }}</b></td>
              <td data-label="Economia" style="color: var(--ok); font-weight: 600">{{ c.savings | money }}</td>
              <td data-label="Status"><span class="status" [class.on]="c.active" [class.off]="!c.active">{{ c.active ? 'Ativo' : 'Pausado' }}</span></td>
              <td class="actions">
                <button class="icon-btn" (click)="open(c)" aria-label="Editar"><app-icon name="edit" [size]="17" /></button>
                <button class="icon-btn" (click)="remove(c, c.name)" aria-label="Excluir"><app-icon name="trash" [size]="17" /></button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="empty">{{ items() ? 'Nenhum combo cadastrado.' : 'Carregando...' }}</td></tr>
          }
        </tbody>
      </table>
    </div>
    <app-pager [page]="page()" [pages]="pages()" [total]="total()" noun="combos" (pageChange)="pageNumber.set($event)" />

    @if (draft(); as d) {
      <div class="modal-backdrop" (click)="close()">
        <form class="modal" (click)="$event.stopPropagation()" (ngSubmit)="save()">
          <div class="modal-head">
            <h2>{{ d.id ? 'Editar combo' : 'Novo combo' }}</h2>
            <button type="button" class="icon-btn" (click)="close()" aria-label="Fechar"><app-icon name="x" /></button>
          </div>
          <label class="field">
            <span>Nome</span>
            <input class="input" name="name" [(ngModel)]="d.name" required placeholder="Ex.: Kit 3 Camisetas" />
          </label>
          <label class="field">
            <span>Descrição</span>
            <textarea class="input" name="description" [(ngModel)]="d.description"></textarea>
          </label>
          <div class="field">
            <span>Imagem do combo</span>
            <app-image-input [(value)]="d.image" />
          </div>

          <h3 class="form-section">Peças do combo</h3>
          @for (item of d.items; track $index; let i = $index) {
            <div class="item-row">
              <select class="input" [name]="'product' + i" [(ngModel)]="item.product_id" required>
                <option [ngValue]="null" disabled>Escolha o produto</option>
                @for (p of products(); track p.id) {
                  <option [ngValue]="p.id">{{ p.name }} ({{ p.price | money }})</option>
                }
              </select>
              <input class="input qty" type="number" min="1" [name]="'qty' + i" [(ngModel)]="item.quantity" aria-label="Quantidade" />
              <button type="button" class="icon-btn" (click)="d.items.splice(i, 1)" aria-label="Remover"><app-icon name="trash" [size]="16" /></button>
            </div>
          }
          <button type="button" class="link small" (click)="d.items.push({ product_id: null, quantity: 1 })">+ Adicionar peça</button>

          <div class="price-box">
            <div><span class="muted">Valor das peças separadas</span><b>{{ original(d) | money }}</b></div>
            <label class="field">
              <span>Preço do combo (R$)</span>
              <input class="input" type="number" step="0.01" min="0" name="price" [(ngModel)]="d.price" required />
            </label>
            @if (d.price && original(d) > d.price) {
              <p class="saving">Cliente economiza {{ original(d) - d.price | money }} ({{ ((1 - d.price / original(d)) * 100).toFixed(0) }}%)</p>
            } @else if (d.price) {
              <p class="form-error">O combo deveria custar menos que as peças separadas.</p>
            }
          </div>
          <label class="check"><input type="checkbox" name="active" [(ngModel)]="d.active" /> Combo ativo na loja</label>

          @if (error()) {
            <p class="form-error">{{ error() }}</p>
          }
          <div class="modal-foot">
            <button type="button" class="btn ghost" (click)="close()">Cancelar</button>
            <button class="btn" type="submit" [disabled]="saving()">Salvar combo</button>
          </div>
        </form>
      </div>
    }
  `,
  styles: `
    .item-row { display: grid; grid-template-columns: 1fr 80px 40px; gap: 8px; margin-bottom: 8px; align-items: center; }
    .price-box { margin: 18px 0; padding: 16px; background: #fff; border: 1px solid var(--line); border-radius: var(--radius);
      > div { display: flex; justify-content: space-between; margin-bottom: 12px; } }
    .saving { margin: 0; color: var(--ok); font-weight: 600; }
  `,
})
export class AdminCombos extends CrudPage<Combo> {
  protected override removeHint =
    'Ele sai da loja e do painel. Pedidos antigos continuam mostrando o que foi comprado.';
  protected resource = 'combos' as const;
  protected override noun = 'Combo';
  protected products = signal<Product[]>([]);

  override ngOnInit() {
    super.ngOnInit();
    this.api.list<Product>('products').subscribe((p) => this.products.set(p));
  }

  protected blank() {
    return { id: null, name: '', description: '', image: null, price: null, active: true,
      items: [{ product_id: null, quantity: 1 }] };
  }

  protected override toForm(c: Combo) {
    return { id: c.id, name: c.name, description: c.description, image: c.image, price: c.price, active: c.active,
      items: c.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })) };
  }

  protected override toPayload(f: any) {
    return { ...f, items: f.items.filter((i: any) => i.product_id) };
  }

  original(d: any) {
    return d.items.reduce((sum: number, i: any) => {
      const p = this.products().find((p) => p.id === i.product_id);
      return sum + (p ? p.price * (i.quantity || 0) : 0);
    }, 0);
  }
}

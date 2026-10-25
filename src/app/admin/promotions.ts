import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Category, Product, Promotion } from '../core/models';
import { Icon } from '../shared/icon';
import { MoneyPipe } from '../shared/money.pipe';
import { CrudPage, fromLocalInput, toLocalInput } from './crud-page';
import { Pager } from './pager';

@Component({
  selector: 'app-promotions',
  imports: [FormsModule, Icon, DatePipe, MoneyPipe, Pager],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Promoções</h1>
        <p class="muted">Descontos automáticos na loja: % ou R$ por peça, ou "Leve X Pague Y". Não precisa de cupom.</p>
      </div>
      <button class="btn" (click)="open()"><app-icon name="plus" [size]="18" /> Nova promoção</button>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Promoção</th><th>Desconto</th><th>Vale para</th><th>Período</th><th>Status</th><th></th></tr></thead>
        <tbody>
          @for (p of pageRows(); track p.id) {
            <tr>
              <td><b>{{ p.name }}</b><br /><span class="badge sale">{{ p.badge }}</span></td>
              <td>{{ describe(p) }}</td>
              <td>{{ scopeLabel(p) }}</td>
              <td class="small">
                {{ p.starts_at ? (p.starts_at | date: 'dd/MM HH:mm') : 'Já' }} → {{ p.ends_at ? (p.ends_at | date: 'dd/MM HH:mm') : 'sem fim' }}
              </td>
              <td><span class="status" [class.on]="p.running" [class.off]="!p.running">{{ p.running ? 'Rodando' : 'Pausada' }}</span></td>
              <td class="actions">
                <button class="icon-btn" (click)="open(p)" aria-label="Editar"><app-icon name="edit" [size]="17" /></button>
                <button class="icon-btn" (click)="remove(p, p.name)" aria-label="Excluir"><app-icon name="trash" [size]="17" /></button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="empty">{{ items() ? 'Nenhuma promoção ainda. Crie a primeira!' : 'Carregando...' }}</td></tr>
          }
        </tbody>
      </table>
    </div>
    <app-pager [page]="page()" [pages]="pages()" [total]="total()" noun="promoções" (pageChange)="pageNumber.set($event)" />

    @if (draft(); as d) {
      <div class="modal-backdrop" (click)="close()">
        <form class="modal" (click)="$event.stopPropagation()" (ngSubmit)="save()">
          <div class="modal-head">
            <h2>{{ d.id ? 'Editar promoção' : 'Nova promoção' }}</h2>
            <button type="button" class="icon-btn" (click)="close()" aria-label="Fechar"><app-icon name="x" /></button>
          </div>

          <div class="row">
            <label class="field">
              <span>Nome interno</span>
              <input class="input" name="name" [(ngModel)]="d.name" required placeholder="Ex.: Black Friday Polos" />
            </label>
            <label class="field">
              <span>Selo na vitrine</span>
              <input class="input" name="badge" [(ngModel)]="d.badge" maxlength="30" placeholder="Ex.: 20% OFF" />
            </label>
          </div>

          <h3 class="form-section">Tipo de desconto</h3>
          <div class="choices">
            <label class="choice"><input type="radio" name="kind" value="percent" [(ngModel)]="d.kind" />
              <div><strong>Porcentagem</strong><span class="muted">Ex.: 20% em cada peça</span></div></label>
            <label class="choice"><input type="radio" name="kind" value="fixed" [(ngModel)]="d.kind" />
              <div><strong>Valor fixo</strong><span class="muted">Ex.: R$ 15 a menos em cada peça</span></div></label>
            <label class="choice"><input type="radio" name="kind" value="buy_x_pay_y" [(ngModel)]="d.kind" />
              <div><strong>Leve X, pague Y</strong><span class="muted">As peças mais baratas saem de graça no carrinho</span></div></label>
          </div>

          @if (d.kind === 'buy_x_pay_y') {
            <div class="row">
              <label class="field"><span>Leve</span><input class="input" type="number" min="2" name="buy" [(ngModel)]="d.buy_qty" /></label>
              <label class="field"><span>Pague</span><input class="input" type="number" min="1" name="pay" [(ngModel)]="d.pay_qty" /></label>
            </div>
          } @else {
            <label class="field">
              <span>{{ d.kind === 'percent' ? 'Desconto (%)' : 'Desconto por peça (R$)' }}</span>
              <input class="input" type="number" step="0.01" min="0" name="value" [(ngModel)]="d.value" />
            </label>
          }

          <h3 class="form-section">Vale para</h3>
          <select class="input" name="scope" [(ngModel)]="d.scope" style="margin-bottom: 12px">
            <option value="all">Toda a loja</option>
            <option value="category">Uma categoria</option>
            <option value="products">Produtos escolhidos</option>
          </select>
          @if (d.scope === 'category') {
            <select class="input" name="category" [(ngModel)]="d.category_id">
              <option [ngValue]="null" disabled>Escolha a categoria</option>
              @for (c of categories(); track c.id) {
                <option [ngValue]="c.id">{{ c.name }}</option>
              }
            </select>
          }
          @if (d.scope === 'products') {
            <input class="input" placeholder="Filtrar produtos..." [ngModel]="productSearch()" (ngModelChange)="productSearch.set($event)" [ngModelOptions]="{ standalone: true }" />
            <div class="pick-list">
              @for (p of filteredProducts(); track p.id) {
                <label class="check">
                  <input type="checkbox" [checked]="d.product_ids.includes(p.id)" (change)="toggleProduct(d, p.id)" />
                  {{ p.name }} <span class="muted small">{{ p.price | money }}</span>
                </label>
              }
            </div>
            <small class="muted">{{ d.product_ids.length }} selecionado(s)</small>
          }

          <h3 class="form-section">Período</h3>
          <div class="row">
            <label class="field"><span>Começa em</span><input class="input" type="datetime-local" name="start" [(ngModel)]="d.starts_at" />
              <small>Vazio = começa agora</small></label>
            <label class="field"><span>Termina em</span><input class="input" type="datetime-local" name="end" [(ngModel)]="d.ends_at" />
              <small>Vazio = sem data para acabar</small></label>
          </div>
          <label class="check"><input type="checkbox" name="active" [(ngModel)]="d.active" /> Promoção ativa</label>

          @if (error()) {
            <p class="form-error">{{ error() }}</p>
          }
          <div class="modal-foot">
            <button type="button" class="btn ghost" (click)="close()">Cancelar</button>
            <button class="btn" type="submit" [disabled]="saving()">Salvar promoção</button>
          </div>
        </form>
      </div>
    }
  `,
  styles: `
    .choices { display: grid; gap: 8px; margin-bottom: 14px; .choice > div { display: flex; flex-direction: column; } }
    .pick-list { max-height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 12px;
      margin: 8px 0; background: #fff; border: 1px solid var(--line); border-radius: var(--radius-sm); }
  `,
})
export class Promotions extends CrudPage<Promotion> {
  protected resource = 'promotions' as const;
  protected override noun = 'Promoção';
  protected categories = signal<Category[]>([]);
  protected products = signal<Product[]>([]);
  protected productSearch = signal('');
  protected filteredProducts = computed(() =>
    this.products().filter((p) => p.name.toLowerCase().includes(this.productSearch().toLowerCase())),
  );

  override ngOnInit() {
    super.ngOnInit();
    this.api.list<Category>('categories').subscribe((c) => this.categories.set(c));
    this.api.list<Product>('products').subscribe((p) => this.products.set(p));
  }

  protected blank() {
    return {
      id: null, name: '', badge: '', kind: 'percent', value: 10, buy_qty: 3, pay_qty: 2, scope: 'all',
      category_id: null, product_ids: [], starts_at: '', ends_at: '', active: true,
    };
  }

  protected override toForm(p: Promotion) {
    return { ...structuredClone(p), starts_at: toLocalInput(p.starts_at), ends_at: toLocalInput(p.ends_at) };
  }

  protected override toPayload(f: any) {
    const badge =
      f.badge?.trim() ||
      (f.kind === 'percent' ? `${f.value}% OFF` : f.kind === 'fixed' ? `R$ ${f.value} OFF` : `Leve ${f.buy_qty} Pague ${f.pay_qty}`);
    return { ...f, badge, starts_at: fromLocalInput(f.starts_at), ends_at: fromLocalInput(f.ends_at) };
  }

  toggleProduct(d: any, id: number) {
    const i = d.product_ids.indexOf(id);
    if (i >= 0) d.product_ids.splice(i, 1);
    else d.product_ids.push(id);
  }

  describe(p: Promotion) {
    if (p.kind === 'percent') return `${p.value}% por peça`;
    if (p.kind === 'fixed') return `R$ ${p.value.toFixed(2).replace('.', ',')} por peça`;
    return `Leve ${p.buy_qty}, pague ${p.pay_qty}`;
  }

  scopeLabel(p: Promotion) {
    if (p.scope === 'all') return 'Toda a loja';
    if (p.scope === 'category') return this.categories().find((c) => c.id === p.category_id)?.name ?? 'Categoria';
    return `${p.product_ids.length} produto(s)`;
  }
}

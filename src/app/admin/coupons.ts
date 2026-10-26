import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Coupon } from '../core/models';
import { Icon } from '../shared/icon';
import { MoneyPipe } from '../shared/money.pipe';
import { CrudPage, fromLocalInput, toLocalInput } from './crud-page';
import { Pager } from './pager';

@Component({
  selector: 'app-coupons',
  imports: [FormsModule, Icon, DatePipe, MoneyPipe, Pager],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Cupons</h1>
        <p class="muted">Códigos que o cliente digita no carrinho. Ótimos para Instagram, WhatsApp e primeira compra.</p>
      </div>
      <button class="btn" (click)="open()"><app-icon name="plus" [size]="18" /> Novo cupom</button>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Código</th><th>Desconto</th><th>Pedido mínimo</th><th>Usos</th><th>Validade</th><th>Status</th><th></th></tr></thead>
        <tbody>
          @for (c of pageRows(); track c.id) {
            <tr>
              <td class="cell-main"><code class="code">{{ c.code }}</code><br /><span class="muted small">{{ c.description }}</span></td>
              <td data-label="Desconto">{{ c.kind === 'percent' ? c.value + '%' : c.kind === 'fixed' ? (c.value | money) : 'Frete grátis' }}</td>
              <td data-label="Pedido mínimo">{{ c.min_order ? (c.min_order | money) : '-' }}</td>
              <td data-label="Usos">{{ c.used_count }}{{ c.max_uses ? ' / ' + c.max_uses : '' }}</td>
              <td class="small" data-label="Validade">{{ c.ends_at ? 'até ' + (c.ends_at | date: 'dd/MM/yy') : 'Sem validade' }}</td>
              <td data-label="Status"><span class="status" [class.on]="c.active" [class.off]="!c.active">{{ c.active ? 'Ativo' : 'Pausado' }}</span></td>
              <td class="actions">
                <button class="icon-btn" (click)="open(c)" aria-label="Editar"><app-icon name="edit" [size]="17" /></button>
                <button class="icon-btn" (click)="remove(c, c.code)" aria-label="Excluir"><app-icon name="trash" [size]="17" /></button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="empty">{{ items() ? 'Nenhum cupom cadastrado.' : 'Carregando...' }}</td></tr>
          }
        </tbody>
      </table>
    </div>
    <app-pager [page]="page()" [pages]="pages()" [total]="total()" noun="cupons" (pageChange)="pageNumber.set($event)" />

    @if (draft(); as d) {
      <div class="modal-backdrop" (click)="close()">
        <form class="modal" (click)="$event.stopPropagation()" (ngSubmit)="save()">
          <div class="modal-head">
            <h2>{{ d.id ? 'Editar cupom' : 'Novo cupom' }}</h2>
            <button type="button" class="icon-btn" (click)="close()" aria-label="Fechar"><app-icon name="x" /></button>
          </div>
          <label class="field">
            <span>Código</span>
            <input class="input" name="code" [(ngModel)]="d.code" required style="text-transform: uppercase" placeholder="Ex.: VERAO15" />
          </label>
          <label class="field">
            <span>Descrição <small>(só para você)</small></span>
            <input class="input" name="description" [(ngModel)]="d.description" placeholder="Ex.: Divulgação no Instagram" />
          </label>
          <div class="row">
            <label class="field">
              <span>Tipo</span>
              <select class="input" name="kind" [(ngModel)]="d.kind">
                <option value="percent">Porcentagem (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
                <option value="free_shipping">Frete grátis</option>
              </select>
            </label>
            @if (d.kind !== 'free_shipping') {
              <label class="field">
                <span>{{ d.kind === 'percent' ? 'Desconto (%)' : 'Desconto (R$)' }}</span>
                <input class="input" type="number" step="0.01" min="0" name="value" [(ngModel)]="d.value" />
              </label>
            }
          </div>
          <div class="row">
            <label class="field">
              <span>Pedido mínimo (R$)</span>
              <input class="input" type="number" step="0.01" min="0" name="min" [(ngModel)]="d.min_order" />
            </label>
            <label class="field">
              <span>Limite de usos</span>
              <input class="input" type="number" min="1" name="max" [(ngModel)]="d.max_uses" placeholder="Ilimitado" />
            </label>
          </div>
          <div class="row">
            <label class="field"><span>Válido a partir de</span><input class="input" type="datetime-local" name="start" [(ngModel)]="d.starts_at" /></label>
            <label class="field"><span>Válido até</span><input class="input" type="datetime-local" name="end" [(ngModel)]="d.ends_at" /></label>
          </div>
          <label class="check"><input type="checkbox" name="active" [(ngModel)]="d.active" /> Cupom ativo</label>
          @if (error()) {
            <p class="form-error">{{ error() }}</p>
          }
          <div class="modal-foot">
            <button type="button" class="btn ghost" (click)="close()">Cancelar</button>
            <button class="btn" type="submit" [disabled]="saving()">Salvar cupom</button>
          </div>
        </form>
      </div>
    }
  `,
  styles: `.code { font-weight: 700; letter-spacing: .05em; background: var(--sand); padding: 2px 8px; border-radius: 6px; }`,
})
export class Coupons extends CrudPage<Coupon> {
  protected resource = 'coupons' as const;
  protected override noun = 'Cupom';

  protected blank() {
    return { id: null, code: '', description: '', kind: 'percent', value: 10, min_order: 0, max_uses: null,
      starts_at: '', ends_at: '', active: true };
  }

  protected override toForm(c: Coupon) {
    return { ...c, starts_at: toLocalInput(c.starts_at), ends_at: toLocalInput(c.ends_at) };
  }

  protected override toPayload(f: any) {
    return { ...f, max_uses: f.max_uses || null, starts_at: fromLocalInput(f.starts_at), ends_at: fromLocalInput(f.ends_at) };
  }
}

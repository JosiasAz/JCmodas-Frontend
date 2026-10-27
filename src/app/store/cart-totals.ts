import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Quote } from '../core/models';
import { StoreService } from '../core/store.service';
import { MoneyPipe } from '../shared/money.pipe';

/** Resumo de valores (subtotal, descontos, frete, total) usado no carrinho e no checkout. */
@Component({
  selector: 'app-cart-totals',
  imports: [MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let q = quote();
    <dl class="totals">
      <div><dt>Subtotal</dt><dd>{{ q.subtotal | money }}</dd></div>
      @for (d of q.discounts; track d.label) {
        <div class="discount"><dt>{{ d.label }}</dt><dd>- {{ d.amount | money }}</dd></div>
      }
      <div>
        <dt>
          Frete
          @if (q.shipping_note && !q.shipping_pending) {
            <small>{{ q.shipping_note }}</small>
          }
        </dt>
        <dd>
          @if (q.shipping_pending) {
            <span class="pending">a calcular</span>
          } @else if (q.shipping) {
            {{ q.shipping | money }}
          } @else {
            <span class="free">Grátis</span>
          }
        </dd>
      </div>
      <div class="total"><dt>Total</dt><dd>{{ q.total | money }}</dd></div>
    </dl>
    @if (pixHint() && store.pixPercent()) {
      <p class="pix">ou <b>{{ pixTotal() | money }}</b> pagando no Pix</p>
    }
  `,
  styles: `
    .totals { margin: 0; display: flex; flex-direction: column; gap: 10px; }
    .totals div { display: flex; justify-content: space-between; gap: 12px; }
    dt { color: var(--muted); display: flex; flex-direction: column; gap: 2px;
      small { font-weight: 500; font-size: .75rem; color: var(--muted); } }
    dd { margin: 0; font-weight: 500; }
    .discount dt, .discount dd, .free { color: var(--ok); font-weight: 600; }
    .pending { color: var(--muted); font-weight: 600; }
    .total { padding-top: 12px; margin-top: 4px; border-top: 1px solid var(--line); }
    .total dt { color: var(--ink); font-weight: 600; }
    .total dd { font-size: 1.35rem; font-weight: 700; }
    .pix { margin: 8px 0 0; text-align: right; color: var(--ok); font-size: .9rem; }
  `,
})
export class CartTotals {
  protected store = inject(StoreService);
  readonly quote = input.required<Quote>();
  /** No carrinho ainda não sabemos a forma de pagamento: mostramos quanto fica no Pix. */
  readonly pixHint = input(false);

  pixTotal() {
    const q = this.quote();
    return this.store.pixPrice(q.total - q.shipping) + q.shipping;
  }
}

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Order, OrderStatus, PAYMENT_LABEL, STATUS_LABEL } from '../core/models';
import { MoneyPipe } from '../shared/money.pipe';

const FLOW: OrderStatus[] = ['novo', 'pago', 'separando', 'enviado', 'entregue'];

/** Detalhes de um pedido com linha do tempo do status. */
@Component({
  selector: 'app-order-view',
  imports: [MoneyPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let o = order();
    <div class="card">
      <div class="head">
        <div>
          <span class="muted small">Pedido</span>
          <h2>{{ o.code }}</h2>
          <span class="muted small">{{ o.created_at | date: "dd/MM/yyyy 'às' HH:mm" }}</span>
        </div>
        <span class="badge" [class.sale]="o.status === 'cancelado'" [class.ok]="o.status === 'entregue'">
          {{ statusLabel[o.status] }}
        </span>
      </div>

      @if (o.status !== 'cancelado') {
        <ol class="timeline">
          @for (s of flow; track s; let i = $index) {
            <li [class.done]="i <= step()" [class.current]="i === step()">
              <span class="dot"></span>
              <span class="label">{{ s === 'enviado' && o.delivery_method === 'retirada' ? 'Pronto p/ retirar' : statusLabel[s] }}</span>
            </li>
          }
        </ol>
      }

      <ul class="items">
        @for (item of o.items; track item.id) {
          <li>
            @if (item.image) {
              <img [src]="item.image" alt="" />
            }
            <div>
              <strong>{{ item.quantity }}x {{ item.name }}</strong>
              <span class="muted small">{{ item.detail }}</span>
            </div>
            <span>{{ item.total | money }}</span>
          </li>
        }
      </ul>

      <dl class="totals">
        <div><dt>Subtotal</dt><dd>{{ o.subtotal | money }}</dd></div>
        @if (o.discount) {
          <div class="ok"><dt>Descontos{{ o.coupon_code ? ' (cupom ' + o.coupon_code + ')' : '' }}</dt><dd>- {{ o.discount | money }}</dd></div>
        }
        <div><dt>Frete</dt><dd>{{ o.shipping ? (o.shipping | money) : 'Grátis' }}</dd></div>
        <div class="total"><dt>Total</dt><dd>{{ o.total | money }}</dd></div>
      </dl>

      <div class="meta">
        <div>
          <h4>Pagamento</h4>
          <p>{{ paymentLabel[o.payment_method] }}{{ o.payment_method === 'cartao' ? ' em ' + o.installments + 'x' : '' }}</p>
        </div>
        <div>
          <h4>{{ o.delivery_method === 'entrega' ? 'Entrega' : 'Retirada na loja' }}</h4>
          @if (o.delivery_method === 'entrega') {
            <p>{{ o.street }}, {{ o.number }}{{ o.complement ? ' - ' + o.complement : '' }}<br />
              {{ o.district }} · {{ o.city }}/{{ o.state }} · {{ o.cep }}</p>
          } @else {
            <p>Avisaremos pelo WhatsApp quando estiver pronto.</p>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    .card { padding: 24px; }
    .head { display: flex; justify-content: space-between; align-items: start; gap: 12px; margin-bottom: 20px;
      h2 { margin: 2px 0; letter-spacing: .04em; } }
    .timeline { list-style: none; padding: 0; margin: 0 0 24px; display: grid; grid-template-columns: repeat(5, 1fr); }
    .timeline li { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px;
      font-size: .78rem; color: var(--muted); text-align: center; }
    .timeline li::before { content: ''; position: absolute; top: 7px; left: -50%; width: 100%; height: 2px; background: var(--line); z-index: 0; }
    .timeline li:first-child::before { display: none; }
    .timeline li.done::before { background: var(--ink); }
    .dot { position: relative; z-index: 1; width: 16px; height: 16px; border-radius: 50%; background: #fff; border: 2px solid var(--line); }
    .done .dot { background: var(--ink); border-color: var(--ink); }
    .current .dot { box-shadow: 0 0 0 5px rgb(17 17 17 / .12); }
    .done .label { color: var(--ink); font-weight: 600; }
    .items { list-style: none; padding: 0; margin: 0 0 16px; display: flex; flex-direction: column; gap: 12px; }
    .items li { display: grid; grid-template-columns: 48px 1fr auto; gap: 12px; align-items: center; font-size: .9rem; }
    .items img { width: 48px; height: 60px; object-fit: cover; border-radius: 6px; }
    .items div { display: flex; flex-direction: column; }
    .totals { margin: 0; padding: 16px 0; border-top: 1px solid var(--line); display: flex; flex-direction: column; gap: 6px; }
    .totals div { display: flex; justify-content: space-between; }
    dt { color: var(--muted); } dd { margin: 0; }
    .ok dt, .ok dd { color: var(--ok); }
    .total dt { color: var(--ink); font-weight: 600; } .total dd { font-weight: 700; font-size: 1.2rem; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding-top: 16px; border-top: 1px solid var(--line);
      h4 { margin: 0 0 4px; font-size: .78rem; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
      p { margin: 0; font-size: .92rem; } }
    @media (max-width: 560px) { .meta { grid-template-columns: 1fr; } .timeline .label { font-size: .68rem; } }
  `,
})
export class OrderView {
  readonly order = input.required<Order>();
  protected flow = FLOW;
  protected statusLabel = STATUS_LABEL;
  protected paymentLabel = PAYMENT_LABEL;
  protected step = computed(() => FLOW.indexOf(this.order().status));
}

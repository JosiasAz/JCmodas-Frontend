import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../core/cart.service';
import { Order, PAYMENT_LABEL } from '../core/models';
import { StoreService } from '../core/store.service';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import { MoneyPipe } from '../shared/money.pipe';
import { OrderView } from './order-view';

@Component({
  selector: 'app-order-done',
  imports: [RouterLink, Icon, MoneyPipe, OrderView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      @if (order(); as o) {
        <header class="hero">
          <span class="check"><app-icon name="check" [size]="34" [stroke]="2.5" /></span>
          <h1>Pedido recebido!</h1>
          <p class="muted">Obrigado, {{ firstName() }}. Guarde o código <b>{{ o.code }}</b> para acompanhar seu pedido.</p>
        </header>

        <div class="layout">
          <div class="next card">
            <h3>Próximo passo</h3>
            @if (o.payment_method === 'pix') {
              @if (store.settings()?.pix_key) {
                <p>Faça o Pix de <b>{{ o.total | money }}</b> para a chave abaixo e envie o comprovante no WhatsApp:</p>
              } @else {
                <p>Envie o pedido no WhatsApp para receber os dados do Pix de <b>{{ o.total | money }}</b>.</p>
              }
              @if (store.settings()?.pix_key; as key) {
                <div class="pix-key">
                  <code>{{ key }}</code>
                  <button class="btn sm outline" (click)="copy(key)"><app-icon name="copy" [size]="15" /> Copiar</button>
                </div>
              }
            } @else if (o.payment_method === 'cartao') {
              <p>Envie o pedido no WhatsApp e mandaremos o link de pagamento em <b>{{ o.installments }}x</b>.</p>
            } @else {
              <p>Pague <b>{{ o.total | money }}</b> em dinheiro na {{ o.delivery_method === 'entrega' ? 'entrega' : 'retirada' }}.
                Envie o pedido no WhatsApp para confirmarmos.</p>
            }
            @if (store.settings()?.whatsapp) {
              <a class="btn whatsapp lg block" [href]="whatsappLink()" target="_blank" rel="noopener">
                <app-icon name="whatsapp" [size]="20" /> Enviar pedido no WhatsApp
              </a>
            }
            <a class="btn ghost block" routerLink="/loja">Continuar comprando</a>
          </div>

          <app-order-view [order]="o" />
        </div>
      } @else {
        <div class="empty">
          <h3>Pedido {{ code() }}</h3>
          <p>Para ver os detalhes, acompanhe pelo código e telefone usados na compra.</p>
          <a class="btn" routerLink="/rastrear" [queryParams]="{ codigo: code() }">Acompanhar pedido</a>
        </div>
      }
    </div>
  `,
  styles: `
    .page { padding-top: 36px; }
    .hero { text-align: center; max-width: 560px; margin: 0 auto 32px; }
    .check { display: inline-grid; place-items: center; width: 72px; height: 72px; border-radius: 50%;
      background: var(--ok); color: #fff; margin-bottom: 16px; animation: pop .4s ease-out; }
    @keyframes pop { from { transform: scale(.5); opacity: 0; } }
    .layout { display: grid; grid-template-columns: 380px 1fr; gap: 24px; align-items: start; }
    .next { padding: 24px; position: sticky; top: 140px; display: flex; flex-direction: column; gap: 10px;
      p { margin: 0 0 6px; } }
    .pix-key { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px;
      border: 1.5px dashed var(--line); border-radius: var(--radius-sm); background: var(--bg); margin-bottom: 6px;
      code { font-size: .92rem; word-break: break-all; } }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } .next { position: static; } }
  `,
})
export class OrderDone {
  protected store = inject(StoreService);
  private toast = inject(ToastService);
  private cart = inject(CartService);

  readonly code = input.required<string>();
  protected saved = signal<Order | null>(this.cart.lastOrder());
  protected order = computed(() => (this.saved()?.code === this.code() ? this.saved() : null));
  protected firstName = computed(() => this.order()?.customer_name.split(' ')[0] ?? '');

  /** Mensagem com o resumo do pedido para o lojista. */
  protected whatsappLink = computed(() => {
    const o = this.order();
    if (!o) return '';
    const lines = [
      `Olá! Acabei de fazer o pedido *${o.code}* pelo site.`,
      '',
      ...o.items.map((i) => `• ${i.quantity}x ${i.name} (${i.detail})`),
      '',
      `Total: *${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(o.total)}*`,
      `Pagamento: ${PAYMENT_LABEL[o.payment_method]}${o.payment_method === 'cartao' ? ` em ${o.installments}x` : ''}`,
      o.delivery_method === 'entrega'
        ? `Entrega: ${o.street}, ${o.number} - ${o.district}, ${o.city}/${o.state}`
        : 'Vou retirar na loja',
      `Nome: ${o.customer_name}`,
    ];
    return this.store.whatsappLink(lines.join('\n'));
  });

  copy(text: string) {
    navigator.clipboard?.writeText(text).then(() => this.toast.show('Chave Pix copiada!'));
  }
}

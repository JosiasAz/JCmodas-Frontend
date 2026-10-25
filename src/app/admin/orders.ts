import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminApiService } from '../core/admin-api.service';
import { errorMessage } from '../core/auth';
import { Order, OrderPage, OrderStatus, PAYMENT_LABEL, STATUS_LABEL } from '../core/models';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import { MoneyPipe } from '../shared/money.pipe';
import { OrderView } from '../store/order-view';
import { Pager } from './pager';

const STATUSES: OrderStatus[] = ['novo', 'pago', 'separando', 'enviado', 'entregue', 'cancelado'];

// próximo passo natural de cada status (botão principal do pedido)
const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  novo: { status: 'pago', label: 'Confirmar pagamento' },
  pago: { status: 'separando', label: 'Começar a separar' },
  separando: { status: 'enviado', label: 'Marcar como enviado' },
  enviado: { status: 'entregue', label: 'Marcar como entregue' },
};

@Component({
  selector: 'app-orders',
  imports: [FormsModule, Icon, MoneyPipe, DatePipe, OrderView, Pager],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Pedidos</h1>
        <p class="muted">Acompanhe e atualize o andamento de cada venda.</p>
      </div>
      <button class="btn outline sm" (click)="anonymize()" title="LGPD: apaga dados pessoais de pedidos antigos já encerrados">
        <app-icon name="shield" [size]="15" /> Anonimizar pedidos antigos
      </button>
    </div>

    <div class="tabs">
      <button [class.on]="!status()" (click)="filter(null)">Todos</button>
      @for (s of statuses; track s) {
        <button [class.on]="status() === s" (click)="filter(s)">{{ statusLabel[s] }}</button>
      }
    </div>
    <div class="toolbar">
      <input class="input" placeholder="Buscar por código, nome ou telefone..." [ngModel]="search()" (ngModelChange)="search.set($event); pageNumber.set(1)" />
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Pedido</th><th>Data</th><th>Cliente</th><th>Itens</th><th>Total</th><th>Pagamento</th><th>Status</th></tr></thead>
        <tbody>
          @for (o of page()?.items; track o.id) {
            <tr (click)="selected.set(o)" class="clickable">
              <td><b>{{ o.code }}</b></td>
              <td class="small">{{ o.created_at | date: 'dd/MM HH:mm' }}</td>
              <td>{{ o.customer_name }}<br /><span class="muted small">{{ o.phone }}</span></td>
              <td>{{ itemCount(o) }}</td>
              <td><b>{{ o.total | money }}</b></td>
              <td class="small">{{ paymentLabel[o.payment_method] }}<br /><span class="muted">{{ o.delivery_method === 'entrega' ? 'Entrega' : 'Retirada' }}</span></td>
              <td><span class="status" [class]="'status ' + o.status">{{ statusLabel[o.status] }}</span></td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="empty">{{ page() ? 'Nenhum pedido encontrado.' : 'Carregando...' }}</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (page(); as p) {
      <app-pager [page]="p.page" [pages]="p.pages" [total]="p.total" noun="pedidos" (pageChange)="pageNumber.set($event)" />
    }

    @if (selected(); as o) {
      <div class="modal-backdrop" (click)="selected.set(null)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h2>Pedido {{ o.code }}</h2>
            <button class="icon-btn" (click)="selected.set(null)" aria-label="Fechar"><app-icon name="x" /></button>
          </div>

          <div class="customer card">
            <div>
              <b>{{ o.customer_name }}</b>
              <span class="muted small">{{ o.phone }}{{ o.email ? ' · ' + o.email : '' }}</span>
            </div>
            <a class="btn whatsapp sm" [href]="whatsappCustomer(o)" target="_blank" rel="noopener">
              <app-icon name="whatsapp" [size]="16" /> Conversar
            </a>
          </div>
          @if (o.notes) {
            <p class="notes"><b>Observação do cliente:</b> {{ o.notes }}</p>
          }

          <app-order-view [order]="o" />

          @if (o.status === 'novo' && o.payment_method !== 'dinheiro') {
            <p class="pay-check"><app-icon name="shield" [size]="16" />
              <span><b>Antes de confirmar o pagamento:</b> confira a entrada de {{ o.total | money }} no extrato ou app do banco.
                Comprovante enviado por mensagem pode ser falso.</span></p>
          }

          <div class="modal-foot">
            @if (o.status !== 'cancelado' && o.status !== 'entregue') {
              <button class="btn ghost" (click)="setStatus(o, 'cancelado')">Cancelar pedido</button>
            }
            <select class="input status-select" [ngModel]="o.status" (ngModelChange)="setStatus(o, $event)" aria-label="Alterar status">
              @for (s of statuses; track s) {
                <option [value]="s">{{ statusLabel[s] }}</option>
              }
            </select>
            @if (next(o); as n) {
              <button class="btn" (click)="setStatus(o, n.status)">{{ n.label }}</button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .pay-check { display: flex; gap: 10px; align-items: flex-start; margin: 14px 0 0; padding: 12px 14px; border-radius: var(--radius-sm);
      background: var(--warn-soft); color: #6b4106; font-size: .88rem; }
    .tabs { display: flex; gap: 4px; overflow-x: auto; margin-bottom: 12px; border-bottom: 1px solid var(--line);
      button { padding: 10px 14px; border: 0; background: none; font-weight: 500; color: var(--muted); cursor: pointer;
        border-bottom: 2px solid transparent; margin-bottom: -1px; white-space: nowrap;
        &.on { color: var(--ink); border-color: var(--ink); font-weight: 600; } } }
    .clickable { cursor: pointer; }
    .customer { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 16px; margin-bottom: 12px;
      div { display: flex; flex-direction: column; } }
    .notes { padding: 12px 14px; background: var(--warn-soft); border-radius: var(--radius-sm); font-size: .9rem; }
    .status-select { width: auto; min-height: 46px; }
  `,
})
export class Orders {
  private api = inject(AdminApiService);
  private toast = inject(ToastService);
  private router = inject(Router);

  /** ?status=novo (links do resumo) */
  readonly statusParam = input<OrderStatus | undefined>(undefined, { alias: 'status' });

  protected statuses = STATUSES;
  protected statusLabel = STATUS_LABEL;
  protected paymentLabel = PAYMENT_LABEL;

  protected status = signal<OrderStatus | null>(null);
  protected search = signal('');
  protected pageNumber = signal(1);
  private refresh = signal(0);
  protected page = signal<OrderPage | null>(null);
  protected selected = signal<Order | null>(null);

  private query = computed(() => ({
    ...(this.status() ? { status: this.status()! } : {}),
    ...(this.search().trim() ? { q: this.search().trim() } : {}),
    page: this.pageNumber(),
    _: this.refresh(), // força recarregar a lista
  }));

  constructor() {
    effect(() => this.status.set(this.statusParam() ?? null));
    effect((onCleanup) => {
      const sub = this.api.orders(this.query()).subscribe((p) => this.page.set(p));
      onCleanup(() => sub.unsubscribe());
    });
  }

  /** LGPD: apaga nome, telefone, e-mail e endereço de pedidos entregues/cancelados antigos. */
  anonymize() {
    const answer = prompt(
      'Anonimizar pedidos ENTREGUES ou CANCELADOS com mais de quantos meses?\n' +
        'Nome, telefone, e-mail e endereço serão apagados; valores e produtos ficam.',
      '12',
    );
    const months = Number(answer);
    if (!answer || !Number.isInteger(months) || months < 1) return;
    this.api.anonymizeOrders(months).subscribe({
      next: (r) => {
        this.toast.show(r.anonymized ? `${r.anonymized} pedido(s) anonimizado(s)` : 'Nenhum pedido antigo para anonimizar');
        this.refresh.update((n) => n + 1);
      },
      error: (err) => this.toast.error(errorMessage(err)),
    });
  }

  filter(status: OrderStatus | null) {
    this.status.set(status);
    this.pageNumber.set(1);
    this.router.navigate([], { queryParams: { status } });
  }

  itemCount(o: Order) {
    return o.items.reduce((n, i) => n + i.quantity, 0);
  }

  next(o: Order) {
    const n = NEXT[o.status];
    if (n?.status === 'enviado' && o.delivery_method === 'retirada') return { ...n, label: 'Pronto para retirada' };
    return n;
  }

  whatsappCustomer(o: Order) {
    const phone = o.phone.replace(/\D/g, '');
    const full = phone.length <= 11 ? `55${phone}` : phone;
    const msg = `Olá, ${o.customer_name.split(' ')[0]}! Aqui é da JC Moda Masculina sobre o seu pedido ${o.code}.`;
    return `https://wa.me/${full}?text=${encodeURIComponent(msg)}`;
  }

  setStatus(o: Order, status: OrderStatus) {
    if (status === o.status) return;
    if (status === 'cancelado' && !confirm('Cancelar este pedido? As peças voltam para o estoque.')) return;
    this.api.setOrderStatus(o.id, status).subscribe({
      next: (updated) => {
        this.toast.show(`Pedido ${updated.code}: ${STATUS_LABEL[updated.status]}`);
        this.selected.set(updated);
        this.page.update((p) => p && { ...p, items: p.items.map((x) => (x.id === updated.id ? updated : x)) });
      },
      error: (err) => this.toast.error(errorMessage(err)),
    });
  }
}

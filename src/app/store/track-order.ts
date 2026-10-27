import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/auth';
import { Order } from '../core/models';
import { formatPhoneBR } from '../shared/br-format';
import { Icon } from '../shared/icon';
import { OrderView } from './order-view';

@Component({
  selector: 'app-track-order',
  imports: [FormsModule, Icon, OrderView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <header>
        <h1>Acompanhar pedido</h1>
        <p class="muted">Informe o código do pedido e o telefone usado na compra.</p>
      </header>

      <form class="card search" (ngSubmit)="search()">
        <label class="field">
          <span>Código do pedido</span>
          <input class="input" name="code" [(ngModel)]="code" placeholder="JC12AB34" required style="text-transform: uppercase" />
        </label>
        <label class="field">
          <span>Telefone</span>
          <input class="input" name="phone" [ngModel]="phone" (ngModelChange)="phone = formatPhone($event)"
            placeholder="(00) 00000-0000" inputmode="tel" autocomplete="tel" required />
        </label>
        <button class="btn lg" type="submit" [disabled]="loading()"><app-icon name="search" [size]="18" /> Buscar</button>
      </form>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
      @if (order(); as o) {
        <app-order-view [order]="o" />
      }
    </div>
  `,
  styles: `
    .page { padding-top: 32px; max-width: 760px; }
    .search { display: grid; grid-template-columns: 1fr 1fr auto; gap: 14px; align-items: end; margin-bottom: 20px;
      .field { margin: 0; } }
    .error { color: var(--sale); font-weight: 600; }
    @media (max-width: 640px) { .search { grid-template-columns: 1fr; } }
  `,
})
export class TrackOrder {
  private api = inject(ApiService);

  /** ?codigo=JC... vindo da página de pedido */
  readonly codigo = input<string>();

  protected code = '';
  protected phone = '';
  protected order = signal<Order | null>(null);
  protected error = signal('');
  protected loading = signal(false);

  ngOnInit() {
    this.code = this.codigo() ?? '';
  }

  formatPhone(text: string) {
    return formatPhoneBR(text);
  }

  search() {
    if (!this.code.trim() || !this.phone.trim()) return;
    this.loading.set(true);
    this.error.set('');
    this.api.trackOrder(this.code.trim(), this.phone).subscribe({
      next: (o) => {
        this.order.set(o);
        this.loading.set(false);
      },
      error: (err) => {
        this.order.set(null);
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }
}

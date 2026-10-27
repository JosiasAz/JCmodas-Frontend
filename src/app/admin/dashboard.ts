import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApiService } from '../core/admin-api.service';
import { AuthService } from '../core/auth';
import { Dashboard as DashboardData, OrderStatus, STATUS_LABEL } from '../core/models';
import { Icon } from '../shared/icon';
import { MoneyPipe } from '../shared/money.pipe';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, Icon, MoneyPipe, DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Olá, {{ auth.name() }}</h1>
        <p class="muted">Veja como está a loja.</p>
      </div>
      <div class="range">
        @for (d of [7, 30, 90]; track d) {
          <button class="chip" [class.on]="days() === d" (click)="days.set(d)">{{ d }} dias</button>
        }
      </div>
    </div>

    @if (data(); as d) {
      @if (d.new_orders) {
        <a routerLink="/admin/pedidos" [queryParams]="{ status: 'novo' }" class="alert">
          <app-icon name="box" /> Você tem <b>{{ d.new_orders }} {{ d.new_orders === 1 ? 'pedido novo' : 'pedidos novos' }}</b> aguardando
          <app-icon name="arrow" [size]="16" />
        </a>
      }

      <div class="kpis">
        <div class="card kpi"><span>Faturamento</span><strong>{{ d.revenue | money }}</strong></div>
        <div class="card kpi"><span>Pedidos</span><strong>{{ d.orders }}</strong></div>
        <div class="card kpi"><span>Ticket médio</span><strong>{{ d.average_ticket | money }}</strong></div>
        <div class="card kpi"><span>Produtos ativos</span><strong>{{ d.products_active }}</strong></div>
      </div>

      <!-- MEI: passar de R$ 81 mil no ano muda o regime de imposto -->
      @if (d.mei_limit) {
        <section class="card mei" [class.warn]="meiPercent() >= 80 && meiPercent() < 100" [class.over]="meiPercent() >= 100">
          <div class="mei-head">
            <h3>Limite do MEI em {{ year }}</h3>
            <strong>{{ meiPercent() | number: '1.0-0' }}%</strong>
          </div>
          <div class="meter" role="meter" aria-valuemin="0" [attr.aria-valuemax]="d.mei_limit" [attr.aria-valuenow]="d.year_revenue"
            [attr.aria-label]="'Vendido no ano: ' + (d.year_revenue | money) + ' de ' + (d.mei_limit | money)">
            <span [style.width.%]="meiPercent() > 100 ? 100 : meiPercent()"></span>
          </div>
          <p class="small">
            <b>{{ d.year_revenue | money }}</b> vendidos pelo site este ano, de <b>{{ d.mei_limit | money }}</b>.
            @if (meiPercent() < 100) {
              Ainda cabem {{ d.mei_limit - d.year_revenue | money }}.
            } @else {
              <b>Limite passado: fale com um contador ou com o Sebrae.</b>
            }
          </p>
          <p class="muted small">Conta só pedidos pagos do site. Some também o que você vende fora dele (feiras, viagens, maquininha).</p>
        </section>
      }

      <section class="card chart-card">
        <h3>Faturamento por dia</h3>
        <p class="muted small">Pedidos não cancelados · últimos {{ d.sales_by_day.length }} dias</p>
        @if (!maxDay()) {
          <p class="no-sales">Nenhuma venda no período. Assim que os pedidos chegarem, eles aparecem aqui.</p>
        } @else {
        <div class="chart" role="img" [attr.aria-label]="'Gráfico de faturamento diário. Maior dia: ' + (maxDay() | money)">
          <div class="y-axis">
            <span>{{ maxDay() | money }}</span>
            <span>{{ maxDay() / 2 | money }}</span>
            <span>R$ 0</span>
          </div>
          <div class="bars">
            @for (day of d.sales_by_day; track day.date) {
              <div class="bar-slot" tabindex="0">
                <div class="bar" [style.height.%]="maxDay() ? (day.total / maxDay()) * 100 : 0"></div>
                <div class="tip"><b>{{ day.total | money }}</b><span>{{ day.date + 'T12:00' | date: 'dd/MM (EEE)' }}</span></div>
              </div>
            }
          </div>
        </div>
        <div class="x-axis small muted">
          <span>{{ d.sales_by_day[0].date + 'T12:00' | date: 'dd/MM' }}</span>
          <span>Hoje</span>
        </div>
        }
      </section>

      <div class="cols">
        <section class="card">
          <h3>Mais vendidos</h3>
          @for (p of d.top_products; track p.name; let i = $index) {
            <div class="rank">
              <span class="pos">{{ i + 1 }}</span>
              <span class="name">{{ p.name }}</span>
              <span class="muted small">{{ p.quantity }} un.</span>
              <strong>{{ p.total | money }}</strong>
            </div>
          } @empty {
            <p class="muted">Ainda não há vendas no período.</p>
          }
        </section>

        <section class="card">
          <h3>Estoque baixo</h3>
          @for (s of d.low_stock; track $index) {
            <a class="rank" routerLink="/admin/produtos" [queryParams]="{ editar: s.product_id }">
              <span class="badge" [class.sale]="s.stock === 0" [class.warn]="s.stock > 0">{{ s.stock === 0 ? 'Esgotado' : s.stock + ' un.' }}</span>
              <span class="name">{{ s.name }}</span>
              <span class="muted small">Tam. {{ s.size }}</span>
            </a>
          } @empty {
            <p class="muted">Tudo certo com o estoque.</p>
          }
        </section>

        <section class="card">
          <h3>Pedidos por status</h3>
          @for (s of statuses; track s) {
            <a class="rank" routerLink="/admin/pedidos" [queryParams]="{ status: s }">
              <span class="name">{{ statusLabel[s] }}</span>
              <strong>{{ d.orders_by_status[s] }}</strong>
            </a>
          }
        </section>
      </div>
    } @else {
      <div class="skeleton" style="height: 400px"></div>
    }
  `,
  styles: `
    .range { display: flex; gap: 6px; }
    .alert { display: flex; align-items: center; gap: 10px; padding: 14px 18px; margin-bottom: 18px; border-radius: var(--radius);
      background: var(--warn-soft); color: #6b4106; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px;
      @media (max-width: 900px) { grid-template-columns: repeat(2, 1fr); } }
    .kpi { display: flex; flex-direction: column; gap: 6px;
      span { color: var(--muted); font-size: .85rem; } strong { font-size: 1.6rem; font-weight: 700; } }
    .mei { margin-bottom: 18px; --meter: var(--ok);
      &.warn { --meter: var(--warn); } &.over { --meter: var(--sale); }
      p { margin: 8px 0 0; } }
    .mei-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px;
      h3 { margin: 0; font-family: var(--font); font-size: 1rem; } strong { color: var(--meter); font-size: 1.2rem; } }
    .meter { height: 10px; margin-top: 12px; border-radius: 99px; background: var(--sand); overflow: hidden;
      span { display: block; height: 100%; border-radius: 99px; background: var(--meter); transition: width .4s; } }
    .chart-card { margin-bottom: 18px; h3 { margin: 0; font-family: var(--font); font-size: 1rem; } }
    .no-sales { margin: 16px 0 0; padding: 40px 16px; text-align: center; color: var(--muted); background: var(--bg); border-radius: var(--radius-sm); }
    .chart { display: grid; grid-template-columns: auto 1fr; gap: 10px; height: 220px; margin-top: 16px; }
    .y-axis { display: flex; flex-direction: column; justify-content: space-between; font-size: .72rem; color: var(--muted); text-align: right; }
    .bars { display: flex; align-items: flex-end; gap: 2px; border-bottom: 1px solid var(--line);
      background: linear-gradient(var(--line) 1px, transparent 1px) 0 0 / 100% 50%; }
    .bar-slot { position: relative; flex: 1; height: 100%; display: flex; align-items: flex-end; outline: none; cursor: default;
      &:hover .bar, &:focus .bar { background: var(--ink-2); opacity: .75; }
      &:hover .tip, &:focus .tip { display: flex; } }
    .bar { width: 100%; min-height: 1px; background: var(--ink); border-radius: 4px 4px 0 0; transition: height .3s; }
    .tip { display: none; position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%); z-index: 2;
      flex-direction: column; align-items: center; padding: 6px 10px; border-radius: 8px; background: var(--ink); color: #fff;
      font-size: .78rem; white-space: nowrap; pointer-events: none; }
    .bar-slot:first-child .tip, .bar-slot:nth-child(2) .tip { left: 0; transform: none; }
    .bar-slot:last-child .tip, .bar-slot:nth-last-child(2) .tip { left: auto; right: 0; transform: none; }
    .x-axis { display: flex; justify-content: space-between; padding-left: 60px; margin-top: 6px; }
    .cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;
      @media (max-width: 1100px) { grid-template-columns: 1fr; }
      h3 { font-family: var(--font); font-size: 1rem; } }
    .rank { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--line); font-size: .9rem;
      &:last-child { border-bottom: 0; }
      .name { flex: 1; } }
    a.rank:hover .name { text-decoration: underline; }
    .pos { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: var(--sand); font-size: .75rem; font-weight: 700; }
    .chip { padding: 7px 14px; border: 1.5px solid var(--line); border-radius: 999px; background: #fff; font-size: .85rem; cursor: pointer;
      &.on { background: var(--ink); color: #fff; border-color: var(--ink); } }
  `,
})
export class Dashboard {
  private api = inject(AdminApiService);
  protected auth = inject(AuthService);

  protected days = signal(30);
  protected data = signal<DashboardData | null>(null);
  protected maxDay = computed(() => Math.max(0, ...(this.data()?.sales_by_day ?? []).map((d) => d.total)));
  protected statuses: OrderStatus[] = ['novo', 'pago', 'separando', 'enviado', 'entregue', 'cancelado'];
  protected statusLabel = STATUS_LABEL;
  protected year = new Date().getFullYear();
  protected meiPercent = computed(() => {
    const d = this.data();
    return d?.mei_limit ? (d.year_revenue / d.mei_limit) * 100 : 0;
  });

  constructor() {
    effect((onCleanup) => {
      const sub = this.api.dashboard(this.days()).subscribe((d) => this.data.set(d));
      onCleanup(() => sub.unsubscribe());
    });
  }
}

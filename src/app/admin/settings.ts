import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../core/admin-api.service';
import { errorMessage } from '../core/auth';
import { StoreSettings } from '../core/models';
import { StoreService } from '../core/store.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Configurações</h1>
        <p class="muted">Contato, frete, Pix e parcelamento.</p>
      </div>
    </div>

    @if (form(); as f) {
      <form class="grid" (ngSubmit)="save(f)">
        <section class="card">
          <h3>Loja</h3>
          <label class="field"><span>Nome da loja</span><input class="input" name="store_name" [(ngModel)]="f.store_name" required /></label>
          <label class="field">
            <span>Aviso no topo do site</span>
            <input class="input" name="announcement" [(ngModel)]="f.announcement" maxlength="160" />
            <small>Ex.: Frete grátis acima de R$ 299 · 5% OFF no Pix. Deixe vazio para esconder.</small>
          </label>
          <label class="field"><span>Endereço</span><input class="input" name="address" [(ngModel)]="f.address" /></label>
          <label class="field"><span>Horário de funcionamento</span><input class="input" name="hours" [(ngModel)]="f.opening_hours" /></label>
        </section>

        <section class="card">
          <h3>Contato</h3>
          <label class="field">
            <span>WhatsApp (com DDI e DDD)</span>
            <input class="input" name="whatsapp" [(ngModel)]="f.whatsapp" placeholder="5592999999999" />
            <small>Só números. Usado no botão flutuante e para receber os pedidos.</small>
          </label>
          <label class="field"><span>Instagram</span><input class="input" name="instagram" [(ngModel)]="f.instagram" placeholder="jcmodamasculina" /></label>
          <label class="field"><span>E-mail</span><input class="input" name="email" [(ngModel)]="f.email" /></label>
        </section>

        <section class="card">
          <h3>Entrega</h3>
          <div class="row">
            <label class="field"><span>Taxa de entrega (R$)</span><input class="input" type="number" step="0.01" min="0" name="fee" [(ngModel)]="f.shipping_fee" /></label>
            <label class="field"><span>Frete grátis acima de (R$)</span><input class="input" type="number" step="0.01" min="0" name="free" [(ngModel)]="f.free_shipping_min" />
              <small>0 = sem frete grátis</small></label>
          </div>
          <label class="check"><input type="checkbox" name="pickup" [(ngModel)]="f.pickup_enabled" /> Permitir retirada na loja</label>
        </section>

        <section class="card">
          <h3>Pedidos e estoque</h3>
          <div class="row">
            <label class="field"><span>Cancelar pedido não pago depois de (horas)</span>
              <input class="input" type="number" min="0" max="720" name="hold" [(ngModel)]="f.order_hold_hours" />
              <small>O estoque reservado volta para a loja. 0 = nunca cancelar sozinho.</small></label>
            <label class="field"><span>Máximo de unidades por item no pedido</span>
              <input class="input" type="number" min="1" max="50" name="maxqty" [(ngModel)]="f.max_qty_per_item" />
              <small>Evita que uma pessoa reserve todo o estoque de uma peça.</small></label>
          </div>
        </section>

        <section class="card">
          <h3>Pagamento</h3>
          <div class="row">
            <label class="field"><span>Desconto no Pix (%)</span><input class="input" type="number" step="0.5" min="0" max="99" name="pix_pct" [(ngModel)]="f.pix_discount_percent" /></label>
            <label class="field"><span>Parcelas sem juros</span><input class="input" type="number" min="1" max="12" name="inst" [(ngModel)]="f.max_installments" /></label>
          </div>
          <label class="field"><span>Chave Pix</span><input class="input" name="pix_key" [(ngModel)]="f.pix_key" />
            <small>Mostrada ao cliente depois que ele finaliza o pedido.</small></label>
        </section>

        <section class="card wide">
          <h3>Política de privacidade (LGPD)</h3>
          <p class="muted small">Aparece em /privacidade e no checkout. Use "## " para títulos e "- " para listas.
            Enquanto ficar vazio, a loja mostra o modelo padrão.</p>
          <textarea class="input policy" name="privacy" [(ngModel)]="f.privacy_policy" placeholder="(usando o modelo padrão)"></textarea>
          <div class="policy-actions">
            <button class="btn sm outline" type="button" (click)="useTemplate(f)">Carregar modelo para editar</button>
            <a class="btn sm ghost" href="/privacidade" target="_blank">Ver como fica</a>
          </div>
        </section>

        <div class="actions">
          @if (error()) {
            <p class="form-error">{{ error() }}</p>
          }
          <button class="btn lg" type="submit" [disabled]="saving()">{{ saving() ? 'Salvando...' : 'Salvar configurações' }}</button>
        </div>
      </form>
    }
  `,
  styles: `
    .wide { grid-column: 1 / -1; }
    .policy { min-height: 260px; font-family: ui-monospace, Consolas, monospace; font-size: .85rem; }
    .policy-actions { display: flex; gap: 8px; margin-top: 10px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; @media (max-width: 1000px) { grid-template-columns: 1fr; } }
    h3 { font-family: var(--font); font-size: 1rem; margin-bottom: 16px; }
    .actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; align-items: center; gap: 14px; }
  `,
})
export class Settings {
  private api = inject(AdminApiService);
  private toast = inject(ToastService);
  private store = inject(StoreService);
  private http = inject(HttpClient);

  protected form = signal<StoreSettings | null>(null);
  protected saving = signal(false);
  protected error = signal('');

  constructor() {
    this.api.settings().subscribe((s) => this.form.set(s));
  }

  /** Preenche o campo com o modelo de política (dados da loja já inseridos) para o lojista completar. */
  useTemplate(f: StoreSettings) {
    if (f.privacy_policy?.trim() && !confirm('Substituir o texto atual pelo modelo?')) return;
    this.http
      .get<{ text: string }>('/api/privacy', { params: { template: 'true' } })
      .subscribe((p) => this.form.set({ ...f, privacy_policy: p.text }));
  }

  save(f: StoreSettings) {
    this.saving.set(true);
    this.error.set('');
    this.api.saveSettings(f).subscribe({
      next: (s) => {
        this.saving.set(false);
        this.store.settings.set(s);
        this.toast.show('Configurações salvas');
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }
}

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminApiService } from '../core/admin-api.service';
import { errorMessage } from '../core/auth';
import { Coupon, StoreSettings } from '../core/models';
import { StoreService } from '../core/store.service';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import {
  AddressParts,
  DayHours,
  WEEKDAYS,
  emptyAddress,
  formatAddress,
  formatCnpj,
  formatHours,
  formatWhatsapp,
  isAddressComplete,
  isValidWhatsapp,
  normalizeInstagram,
  normalizeWhatsapp,
  parseAddress,
  parseHours,
} from './settings-format';

const HOURS_MAX = 120; // tamanho da coluna no banco
const RETENTION_MONTHS = 12; // mesmo prazo da limpeza automática da API (services/privacy.py)

@Component({
  selector: 'app-settings',
  imports: [FormsModule, RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Configurações</h1>
        <p class="muted">Contato, endereço, horário, frete e pagamento.</p>
      </div>
    </div>

    @if (form(); as f) {
      <form class="grid" (ngSubmit)="save(f)">
        <section class="card">
          <h3><app-icon name="whatsapp" [size]="18" /> Contato</h3>
          <label class="field">
            <span>WhatsApp da loja</span>
            <input class="input" type="tel" inputmode="tel" name="whatsapp" autocomplete="tel"
              placeholder="Cole aqui o número" [ngModel]="whatsappText()" (ngModelChange)="whatsappText.set($event)"
              (blur)="tidyWhatsapp()" (paste)="tidyWhatsappSoon()" />
            @if (!whatsappText().trim()) {
              <small>Copie o número no WhatsApp e cole aqui do jeito que vier, com +55, espaços ou traços. A gente arruma.</small>
            } @else if (whatsappOk()) {
              <small class="ok"><app-icon name="check" [size]="14" /> Número certo.
                <a [href]="'https://wa.me/' + whatsappDigits()" target="_blank" rel="noopener">Testar no WhatsApp</a></small>
            } @else {
              <small class="bad">Confira o número: precisa ter o DDD, ex.: (92) 99329-9773.</small>
            }
          </label>
          <label class="field">
            <span>Instagram</span>
            <div class="prefix">
              <span>&#64;</span>
              <input class="input" name="instagram" [(ngModel)]="f.instagram" (blur)="f.instagram = tidyInstagram(f.instagram)"
                placeholder="jcmodamasculina" autocapitalize="off" />
            </div>
            <small>Pode colar o link do perfil também.</small>
          </label>
          <label class="field">
            <span>E-mail <em class="opt">(opcional)</em></span>
            <input class="input" type="email" name="email" [(ngModel)]="f.email" autocomplete="email" placeholder="contato@exemplo.com" />
          </label>
        </section>

        <section class="card">
          <h3><app-icon name="pin" [size]="18" /> Endereço da loja</h3>
          <div class="cep-row">
            <label class="field">
              <span>CEP</span>
              <input class="input" name="cep" inputmode="numeric" maxlength="9" placeholder="00000-000" autocomplete="postal-code"
                [ngModel]="addr().cep" (ngModelChange)="onCep($event)" />
            </label>
            <span class="cep-status small">
              @switch (cepStatus()) {
                @case ('loading') { Buscando endereço... }
                @case ('error') { <span class="bad">CEP não encontrado. Confira os números.</span> }
                @default {
                  <a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noopener">Não sei o CEP</a>
                }
              }
            </span>
          </div>

          @if (addr().city) {
            <label class="field"><span>Rua</span>
              <input class="input" name="street" [ngModel]="addr().street" (ngModelChange)="setAddr('street', $event)" /></label>
            <div class="row num-row">
              <label class="field"><span>Número</span>
                <input #numberInput class="input" name="number" inputmode="numeric" [ngModel]="addr().number"
                  (ngModelChange)="setAddr('number', $event)" placeholder="s/n" /></label>
              <label class="field"><span>Complemento <em class="opt">(opcional)</em></span>
                <input class="input" name="complement" maxlength="40" [ngModel]="addr().complement"
                  (ngModelChange)="setAddr('complement', $event)" placeholder="Loja 2, sala 3..." /></label>
            </div>
            <label class="field"><span>Bairro</span>
              <input class="input" name="district" [ngModel]="addr().district" (ngModelChange)="setAddr('district', $event)" /></label>
            <p class="city small"><app-icon name="pin" [size]="14" /> {{ addr().city }}/{{ addr().state }}</p>
          } @else if (legacyAddress()) {
            <p class="note small">Endereço atual: <b>{{ legacyAddress() }}</b><br />Digite o CEP para atualizar e deixar no formato certo.</p>
          } @else {
            <p class="muted small">Digite o CEP e o resto do endereço é preenchido sozinho.</p>
          }

          @if (addressPreview(); as preview) {
            <div class="preview">
              <span class="small muted">Como aparece no site</span>
              <p>{{ preview }}</p>
              <button type="button" class="link small" (click)="clearAddress()">Não mostrar endereço no site</button>
            </div>
          }
        </section>

        <section class="card">
          <h3><app-icon name="clock" [size]="18" /> Horário de funcionamento</h3>
          <p class="muted small">Ligue os dias em que a loja abre e escolha o horário.</p>
          <div class="days">
            @for (d of week(); track $index; let i = $index) {
              <div class="day" [class.closed]="!d.open">
                <label class="day-name">
                  <input type="checkbox" class="switch" [name]="'open' + i" [ngModel]="d.open" (ngModelChange)="setDay(i, { open: $event })" />
                  {{ weekdays[i] }}
                </label>
                @if (d.open) {
                  <div class="times">
                    <input class="input time" type="time" [name]="'from' + i" [ngModel]="d.from" (ngModelChange)="setDay(i, { from: $event })" />
                    <span class="muted">às</span>
                    <input class="input time" type="time" [name]="'to' + i" [ngModel]="d.to" (ngModelChange)="setDay(i, { to: $event })" />
                  </div>
                } @else {
                  <span class="muted small">Fechado</span>
                }
              </div>
            }
          </div>
          @if (firstOpenDay() >= 0) {
            <button type="button" class="link small copy" (click)="copyHours()">
              Usar o horário de {{ weekdays[firstOpenDay()] }} em todos os dias abertos</button>
          }
          <div class="preview">
            <span class="small muted">Como aparece no site</span>
            <p>{{ hoursPreview() || 'Nenhum dia aberto: o horário não aparece no site.' }}</p>
          </div>
        </section>

        <section class="card">
          <h3><app-icon name="megaphone" [size]="18" /> Avisos para o cliente</h3>
          <label class="field">
            <span>Aviso no topo do site <em class="opt">(opcional)</em></span>
            <input class="input" name="announcement" [(ngModel)]="f.announcement" maxlength="160"
              placeholder="Frete grátis acima de R$ 299 · 5% OFF no Pix" />
            <small>Aparece numa faixa no topo de todas as páginas. Deixe vazio para esconder.</small>
          </label>
          <label class="field">
            <span>Cupom de boas-vindas <em class="opt">(opcional)</em></span>
            <select class="input" name="welcome_coupon" [(ngModel)]="f.welcome_coupon">
              <option value="">Sem pop-up de boas-vindas</option>
              @for (c of coupons(); track c.id) {
                <option [value]="c.code">{{ c.code }}{{ c.description ? ' · ' + c.description : '' }}{{ c.active ? '' : ' (desativado)' }}</option>
              }
            </select>
            <small>
              Quem visita pela primeira vez vê um aviso discreto com esse cupom depois de 40 segundos ou na 2ª página.
              Aparece no máximo 1 vez por semana, nunca no carrinho ou no checkout, e some para quem já comprou.
              @if (!coupons().length) { Crie o cupom antes em <a routerLink="/admin/cupons">Cupons</a>. }
            </small>
          </label>
        </section>

        <section class="card">
          <h3><app-icon name="store" [size]="18" /> Dados da empresa</h3>
          <p class="muted small">A lei de comércio eletrônico pede que o nome da empresa e o CNPJ apareçam no site.
            Eles vão no rodapé e nas políticas.</p>
          <label class="field">
            <span>Nome empresarial</span>
            <input class="input" name="legal_name" [(ngModel)]="f.legal_name" maxlength="120" placeholder="Como está no cartão CNPJ" />
            <small>No MEI costuma ser o seu nome completo seguido do CPF ou de "ME".</small>
          </label>
          <label class="field">
            <span>CNPJ</span>
            <input class="input" name="cnpj" [(ngModel)]="f.cnpj" (blur)="f.cnpj = tidyCnpj(f.cnpj)" placeholder="00.000.000/0001-00"
              autocapitalize="characters" />
          </label>
        </section>

        <section class="card">
          <h3><app-icon name="truck" [size]="18" /> Entrega</h3>
          <div class="row">
            <label class="field"><span>Taxa de entrega (R$)</span><input class="input" type="number" step="0.01" min="0" name="fee" [(ngModel)]="f.shipping_fee" /></label>
            <label class="field"><span>Frete grátis acima de (R$)</span><input class="input" type="number" step="0.01" min="0" name="free" [(ngModel)]="f.free_shipping_min" />
              <small>0 = sem frete grátis</small></label>
          </div>
          <label class="check"><input type="checkbox" name="pickup" [(ngModel)]="f.pickup_enabled" /> Permitir retirada na loja</label>
        </section>

        <section class="card">
          <h3><app-icon name="pix" [size]="18" /> Pagamento</h3>
          <div class="row">
            <label class="field"><span>Desconto no Pix (%)</span><input class="input" type="number" step="0.5" min="0" max="99" name="pix_pct" [(ngModel)]="f.pix_discount_percent" /></label>
            <label class="field"><span>Parcelas sem juros</span><input class="input" type="number" min="1" max="12" name="inst" [(ngModel)]="f.max_installments" /></label>
          </div>
          <label class="field"><span>Chave Pix</span><input class="input" name="pix_key" [(ngModel)]="f.pix_key" />
            <small>Mostrada ao cliente depois que ele finaliza o pedido.</small></label>
        </section>

        <section class="card">
          <h3><app-icon name="box" [size]="18" /> Pedidos e estoque</h3>
          <div class="row" style="--cols: 1">
            <label class="field"><span>Cancelar pedido não pago depois de (horas)</span>
              <input class="input" type="number" min="0" max="720" name="hold" [(ngModel)]="f.order_hold_hours" />
              <small>O estoque reservado volta para a loja. 0 = nunca cancelar sozinho.</small></label>
            <label class="field"><span>Máximo de unidades por item no pedido</span>
              <input class="input" type="number" min="1" max="50" name="maxqty" [(ngModel)]="f.max_qty_per_item" />
              <small>Evita que uma pessoa reserve todo o estoque de uma peça.</small></label>
          </div>
        </section>

        <section class="card wide">
          <h3><app-icon name="refresh" [size]="18" /> Trocas e devoluções</h3>
          <div class="auto">
            <app-icon name="check" [size]="20" />
            <div>
              <b>A página de trocas é montada sozinha.</b>
              <p>Ela explica ao cliente, em linguagem simples, o que a lei garante e como a loja troca. Aparece no
                rodapé, na página de cada produto e no checkout. <a href="/trocas" target="_blank">Ver a página</a></p>
              <ul>
                <li><b>Desistência em 7 dias</b> depois de receber (obrigatório por lei): a loja paga o frete de volta e devolve todo o valor.</li>
                <li><b>Defeito em até 90 dias</b> (obrigatório por lei): a loja paga o frete de ida e volta.</li>
                <li><b>Troca de tamanho ou modelo</b> no prazo que você escolher abaixo: o cliente envia, a loja manda a peça nova.</li>
              </ul>
            </div>
          </div>
          <label class="field days-field">
            <span>Prazo para troca de tamanho ou modelo (dias)</span>
            <input class="input" type="number" min="7" max="365" name="exchange_days" [(ngModel)]="f.exchange_days" inputmode="numeric" />
            <small>Mínimo de 7 dias. 30 dias é o mais comum e passa confiança para quem compra roupa sem provar.</small>
          </label>
          <details class="custom" [open]="!!f.exchange_policy?.trim()">
            <summary>Quero escrever minha própria política de trocas (opcional)</summary>
            <p class="muted small">Enquanto ficar vazio, vale a página automática. Use "## " para títulos e "- " para listas.
              Os direitos de 7 dias e de 90 dias são da lei e não podem ser retirados.</p>
            <textarea class="input policy" name="exchange" [(ngModel)]="f.exchange_policy" placeholder="(usando a página automática)"></textarea>
            <div class="policy-actions">
              <button class="btn sm outline" type="button" (click)="useTemplate(f, 'exchange')">Começar a partir da automática</button>
              @if (f.exchange_policy?.trim()) {
                <button class="btn sm ghost" type="button" (click)="f.exchange_policy = ''">Voltar a usar a automática</button>
              }
            </div>
          </details>
        </section>

        <section class="card wide">
          <h3><app-icon name="shield" [size]="18" /> Privacidade dos clientes (LGPD)</h3>
          <div class="auto">
            <app-icon name="check" [size]="20" />
            <div>
              <b>Está tudo pronto, você não precisa fazer nada.</b>
              <p>A lei de proteção de dados (LGPD) pede que a loja explique o que faz com os dados dos clientes e
                não guarde esses dados para sempre. A loja já cuida disso sozinha:</p>
              <ul>
                <li>A <b>política de privacidade</b> é montada automaticamente com o nome, o endereço e o contato da loja,
                  e aparece no site e no checkout. <a href="/privacidade" target="_blank">Ver a política</a></li>
                <li><b>Nome, telefone, e-mail e endereço</b> dos clientes são apagados sozinhos {{ retentionMonths }} meses depois
                  que o pedido é entregue ou cancelado. Os valores e os produtos continuam no relatório de vendas.</li>
              </ul>
            </div>
          </div>
          <details class="custom" [open]="!!f.privacy_policy?.trim()">
            <summary>Quero escrever minha própria política (opcional)</summary>
            <p class="muted small">Enquanto ficar vazio, vale a política automática. Use "## " para títulos e "- " para listas.</p>
            <textarea class="input policy" name="privacy" [(ngModel)]="f.privacy_policy" placeholder="(usando a política automática)"></textarea>
            <div class="policy-actions">
              <button class="btn sm outline" type="button" (click)="useTemplate(f, 'privacy')">Começar a partir da automática</button>
              @if (f.privacy_policy?.trim()) {
                <button class="btn sm ghost" type="button" (click)="f.privacy_policy = ''">Voltar a usar a automática</button>
              }
            </div>
          </details>
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
    /* minmax(0, ...): um conteúdo largo não estica o card para fora da tela no celular */
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px;
      @media (max-width: 1000px) { grid-template-columns: minmax(0, 1fr); }
      > * { min-width: 0; } }
    @media (max-width: 640px) { .card { padding: 16px; } }
    h3 { font-family: var(--font); font-size: 1rem; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .opt { font-style: normal; font-weight: 400; color: var(--muted); }
    small.ok { color: var(--ok); display: flex; align-items: center; gap: 4px; flex-wrap: wrap; a { text-decoration: underline; margin-left: 4px; } }
    .bad, small.bad { color: var(--sale); }

    .prefix { position: relative;
      > span { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--muted); }
      .input { padding-left: 32px; } }

    .cep-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
      .field { flex: 0 1 180px; } .cep-status { padding-top: 8px; } a { text-decoration: underline; } }
    .num-row { --cols: 2; @media (max-width: 640px) { grid-template-columns: 1fr 1fr; } }
    .city { display: flex; align-items: center; gap: 6px; font-weight: 600; margin-top: -4px; }
    .note { background: var(--warn-soft); border-radius: var(--radius-sm); padding: 10px 12px; line-height: 1.5; }
    .preview { margin-top: 14px; padding: 12px 14px; background: var(--bg); border-radius: var(--radius-sm);
      p { margin: 2px 0 0; font-weight: 500; } .link { margin-top: 6px; padding: 0; } }

    .days { display: flex; flex-direction: column; gap: 4px; margin-top: 10px; }
    .day { display: flex; align-items: center; gap: 10px; min-height: 52px; padding: 4px 0; border-bottom: 1px solid var(--line);
      &:last-child { border-bottom: 0; } }
    .day-name { display: flex; align-items: center; gap: 10px; width: 84px; flex-shrink: 0; font-weight: 600; cursor: pointer; }
    .closed .day-name { color: var(--muted); font-weight: 500; }
    /* os campos de hora dividem o espaço que sobra em vez de ter largura fixa */
    .times { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; max-width: 260px; }
    .input.time { flex: 1; min-width: 0; width: auto; min-height: 44px; padding: 6px 8px; text-align: center;
      font-variant-numeric: tabular-nums;
      /* no celular o toque no campo já abre o relógio; o ícone só roubava espaço da hora */
      @media (max-width: 640px) { &::-webkit-calendar-picker-indicator { display: none; } } }
    .copy { overflow-wrap: anywhere; }
    .copy { margin-top: 8px; padding: 0; text-align: left; }
    .switch { appearance: none; width: 40px; height: 24px; border-radius: 99px; background: var(--line); position: relative;
      cursor: pointer; transition: background .15s; flex-shrink: 0; margin: 0;
      &::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%;
        background: #fff; box-shadow: 0 1px 2px rgb(0 0 0 / .25); transition: transform .15s; }
      &:checked { background: var(--ink); &::after { transform: translateX(16px); } }
      &:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; } }

    .auto { display: flex; gap: 12px; padding: 14px 16px; background: var(--ok-soft); border-radius: var(--radius-sm); line-height: 1.5;
      > app-icon { color: var(--ok); flex-shrink: 0; margin-top: 2px; }
      p { margin: 4px 0 6px; } ul { margin: 0; padding-left: 18px; display: grid; gap: 4px; } a { text-decoration: underline; } }
    .days-field { max-width: 360px; margin-top: 16px; }
    .custom { margin-top: 16px;
      summary { cursor: pointer; font-weight: 600; font-size: .92rem; padding: 6px 0; }
      .muted { margin: 6px 0 10px; } }
    /* 16px no celular: abaixo disso o iPhone dá zoom ao tocar no campo */
    .policy { min-height: 260px; font-family: ui-monospace, Consolas, monospace; font-size: .85rem;
      @media (max-width: 640px) { font-size: 1rem; } }
    .policy-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }

    .actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; align-items: center; gap: 14px; flex-wrap: wrap;
      @media (max-width: 720px) { .btn { width: 100%; } } }
  `,
})
export class Settings {
  private api = inject(AdminApiService);
  private toast = inject(ToastService);
  private store = inject(StoreService);
  private http = inject(HttpClient);

  protected readonly weekdays = WEEKDAYS;
  protected readonly retentionMonths = RETENTION_MONTHS;

  protected form = signal<StoreSettings | null>(null);
  protected coupons = signal<Coupon[]>([]);
  protected saving = signal(false);
  protected error = signal('');

  protected whatsappText = signal('');
  protected week = signal<DayHours[]>([]);
  protected addr = signal<AddressParts>(emptyAddress());
  /** endereço escrito à mão antes desta tela existir (fica valendo até digitar um CEP) */
  protected legacyAddress = signal<string | null>(null);
  protected cepStatus = signal<'' | 'loading' | 'error'>('');
  private numberInput = viewChild<ElementRef<HTMLInputElement>>('numberInput');

  constructor() {
    this.api.settings().subscribe((s) => this.load(s));
    this.api.list<Coupon>('coupons').subscribe((list) => this.coupons.set(list));
  }

  private load(s: StoreSettings) {
    this.form.set(s);
    this.whatsappText.set(formatWhatsapp(s.whatsapp));
    this.week.set(parseHours(s.opening_hours));
    const parsed = parseAddress(s.address);
    this.addr.set(parsed ?? emptyAddress());
    this.legacyAddress.set(parsed ? null : s.address.trim() || null);
  }

  // ---------------------------------------------------------------- contato

  protected whatsappDigits() {
    return normalizeWhatsapp(this.whatsappText());
  }

  protected whatsappOk() {
    return isValidWhatsapp(this.whatsappDigits());
  }

  /** Ao sair do campo, mostra o número no formato padrão. */
  tidyWhatsapp() {
    if (this.whatsappOk()) this.whatsappText.set(formatWhatsapp(this.whatsappDigits()));
  }

  /** Colou: arruma assim que o texto entra no campo. */
  tidyWhatsappSoon() {
    setTimeout(() => this.tidyWhatsapp());
  }

  tidyInstagram(text: string) {
    return normalizeInstagram(text);
  }

  // ---------------------------------------------------------------- endereço

  onCep(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    const cep = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    this.addr.update((a) => ({ ...a, cep }));
    this.cepStatus.set('');
    if (digits.length === 8) this.lookupCep(digits);
  }

  private lookupCep(digits: string) {
    this.cepStatus.set('loading');
    this.http.get<any>(`https://viacep.com.br/ws/${digits}/json/`).subscribe({
      next: (r) => {
        if (r.erro) return this.cepStatus.set('error');
        this.cepStatus.set('');
        this.addr.update((a) => ({
          ...a,
          street: r.logradouro || '',
          district: r.bairro || '',
          city: r.localidade || '',
          state: r.uf || '',
        }));
        // falta só o número: leva o cursor para lá
        setTimeout(() => this.numberInput()?.nativeElement.focus());
      },
      error: () => this.cepStatus.set('error'),
    });
  }

  setAddr(key: keyof AddressParts, value: string) {
    this.addr.update((a) => ({ ...a, [key]: value }));
  }

  protected addressPreview() {
    const a = this.addr();
    return isAddressComplete(a) ? formatAddress(a) : this.legacyAddress();
  }

  clearAddress() {
    this.addr.set(emptyAddress());
    this.legacyAddress.set(null);
    this.cepStatus.set('');
  }

  // ---------------------------------------------------------------- horário

  setDay(index: number, change: Partial<DayHours>) {
    this.week.update((w) => w.map((d, i) => (i === index ? { ...d, ...change } : d)));
  }

  protected firstOpenDay() {
    return this.week().findIndex((d) => d.open);
  }

  copyHours() {
    const source = this.week()[this.firstOpenDay()];
    this.week.update((w) => w.map((d) => (d.open ? { ...d, from: source.from, to: source.to } : d)));
  }

  protected hoursPreview() {
    return formatHours(this.week());
  }

  // ---------------------------------------------------------------- privacidade

  /** Copia a política automática (já com os dados da loja) para o lojista editar. */
  useTemplate(f: StoreSettings, kind: 'privacy' | 'exchange') {
    const field = kind === 'privacy' ? 'privacy_policy' : 'exchange_policy';
    if (f[field]?.trim() && !confirm('Substituir o texto atual pela política automática?')) return;
    this.http
      .get<{ text: string }>(`/api/${kind}`, { params: { template: 'true' } })
      .subscribe((p) => this.form.set({ ...f, [field]: p.text }));
  }

  tidyCnpj(text: string) {
    return formatCnpj(text);
  }

  // ---------------------------------------------------------------- salvar

  /** Junta os campos simples da tela no texto que a loja guarda; devolve o erro, se houver. */
  private collect(f: StoreSettings): string | null {
    const whatsapp = this.whatsappDigits();
    if (whatsapp && !isValidWhatsapp(whatsapp)) return 'Confira o WhatsApp: precisa ter o DDD, ex.: (92) 99329-9773.';

    const a = this.addr();
    if (isAddressComplete(a)) f.address = formatAddress(a);
    else if (a.cep) return 'Complete o endereço: confira o CEP e a rua, ou toque em "Não mostrar endereço no site".';
    else f.address = this.legacyAddress() ?? '';

    const hours = this.hoursPreview();
    if (hours.length > HOURS_MAX) return 'Horários muito diferentes em cada dia: use o mesmo horário em mais dias para caber no site.';
    if (this.week().some((d) => d.open && d.from >= d.to)) return 'Confira o horário: a hora de fechar precisa ser depois da de abrir.';

    f.whatsapp = whatsapp;
    f.instagram = normalizeInstagram(f.instagram);
    f.opening_hours = hours;
    return null;
  }

  save(f: StoreSettings) {
    const problem = this.collect(f);
    this.error.set(problem ?? '');
    if (problem) return;
    this.saving.set(true);
    this.api.saveSettings(f).subscribe({
      next: (s) => {
        this.saving.set(false);
        this.store.settings.set(s);
        this.load(s);
        this.toast.show('Configurações salvas');
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }
}

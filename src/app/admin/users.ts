import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService, errorMessage } from '../core/auth';
import { AdminUser } from '../core/models';
import { Icon } from '../shared/icon';
import { CrudPage } from './crud-page';
import { Pager } from './pager';

/** Senha aleatória para mandar para a pessoa (ela troca depois em "Alterar minha senha"). */
function randomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const values = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(values, (v) => chars[v % chars.length]).join('');
}

@Component({
  selector: 'app-users',
  imports: [FormsModule, Icon, Pager],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Usuários</h1>
        <p class="muted">Quem pode entrar no painel. Todos têm acesso completo à loja.</p>
      </div>
      <button class="btn" (click)="open()"><app-icon name="plus" [size]="18" /> Novo usuário</button>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Nome</th><th>E-mail</th><th>Duas etapas</th><th></th></tr></thead>
        <tbody>
          @for (u of pageRows(); track u.id) {
            <tr>
              <td class="cell-main"><b>{{ u.name }}</b> @if (u.is_me) { <span class="badge soft">Você</span> }</td>
              <td data-label="E-mail">{{ u.email }}</td>
              <td data-label="Duas etapas"><span class="status" [class.on]="u.mfa_enabled" [class.off]="!u.mfa_enabled">{{ u.mfa_enabled ? 'Ativa' : 'Desativada' }}</span></td>
              <td class="actions">
                <button class="icon-btn" (click)="open(u)" aria-label="Editar"><app-icon name="edit" [size]="17" /></button>
                @if (!u.is_me) {
                  <button class="icon-btn" (click)="remove(u, u.name)" aria-label="Remover acesso"><app-icon name="trash" [size]="17" /></button>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="4" class="empty">{{ auth.mfaSetupRequired() ? 'Ative a verificação em duas etapas abaixo para ver a lista.' : 'Carregando...' }}</td></tr>
          }
        </tbody>
      </table>
    </div>
    <app-pager [page]="page()" [pages]="pages()" [total]="total()" noun="usuários" (pageChange)="pageNumber.set($event)" />

    <!-- verificação em duas etapas da minha conta -->
    <section class="card mine" id="mfa">
      <h3><app-icon name="shield" [size]="18" /> Verificação em duas etapas</h3>
      @if (recoveryCodes(); as codes) {
        <div class="codes-box">
          <p><b>Ativada!</b> Guarde estes códigos de recuperação num lugar seguro (papel ou gerenciador de senhas).
            Cada um permite entrar <b>uma vez</b> se você perder o celular. Eles não serão mostrados de novo.</p>
          <div class="codes">
            @for (c of codes; track c) {
              <code>{{ c }}</code>
            }
          </div>
          <button class="btn sm outline" type="button" (click)="copyCodes(codes)"><app-icon name="copy" [size]="15" /> Copiar códigos</button>
          <button class="btn sm" type="button" (click)="recoveryCodes.set(null)">Já guardei</button>
        </div>
      } @else if (auth.mfaEnabled()) {
        <p class="muted">Ativa. Ao entrar, além da senha, o painel pede o código do app autenticador.</p>
        <details>
          <summary class="small">Desativar</summary>
          <form class="row" style="--cols: 3; margin-top: 12px" (ngSubmit)="disableMfa()">
            <label class="field"><span>Senha</span>
              <input class="input" type="password" name="dpass" [(ngModel)]="mfaForm.password" required autocomplete="current-password" /></label>
            <label class="field"><span>Código do app</span>
              <input class="input" name="dcode" [(ngModel)]="mfaForm.code" required inputmode="numeric" maxlength="6" /></label>
            <div class="field" style="justify-content: end"><button class="btn danger" type="submit">Desativar</button></div>
          </form>
        </details>
      } @else if (mfaSetup(); as setup) {
        <ol class="steps">
          <li>Instale um app autenticador no celular (Google Authenticator, Microsoft Authenticator ou Authy).</li>
          <li>No app, toque em <b>adicionar conta</b> → <b>inserir chave</b> e digite a chave abaixo
            (no celular, você também pode <a [href]="setup.otpauth_uri">tocar aqui</a>).</li>
          <li>Digite o código de 6 dígitos que aparecer no app.</li>
        </ol>
        <div class="secret"><code>{{ formatSecret(setup.secret) }}</code>
          <button class="btn sm outline" type="button" (click)="copy(setup.secret)"><app-icon name="copy" [size]="15" /> Copiar</button></div>
        <form class="enable" (ngSubmit)="enableMfa()">
          <input class="input code" name="ecode" [(ngModel)]="mfaForm.code" required inputmode="numeric" maxlength="6" placeholder="000000" autocomplete="one-time-code" />
          <button class="btn" type="submit" [disabled]="mfaBusy()">Ativar</button>
        </form>
      } @else {
        <p class="muted">Além da senha, o painel passa a pedir um código que muda a cada 30 segundos no seu celular.
          Mesmo que alguém descubra a sua senha, não consegue entrar.</p>
        <button class="btn" type="button" (click)="startMfa()" [disabled]="mfaBusy()"><app-icon name="shield" [size]="16" /> Ativar verificação em duas etapas</button>
      }
      @if (mfaError()) {
        <p class="form-error">{{ mfaError() }}</p>
      }
    </section>

    <!-- minha senha -->
    @if (!auth.mfaSetupRequired()) {
    <section class="card mine">
      <h3><app-icon name="shield" [size]="18" /> Alterar minha senha</h3>
      <form #pf="ngForm" (ngSubmit)="changeMine(pf)" class="row" style="--cols: 3">
        <label class="field">
          <span>Senha atual</span>
          <input class="input" type="password" name="current" [(ngModel)]="pwd.current" required autocomplete="current-password" />
        </label>
        <label class="field">
          <span>Nova senha</span>
          <input class="input" type="password" name="next" [(ngModel)]="pwd.next" required minlength="8" autocomplete="new-password" />
          <small>Mínimo de 8 caracteres.</small>
        </label>
        <label class="field">
          <span>Repita a nova senha</span>
          <input class="input" type="password" name="confirm" [(ngModel)]="pwd.confirm" required autocomplete="new-password" />
        </label>
        <div class="mine-foot">
          @if (pwdError()) {
            <p class="form-error">{{ pwdError() }}</p>
          }
          <span class="muted small">Ao trocar, as sessões abertas em outros aparelhos são encerradas.</span>
          <button class="btn" type="submit" [disabled]="pwdSaving()">Salvar nova senha</button>
        </div>
      </form>
    </section>
    }

    @if (draft(); as d) {
      <div class="modal-backdrop" (click)="close()">
        <form class="modal" (click)="$event.stopPropagation()" (ngSubmit)="save()">
          <div class="modal-head">
            <h2>{{ d.id ? 'Editar usuário' : 'Novo usuário' }}</h2>
            <button type="button" class="icon-btn" (click)="close()" aria-label="Fechar"><app-icon name="x" /></button>
          </div>

          <label class="field">
            <span>Nome</span>
            <input class="input" name="name" [(ngModel)]="d.name" required autocomplete="off" />
          </label>
          <label class="field">
            <span>E-mail</span>
            <input class="input" type="email" name="email" [(ngModel)]="d.email" required autocomplete="off" />
          </label>

          @if (!d.is_me) {
            <label class="field">
              <span>{{ d.id ? 'Nova senha' : 'Senha' }} @if (d.id) { <small>(deixe vazio para manter)</small> }</span>
              <div class="pass">
                <input class="input" [type]="showPass() ? 'text' : 'password'" name="password" [(ngModel)]="d.password"
                  [required]="!d.id" minlength="8" autocomplete="new-password" />
                <button type="button" class="btn sm outline" (click)="showPass.set(!showPass())">{{ showPass() ? 'Ocultar' : 'Mostrar' }}</button>
                <button type="button" class="btn sm outline" (click)="d.password = generate()">Gerar</button>
              </div>
              <small>Mínimo de 8 caracteres. Envie para a pessoa por um canal privado.
                @if (d.id) { Trocar a senha encerra as sessões abertas dela. }</small>
            </label>
          } @else {
            <p class="muted small">Para trocar a sua senha, use "Alterar minha senha" na página.</p>
          }
          @if (d.id && !d.is_me && d.mfa_enabled) {
            <label class="check"><input type="checkbox" name="reset_mfa" [(ngModel)]="d.reset_mfa" />
              Desativar a verificação em duas etapas desta pessoa (perdeu o celular)</label>
          }

          @if (error()) {
            <p class="form-error">{{ error() }}</p>
          }
          <div class="modal-foot">
            <button type="button" class="btn ghost" (click)="close()">Cancelar</button>
            <button class="btn" type="submit" [disabled]="saving()">{{ d.id ? 'Salvar' : 'Criar acesso' }}</button>
          </div>
        </form>
      </div>
    }
  `,
  styles: `
    .mine { margin-top: 22px; h3 { display: flex; align-items: center; gap: 8px; font-family: var(--font); font-size: 1rem; } }
    .mine-foot { grid-column: 1 / -1; display: flex; align-items: center; justify-content: flex-end; gap: 14px; flex-wrap: wrap;
      .form-error { margin: 0; } }
    .pass { display: flex; flex-wrap: wrap; gap: 6px; .input { flex: 1 1 200px; } }
    .steps { padding-left: 20px; line-height: 1.7; margin: 0 0 12px; a { text-decoration: underline; } }
    .secret { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px;
      code { font-size: 1.05rem; letter-spacing: .08em; padding: 8px 12px; background: var(--bg); border: 1px dashed var(--line); border-radius: 8px; } }
    .enable { display: flex; gap: 8px; max-width: 320px; }
    .code { font-size: 1.2rem; letter-spacing: .3em; text-align: center; }
    .codes-box p { margin-bottom: 12px; }
    .codes { display: grid; grid-template-columns: repeat(4, max-content); gap: 8px 16px; margin-bottom: 14px;
      code { font-size: 1rem; padding: 4px 8px; background: var(--bg); border-radius: 6px; }
      @media (max-width: 640px) { grid-template-columns: repeat(2, max-content); } }
    details summary { cursor: pointer; color: var(--muted); }
  `,
})
export class Users extends CrudPage<AdminUser> {
  protected auth = inject(AuthService);
  private http = inject(HttpClient);

  protected resource = 'users' as const;
  protected override noun = 'Usuário';
  protected showPass = signal(false);
  protected pwd = { current: '', next: '', confirm: '' };
  protected pwdError = signal('');
  protected pwdSaving = signal(false);

  protected mfaSetup = signal<{ secret: string; otpauth_uri: string } | null>(null);
  protected recoveryCodes = signal<string[] | null>(null);
  protected mfaError = signal('');
  protected mfaBusy = signal(false);
  protected mfaForm = { code: '', password: '' };

  override ngOnInit() {
    // enquanto a verificação for obrigatória e não estiver ativa, a API só libera a seção de MFA
    if (!this.auth.mfaSetupRequired()) super.ngOnInit();
  }

  startMfa() {
    this.mfaError.set('');
    this.mfaBusy.set(true);
    this.api.mfaSetup().subscribe({
      next: (s) => {
        this.mfaBusy.set(false);
        this.mfaSetup.set(s);
      },
      error: (err) => {
        this.mfaBusy.set(false);
        this.mfaError.set(errorMessage(err));
      },
    });
  }

  enableMfa() {
    this.mfaError.set('');
    this.mfaBusy.set(true);
    this.api.mfaEnable(this.mfaForm.code).subscribe({
      next: (res) => {
        this.mfaBusy.set(false);
        this.auth.setSession(res.access_token, this.auth.name() ?? '');
        this.auth.setMfa('on');
        this.mfaSetup.set(null);
        this.mfaForm = { code: '', password: '' };
        this.recoveryCodes.set(res.recovery_codes);
        this.toast.show('Verificação em duas etapas ativada');
        this.load();
      },
      error: (err) => {
        this.mfaBusy.set(false);
        this.mfaForm.code = '';
        this.mfaError.set(errorMessage(err));
      },
    });
  }

  disableMfa() {
    if (!confirm('Desativar a verificação em duas etapas? O painel ficará protegido só pela senha.')) return;
    this.mfaError.set('');
    this.api.mfaDisable(this.mfaForm.password, this.mfaForm.code).subscribe({
      next: (res) => {
        this.auth.setSession(res.access_token, res.name);
        this.mfaForm = { code: '', password: '' };
        // em produção ela é obrigatória: a API avisa e o painel volta a pedir a ativação
        this.http.get<{ mfa_setup_required: boolean }>('/api/auth/me').subscribe((me) => {
          this.auth.setMfa(me.mfa_setup_required ? 'setup' : 'off');
          if (!me.mfa_setup_required) this.load();
        });
        this.toast.show('Verificação em duas etapas desativada');
      },
      error: (err) => this.mfaError.set(errorMessage(err)),
    });
  }

  formatSecret(secret: string) {
    return secret.replace(/(.{4})/g, '$1 ').trim();
  }

  copy(text: string) {
    navigator.clipboard?.writeText(text).then(() => this.toast.show('Copiado'));
  }

  copyCodes(codes: string[]) {
    this.copy(codes.join('\n'));
  }

  protected blank() {
    this.showPass.set(true);
    return { id: null, name: '', email: '', password: randomPassword(), is_me: false };
  }

  protected override toForm(u: AdminUser) {
    this.showPass.set(false);
    return { ...u, password: '', reset_mfa: false };
  }

  protected override toPayload(f: any) {
    return { name: f.name, email: f.email, password: f.password || null, reset_mfa: !!f.reset_mfa };
  }

  generate() {
    this.showPass.set(true);
    return randomPassword();
  }

  changeMine(form: NgForm) {
    this.pwdError.set('');
    if (this.pwd.next.length < 8) return this.pwdError.set('A nova senha precisa ter pelo menos 8 caracteres.');
    if (this.pwd.next !== this.pwd.confirm) return this.pwdError.set('As senhas novas não são iguais.');
    this.pwdSaving.set(true);
    this.api.changeMyPassword(this.pwd.current, this.pwd.next).subscribe({
      next: (res) => {
        this.auth.setSession(res.access_token, res.name); // continua logado neste aparelho
        this.pwdSaving.set(false);
        this.pwd = { current: '', next: '', confirm: '' };
        form.resetForm();
        this.toast.show('Senha alterada');
      },
      error: (err) => {
        this.pwdSaving.set(false);
        this.pwdError.set(errorMessage(err));
      },
    });
  }
}

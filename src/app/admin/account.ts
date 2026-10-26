import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AdminApiService } from '../core/admin-api.service';
import { AuthService, errorMessage } from '../core/auth';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';

/** Minha conta: segurança de quem está logado (verificação em duas etapas e senha). Vale só para esta pessoa. */
@Component({
  selector: 'app-account',
  imports: [FormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Minha conta</h1>
        <p class="muted">Segurança do seu acesso. Estas opções valem só para você ({{ auth.name() }}).</p>
      </div>
    </div>

    <!-- verificação em duas etapas -->
    <section class="card mine" id="mfa">
      <div class="sec-head">
        <h3><app-icon name="shield" [size]="18" /> Verificação em duas etapas</h3>
        <span class="state" [class.ok]="auth.mfaEnabled()" [class.warn]="!auth.mfaEnabled()">
          {{ auth.mfaEnabled() ? 'Protegida' : 'Sem proteção' }}
        </span>
      </div>
      @if (recoveryCodes(); as codes) {
        <div class="codes-box">
          <p><b>Ativada!</b> Guarde estes códigos de recuperação num lugar seguro (papel ou gerenciador de senhas).
            Cada um permite entrar <b>uma vez</b> se você perder o celular. Eles não serão mostrados de novo.</p>
          <div class="codes">
            @for (c of codes; track c) {
              <code>{{ c }}</code>
            }
          </div>
          <div class="btns">
            <button class="btn sm outline" type="button" (click)="copy(codes.join('\\n'))"><app-icon name="copy" [size]="15" /> Copiar códigos</button>
            <button class="btn sm" type="button" (click)="recoveryCodes.set(null)">Já guardei</button>
          </div>
        </div>
      } @else if (auth.mfaEnabled()) {
        <p class="muted">Ao entrar, além da senha, o painel pede o código do app autenticador do seu celular.</p>
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
          Mesmo que alguém descubra a sua senha, não consegue entrar.
          @if (auth.mfaSetupRequired()) { <b>Ela é obrigatória para usar as outras telas.</b> }</p>
        <button class="btn" type="button" (click)="startMfa()" [disabled]="mfaBusy()"><app-icon name="shield" [size]="16" /> Ativar agora</button>
      }
      @if (mfaError()) {
        <p class="form-error">{{ mfaError() }}</p>
      }
    </section>

    <!-- senha -->
    @if (!auth.mfaSetupRequired()) {
      <section class="card mine">
        <div class="sec-head"><h3><app-icon name="settings" [size]="18" /> Alterar minha senha</h3></div>
        <form #pf="ngForm" (ngSubmit)="changePassword(pf)" class="row" style="--cols: 3">
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

    <section class="card mine exit">
      <div>
        <b>Sair do painel</b>
        <span class="muted small">Encerra a sessão em todos os aparelhos.</span>
      </div>
      <button class="btn outline sm" type="button" (click)="auth.logout()"><app-icon name="logout" [size]="16" /> Sair</button>
    </section>
  `,
  styles: `
    .mine { margin-bottom: 16px; max-width: 860px; }
    .sec-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px;
      h3 { display: flex; align-items: center; gap: 8px; margin: 0; font-family: var(--font); font-size: 1rem; } }
    .state { padding: 3px 10px; border-radius: 999px; font-size: .75rem; font-weight: 700;
      &.ok { background: var(--ok-soft); color: var(--ok); } &.warn { background: var(--warn-soft); color: var(--warn); } }
    .mine-foot { grid-column: 1 / -1; display: flex; align-items: center; justify-content: flex-end; gap: 14px; flex-wrap: wrap;
      .form-error { margin: 0; } }
    .steps { padding-left: 20px; line-height: 1.7; margin: 0 0 12px; a { text-decoration: underline; } }
    .secret { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px;
      code { font-size: 1.05rem; letter-spacing: .08em; padding: 8px 12px; background: var(--bg); border: 1px dashed var(--line); border-radius: 8px; } }
    .enable { display: flex; gap: 8px; max-width: 320px; }
    .code { font-size: 1.2rem; letter-spacing: .3em; text-align: center; }
    .codes-box p { margin-bottom: 12px; }
    .codes { display: grid; grid-template-columns: repeat(4, max-content); gap: 8px 16px; margin-bottom: 14px;
      code { font-size: 1rem; padding: 4px 8px; background: var(--bg); border-radius: 6px; }
      @media (max-width: 640px) { grid-template-columns: repeat(2, max-content); } }
    .btns { display: flex; gap: 8px; flex-wrap: wrap; }
    details summary { cursor: pointer; color: var(--muted); min-height: 44px; display: flex; align-items: center; }
    .exit { display: flex; align-items: center; justify-content: space-between; gap: 12px;
      div { display: flex; flex-direction: column; } .btn { min-height: 44px; } }
    @media (max-width: 720px) {
      .mine-foot { justify-content: stretch; .btn { width: 100%; } }
      .enable { max-width: none; }
    }
  `,
})
export class Account {
  protected auth = inject(AuthService);
  private api = inject(AdminApiService);
  private toast = inject(ToastService);
  private http = inject(HttpClient);

  protected mfaSetup = signal<{ secret: string; otpauth_uri: string } | null>(null);
  protected recoveryCodes = signal<string[] | null>(null);
  protected mfaError = signal('');
  protected mfaBusy = signal(false);
  protected mfaForm = { code: '', password: '' };

  protected pwd = { current: '', next: '', confirm: '' };
  protected pwdError = signal('');
  protected pwdSaving = signal(false);

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
        this.http
          .get<{ mfa_setup_required: boolean }>('/api/auth/me')
          .subscribe((me) => this.auth.setMfa(me.mfa_setup_required ? 'setup' : 'off'));
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

  changePassword(form: NgForm) {
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

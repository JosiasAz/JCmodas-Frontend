import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, LoginResult, errorMessage } from '../core/auth';
import { renderGoogleButton } from '../core/google-signin';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="wrap">
      @if (!mfaToken()) {
        <form class="card box" (ngSubmit)="submit()">
          <img src="logo/jc-logo.svg" alt="JC Moda Masculina" class="logo" />
          <h1>Área do lojista</h1>
          <p class="muted">Entre para gerenciar produtos, promoções e pedidos.</p>
          <label class="field">
            <span>E-mail</span>
            <input class="input" type="email" name="email" [(ngModel)]="email" autocomplete="username" required />
          </label>
          <label class="field">
            <span>Senha</span>
            <input class="input" type="password" name="password" [(ngModel)]="password" autocomplete="current-password" required />
          </label>
          @if (error()) {
            <p class="error" role="alert">{{ error() }}</p>
          }
          <button class="btn lg block" type="submit" [disabled]="loading()">{{ loading() ? 'Entrando...' : 'Entrar' }}</button>
          @if (googleClientId()) {
            <div class="or small muted"><span>ou</span></div>
            <div #googleButton class="google"></div>
          }
          <a routerLink="/" class="back small muted">Voltar para a loja</a>
        </form>
      } @else {
        <form class="card box" (ngSubmit)="submitCode()">
          <img src="logo/jc-icone.svg" alt="" class="icon" />
          <h1>Verificação em duas etapas</h1>
          <p class="muted">
            @if (useRecovery()) {
              Digite um dos códigos de recuperação que você guardou. Cada um só funciona uma vez.
            } @else {
              Abra o app autenticador no celular e digite o código de 6 dígitos da JC Moda.
            }
          </p>
          <label class="field">
            <span>{{ useRecovery() ? 'Código de recuperação' : 'Código' }}</span>
            <input class="input code" name="code" [(ngModel)]="code" required autofocus
              [attr.inputmode]="useRecovery() ? 'text' : 'numeric'" autocomplete="one-time-code"
              [placeholder]="useRecovery() ? 'XXXX-XXXX' : '000000'" [maxlength]="useRecovery() ? 9 : 6" />
          </label>
          @if (error()) {
            <p class="error" role="alert">{{ error() }}</p>
          }
          <button class="btn lg block" type="submit" [disabled]="loading()">{{ loading() ? 'Conferindo...' : 'Entrar' }}</button>
          <button type="button" class="link small" (click)="toggleRecovery()">
            {{ useRecovery() ? 'Usar o código do app' : 'Perdi o celular: usar código de recuperação' }}
          </button>
          <button type="button" class="link small muted back" (click)="restart()">Voltar</button>
        </form>
      }
    </main>
  `,
  styles: `
    .wrap { min-height: 100vh; display: grid; place-items: center; padding: 20px; background: var(--sand); }
    .box { width: min(400px, 100%); padding: 32px; text-align: center; display: flex; flex-direction: column; }
    .logo { width: 130px; margin: 0 auto 16px; }
    .icon { width: 64px; margin: 0 auto 14px; }
    h1 { font-size: 1.6rem; margin-bottom: 4px; }
    .field { text-align: left; }
    .code { font-size: 1.4rem; letter-spacing: .3em; text-align: center; }
    .error { color: var(--sale); font-weight: 600; font-size: .88rem; }
    .back { display: inline-block; margin-top: 16px; }
    a.back { margin: 4px 0 -12px; padding-block: 12px; } /* mesma posição do texto, área de toque de 44px */
    .link { margin-top: 14px; }
    .or { display: flex; align-items: center; gap: 10px; margin: 18px 0 14px; }
    .or::before, .or::after { content: ''; flex: 1; border-top: 1px solid currentColor; opacity: .3; }
    .google { display: flex; justify-content: center; min-height: 44px; }
  `,
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  protected email = '';
  protected password = '';
  protected code = '';
  protected loading = signal(false);
  protected error = signal('');
  protected mfaToken = signal<string | null>(null);
  protected useRecovery = signal(false);
  protected googleClientId = signal<string | null>(null);
  private googleButton = viewChild<ElementRef<HTMLElement>>('googleButton');

  constructor() {
    this.auth.googleClientId().subscribe({ next: (res) => this.googleClientId.set(res.client_id), error: () => undefined });
    // o botão some na tela do código e volta ao clicar em "Voltar": desenha de novo a cada vez
    effect(() => {
      const el = this.googleButton()?.nativeElement;
      const clientId = this.googleClientId();
      if (!el || !clientId) return;
      renderGoogleButton(el, clientId, (credential) => this.run(this.auth.loginGoogle(credential))).catch((err: Error) =>
        this.error.set(err.message),
      );
    });
  }

  submit() {
    this.run(this.auth.login(this.email, this.password));
  }

  submitCode() {
    this.run(this.auth.verifyMfa(this.mfaToken()!, this.code));
  }

  toggleRecovery() {
    this.useRecovery.update((v) => !v);
    this.code = '';
    this.error.set('');
  }

  restart() {
    this.mfaToken.set(null);
    this.code = '';
    this.password = '';
    this.error.set('');
  }

  private run(request: ReturnType<AuthService['login']>) {
    this.loading.set(true);
    this.error.set('');
    request.subscribe({
      next: (res: LoginResult) => {
        this.loading.set(false);
        if (res.mfa_required && res.mfa_token) {
          this.mfaToken.set(res.mfa_token); // senha certa: falta o código
          return;
        }
        this.router.navigate([res.mfa_setup_required ? '/admin/conta' : '/admin']);
      },
      error: (err) => {
        this.loading.set(false);
        this.code = '';
        this.error.set(errorMessage(err));
        // token da 2ª etapa expirou (5 min): volta para a senha
        if (err.status === 401 && this.mfaToken() && /expirada/.test(errorMessage(err))) this.restart();
      },
    });
  }
}

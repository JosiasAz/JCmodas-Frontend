import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, tap, throwError } from 'rxjs';

const TOKEN_KEY = 'jc-admin-token';
const NAME_KEY = 'jc-admin-name';
const MFA_KEY = 'jc-admin-mfa'; // "on" | "setup" (precisa ativar) | "off"
const ACCOUNT_PAGE = '/admin/conta'; // onde se ativa a verificação em duas etapas
export const MFA_SETUP_MESSAGE = 'Ative a verificação em duas etapas para usar o painel';

/** Resposta do login: ou a sessão, ou o pedido do código de verificação em duas etapas. */
export interface LoginResult {
  access_token: string | null;
  name: string;
  mfa_required: boolean;
  mfa_token: string | null;
  mfa_enabled: boolean;
  mfa_setup_required: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly token = signal<string | null>(this.read(TOKEN_KEY));
  readonly name = signal<string | null>(this.read(NAME_KEY));
  readonly mfa = signal<string>(this.read(MFA_KEY) ?? 'off');
  readonly loggedIn = computed(() => !!this.token());
  readonly mfaEnabled = computed(() => this.mfa() === 'on');
  /** Em produção o painel só libera as telas depois de ativar a verificação em duas etapas. */
  readonly mfaSetupRequired = computed(() => this.mfa() === 'setup');

  /** 1ª etapa: senha. Se a conta tem verificação em duas etapas, devolve `mfa_token` para a 2ª etapa. */
  login(email: string, password: string) {
    return this.http
      .post<LoginResult>('/api/auth/login', { email, password })
      .pipe(tap((res) => this.applyLogin(res)));
  }

  /** 2ª etapa: código do app autenticador ou código de recuperação. */
  verifyMfa(mfaToken: string, code: string) {
    return this.http
      .post<LoginResult>('/api/auth/mfa', { mfa_token: mfaToken, code })
      .pipe(tap((res) => this.applyLogin(res)));
  }

  private applyLogin(res: LoginResult) {
    if (!res.access_token) return;
    this.setSession(res.access_token, res.name);
    this.setMfa(res.mfa_enabled ? 'on' : res.mfa_setup_required ? 'setup' : 'off');
  }

  /** Guarda o token (no login e quando a senha é trocada e a API devolve um token novo). */
  setSession(token: string, name: string) {
    this.token.set(token);
    this.name.set(name);
    this.write(TOKEN_KEY, token);
    this.write(NAME_KEY, name);
  }

  setMfa(state: 'on' | 'setup' | 'off') {
    this.mfa.set(state);
    this.write(MFA_KEY, state);
  }

  /** Sai e invalida o token no servidor (vale para todos os aparelhos). */
  logout() {
    const token = this.token();
    this.clear();
    if (token) {
      // chamada direta com o token antigo; o interceptor não reage a erro aqui (evita laço de logout)
      this.http
        .post('/api/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } })
        .subscribe({ error: () => undefined });
    }
    this.router.navigate(['/admin/login']);
  }

  /** Token expirado/revogado: só limpa e volta para o login. */
  expire() {
    this.clear();
    this.router.navigate(['/admin/login']);
  }

  private clear() {
    this.token.set(null);
    this.write(TOKEN_KEY, null);
    this.write(NAME_KEY, null);
    this.write(MFA_KEY, null);
  }

  private read(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private write(key: string, value: string | null) {
    try {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch {
      /* ignora */
    }
  }
}

/** Coloca o token nas chamadas do painel e desloga se ele expirar. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();
  const isAdmin = req.url.startsWith('/api/admin') || req.url === '/api/auth/me';
  if (token && isAdmin) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && isAdmin) auth.expire();
      if (err.status === 403 && isAdmin && err.error?.detail === MFA_SETUP_MESSAGE) {
        auth.setMfa('setup');
        router.navigateByUrl(ACCOUNT_PAGE);
      }
      return throwError(() => err);
    }),
  );
};

/** Protege o painel e, quando a verificação em duas etapas é obrigatória, prende na tela de ativação. */
export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.loggedIn()) return router.parseUrl('/admin/login');
  if (auth.mfaSetupRequired() && !state.url.startsWith(ACCOUNT_PAGE)) return router.parseUrl(ACCOUNT_PAGE);
  return true;
};

/** Mensagem amigável a partir de um erro da API. */
export function errorMessage(err: unknown): string {
  const e = err as HttpErrorResponse;
  const detail = e?.error?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail.map((d) => String(d.msg).replace(/^Value error, /, '')).join(' · ');
  }
  if (e?.status === 0) return 'Sem conexão com o servidor. Tente novamente.';
  return 'Algo deu errado. Tente novamente.';
}

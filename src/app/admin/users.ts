import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService, errorMessage } from '../core/auth';
import { AdminUser } from '../core/models';
import { Icon } from '../shared/icon';
import { initials } from '../shared/initials';
import { CrudPage } from './crud-page';
import { Pager } from './pager';

/** Senha aleatória para mandar para a pessoa (ela troca depois em "Minha conta"). */
function randomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const values = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(values, (v) => chars[v % chars.length]).join('');
}

/** Equipe: quem pode entrar no painel. A segurança da própria conta fica em "Minha conta". */
@Component({
  selector: 'app-users',
  imports: [FormsModule, RouterLink, Icon, Pager],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Equipe</h1>
        <p class="muted">Quem pode entrar no painel. Todos têm acesso completo à loja.</p>
      </div>
      <button class="btn outline" (click)="open()"><app-icon name="plus" [size]="18" /> Adicionar</button>
    </div>

    @if (unprotected() > 0) {
      <p class="notice">
        <app-icon name="shield" [size]="18" />
        <span>{{ unprotected() === 1 ? '1 pessoa está' : unprotected() + ' pessoas estão' }} sem verificação em 2 etapas.
          Peça para ativar em <b>Minha conta</b>.</span>
      </p>
    }

    <div class="people">
      @for (u of pageRows(); track u.id) {
        <article class="person card">
          <button type="button" class="main" (click)="open(u)" [attr.aria-label]="'Editar ' + u.name">
            <span class="avatar" aria-hidden="true">{{ initials(u.name) }}</span>
            <span class="info">
              <span class="name">{{ u.name }} @if (u.is_me) { <span class="badge soft">Você</span> }</span>
              <span class="email" [title]="u.email">{{ u.email }}</span>
              <span class="chip" [class.ok]="u.mfa_enabled" [class.warn]="!u.mfa_enabled">
                <app-icon [name]="u.mfa_enabled ? 'shield' : 'clock'" [size]="13" />
                {{ u.mfa_enabled ? 'Protegida' : 'Sem 2 etapas' }}
              </span>
            </span>
          </button>
          @if (u.is_me && !u.mfa_enabled) {
            <a routerLink="/admin/conta" class="fix small">Ativar</a>
          }
          <button type="button" class="icon-btn more" (click)="menuFor.set(u)" [attr.aria-label]="'Opções de ' + u.name">
            <app-icon name="dots" [size]="20" />
          </button>
        </article>
      } @empty {
        <div class="card empty-team">
          @if (items()) {
            <p>Só você tem acesso. Adicione quem ajuda na loja.</p>
            <button class="btn" (click)="open()"><app-icon name="plus" [size]="18" /> Adicionar pessoa</button>
          } @else {
            <p class="muted">Carregando...</p>
          }
        </div>
      }
    </div>
    <app-pager [page]="page()" [pages]="pages()" [total]="total()" noun="pessoas" (pageChange)="pageNumber.set($event)" />

    <!-- opções de uma pessoa (folha que sobe de baixo) -->
    @if (menuFor(); as u) {
      <div class="sheet-backdrop" (click)="menuFor.set(null)">
        <div class="sheet" role="dialog" [attr.aria-label]="'Opções de ' + u.name" (click)="$event.stopPropagation()">
          <div class="sheet-handle" aria-hidden="true"></div>
          <div class="sheet-title">
            <b>{{ u.name }}</b>
            <span class="muted small">{{ u.email }}</span>
          </div>
          <button type="button" class="sheet-item" (click)="menuFor.set(null); open(u)">
            <app-icon name="edit" [size]="20" /> Editar dados
          </button>
          @if (u.is_me) {
            <a routerLink="/admin/conta" class="sheet-item" (click)="menuFor.set(null)">
              <app-icon name="shield" [size]="20" /> Minha conta e segurança
            </a>
          } @else {
            <button type="button" class="sheet-item danger" (click)="removeAccess(u)">
              <app-icon name="trash" [size]="20" /> Remover acesso
            </button>
          }
          <button type="button" class="sheet-cancel" (click)="menuFor.set(null)">Cancelar</button>
        </div>
      </div>
    }

    @if (draft(); as d) {
      <div class="modal-backdrop" (click)="close()">
        <form class="modal" (click)="$event.stopPropagation()" (ngSubmit)="save()">
          <div class="modal-head">
            <h2>{{ d.id ? 'Editar pessoa' : 'Adicionar pessoa' }}</h2>
            <button type="button" class="icon-btn" (click)="close()" aria-label="Fechar"><app-icon name="x" /></button>
          </div>

          <label class="field">
            <span>Nome</span>
            <input class="input" name="name" [(ngModel)]="d.name" required autocomplete="off" />
          </label>
          <label class="field">
            <span>E-mail</span>
            <input class="input" type="email" name="email" [(ngModel)]="d.email" required autocomplete="off" inputmode="email" />
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
            <p class="muted small">Para trocar a sua senha, use <a routerLink="/admin/conta" class="link" (click)="close()">Minha conta</a>.</p>
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
            <button class="btn" type="submit" [disabled]="saving()">{{ d.id ? 'Salvar' : 'Adicionar à equipe' }}</button>
          </div>
        </form>
      </div>
    }
  `,
  styles: `
    .notice { display: flex; align-items: flex-start; gap: 10px; margin: 0 0 14px; padding: 12px 14px; border-radius: var(--radius-sm);
      background: var(--warn-soft); color: #6b4106; font-size: .9rem; }
    .people { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(340px, 100%), 1fr)); gap: 12px; }
    .person { display: flex; align-items: center; gap: 4px; padding: 6px 6px 6px 0; }
    .main { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; padding: 10px 6px 10px 16px;
      border: 0; background: none; text-align: left; cursor: pointer; border-radius: var(--radius); }
    .avatar { flex: none; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%;
      background: var(--sand); font-weight: 700; font-size: .9rem; letter-spacing: .02em; }
    .info { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .name { font-weight: 600; font-size: .98rem; display: flex; align-items: center; gap: 6px; }
    /* e-mail longo: uma linha só, com reticências (o completo aparece ao abrir) */
    .email { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--muted); font-size: .85rem; }
    .chip { align-self: flex-start; display: inline-flex; align-items: center; gap: 4px; margin-top: 4px; padding: 2px 9px;
      border-radius: 999px; font-size: .74rem; font-weight: 600;
      &.ok { background: var(--ok-soft); color: var(--ok); } &.warn { background: var(--warn-soft); color: var(--warn); } }
    .fix { flex: none; padding: 10px 6px; min-height: 44px; display: inline-flex; align-items: center; font-weight: 700;
      text-decoration: underline; text-underline-offset: 3px; }
    .more { flex: none; width: 44px; height: 44px; }
    .empty-team { grid-column: 1 / -1; text-align: center; padding: 36px 20px; p { margin-bottom: 14px; } }
    .pass { display: flex; flex-wrap: wrap; gap: 6px; .input { flex: 1 1 200px; } }
  `,
})
export class Users extends CrudPage<AdminUser> {
  protected auth = inject(AuthService);

  protected resource = 'users' as const;
  protected override noun = 'Acesso';
  protected showPass = signal(false);
  protected menuFor = signal<AdminUser | null>(null);
  protected unprotected = computed(() => (this.items() ?? []).filter((u) => !u.mfa_enabled).length);
  protected initials = initials;

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

  async removeAccess(u: AdminUser) {
    this.menuFor.set(null);
    const ok = await this.confirm.ask({
      title: `Remover o acesso de ${u.name}?`,
      message: 'A pessoa sai do painel na hora e não consegue mais entrar.',
      confirmLabel: 'Remover acesso',
      danger: true,
    });
    if (!ok) return;
    this.api.remove(this.resource, u.id).subscribe({
      next: () => {
        this.toast.show(`Acesso de ${u.name} removido`);
        this.load();
      },
      error: (err) => this.toast.error(errorMessage(err)),
    });
  }
}

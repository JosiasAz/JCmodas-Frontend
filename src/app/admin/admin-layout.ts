import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <aside class="side" [class.open]="menuOpen()">
        <a routerLink="/admin" class="brand"><img src="logo/jc-logo-horizontal-branca.svg" alt="JC Moda" /></a>
        <nav (click)="menuOpen.set(false)">
          @for (group of menu; track group.title) {
            <span class="group">{{ group.title }}</span>
            @for (item of group.items; track item.link) {
              <a [routerLink]="item.link" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.link === '/admin' }">
                <app-icon [name]="item.icon" [size]="18" /> {{ item.label }}
              </a>
            }
          }
        </nav>
        <div class="foot">
          <a routerLink="/" target="_blank"><app-icon name="external" [size]="16" /> Ver loja</a>
          <button (click)="auth.logout()"><app-icon name="logout" [size]="16" /> Sair</button>
        </div>
      </aside>

      @if (menuOpen()) {
        <div class="scrim" (click)="menuOpen.set(false)"></div>
      }
      <div class="content">
        <header class="topbar">
          <img src="logo/jc-logo-horizontal.svg" alt="JC Moda" />
          <a routerLink="/" target="_blank" class="icon-btn" aria-label="Ver loja"><app-icon name="external" /></a>
        </header>
        @if (!auth.mfaEnabled()) {
          <a routerLink="/admin/usuarios" fragment="mfa" class="mfa-banner">
            <app-icon name="shield" [size]="18" />
            <span><b>Proteja o painel:</b> ative a verificação em duas etapas.
              {{ auth.mfaSetupRequired() ? 'Ela é obrigatória para usar as outras telas.' : 'Leva 1 minuto.' }}</span>
            <app-icon name="arrow" [size]="16" />
          </a>
        }
        <main><router-outlet /></main>
      </div>

      <!-- celular: atalhos para o que mais se usa no dia a dia; o resto fica em "Mais" -->
      <nav class="tabbar" aria-label="Atalhos">
        @for (item of tabs; track item.link) {
          <a [routerLink]="item.link" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.link === '/admin' }"
            (click)="menuOpen.set(false)">
            <app-icon [name]="item.icon" [size]="22" /><span>{{ item.label }}</span>
          </a>
        }
        <button type="button" [class.active]="menuOpen()" (click)="menuOpen.set(!menuOpen())">
          <app-icon name="menu" [size]="22" /><span>Mais</span>
        </button>
      </nav>
    </div>
  `,
  styles: `
    .shell { display: grid; grid-template-columns: 248px 1fr; min-height: 100vh; }
    .side { position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; background: var(--ink); color: #cfcbc4; padding: 20px 14px; overflow-y: auto; }
    .brand img { height: 40px; margin: 4px 8px 22px; }
    nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .group { margin: 14px 10px 6px; font-size: .7rem; text-transform: uppercase; letter-spacing: .1em; color: #7d7972; }
    nav a { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; font-size: .92rem; font-weight: 500;
      &:hover { background: #222; color: #fff; }
      &.active { background: #fff; color: var(--ink); } }
    .foot { display: flex; flex-direction: column; gap: 4px; padding-top: 14px; border-top: 1px solid #2a2a2a;
      a, button { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border: 0; background: none; color: inherit; font-size: .88rem; cursor: pointer; border-radius: 8px; text-align: left;
        &:hover { background: #222; color: #fff; } } }
    .content { min-width: 0; }
    .mfa-banner { display: flex; align-items: center; gap: 10px; margin: 16px clamp(16px, 3vw, 36px) 0; padding: 12px 16px;
      border-radius: var(--radius); background: var(--warn-soft); color: #6b4106; font-size: .9rem;
      span { flex: 1; } &:hover { text-decoration: underline; } }
    main { padding: 28px clamp(16px, 3vw, 36px) 60px; max-width: 1280px; }
    .topbar, .tabbar { display: none; }
    @media (max-width: 900px) {
      .shell { grid-template-columns: 1fr; }
      .side { position: fixed; z-index: 90; left: 0; width: 270px; transform: translateX(-100%); transition: transform .2s;
        padding-bottom: calc(84px + env(safe-area-inset-bottom)); }
      .side.open { transform: none; }
      .scrim { position: fixed; inset: 0; z-index: 89; background: rgb(0 0 0 / .4); animation: fade .15s; }
      nav a { padding: 12px; font-size: 1rem; }
      .topbar { display: flex; align-items: center; justify-content: space-between; padding: 8px 8px 8px 16px;
        padding-top: calc(8px + env(safe-area-inset-top)); background: #fff; border-bottom: 1px solid var(--line);
        position: sticky; top: 0; z-index: 40;
        img { height: 30px; } }
      main { padding: 18px 16px calc(100px + env(safe-area-inset-bottom)); }
      .mfa-banner { margin: 12px 16px 0; }
      .tabbar { position: fixed; z-index: 95; inset: auto 0 0; display: grid; grid-template-columns: repeat(4, 1fr);
        padding-bottom: env(safe-area-inset-bottom); background: #fff; border-top: 1px solid var(--line);
        box-shadow: 0 -4px 16px rgb(0 0 0 / .05);
        a, button { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; min-height: 60px;
          border: 0; background: none; color: var(--muted); font-size: .72rem; font-weight: 600; cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          &.active { color: var(--ink); } } }
    }
  `,
})
export class AdminLayout {
  protected auth = inject(AuthService);
  protected menuOpen = signal(false);

  protected tabs = [
    { label: 'Resumo', link: '/admin', icon: 'chart' },
    { label: 'Pedidos', link: '/admin/pedidos', icon: 'box' },
    { label: 'Produtos', link: '/admin/produtos', icon: 'tag' },
  ];

  protected menu = [
    {
      title: 'Vendas',
      items: [
        { label: 'Resumo', link: '/admin', icon: 'chart' },
        { label: 'Pedidos', link: '/admin/pedidos', icon: 'box' },
      ],
    },
    {
      title: 'Catálogo',
      items: [
        { label: 'Produtos', link: '/admin/produtos', icon: 'tag' },
        { label: 'Categorias', link: '/admin/categorias', icon: 'grid' },
      ],
    },
    {
      title: 'Marketing',
      items: [
        { label: 'Promoções', link: '/admin/promocoes', icon: 'percent' },
        { label: 'Cupons', link: '/admin/cupons', icon: 'ticket' },
        { label: 'Combos', link: '/admin/combos', icon: 'gift' },
        { label: 'Anúncios', link: '/admin/anuncios', icon: 'megaphone' },
      ],
    },
    {
      title: 'Loja',
      items: [
        { label: 'Usuários', link: '/admin/usuarios', icon: 'user' },
        { label: 'Atividades', link: '/admin/atividades', icon: 'clock' },
        { label: 'Configurações', link: '/admin/configuracoes', icon: 'settings' },
      ],
    },
  ];
}

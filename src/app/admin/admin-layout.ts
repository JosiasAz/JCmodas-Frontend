import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../core/auth';
import { Icon } from '../shared/icon';
import { initials } from '../shared/initials';

interface MenuItem {
  label: string;
  link: string;
  icon: string;
}

// itens do dia a dia: ficam na barra de baixo do celular (e só lá)
const TABS: (MenuItem & { also?: string[] })[] = [
  { label: 'Início', link: '/admin', icon: 'chart' },
  { label: 'Pedidos', link: '/admin/pedidos', icon: 'box' },
  { label: 'Produtos', link: '/admin/produtos', icon: 'tag', also: ['/admin/categorias'] },
];

// o resto: no celular fica na folha "Mais", sem repetir as abas
const MORE: { title: string; items: MenuItem[] }[] = [
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
      { label: 'Equipe', link: '/admin/usuarios', icon: 'user' },
      { label: 'Configurações', link: '/admin/configuracoes', icon: 'settings' },
      { label: 'Atividades', link: '/admin/atividades', icon: 'clock' },
    ],
  },
];

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'moreOpen.set(false)' },
  template: `
    <div class="shell">
      <!-- computador: menu lateral completo -->
      <aside class="side">
        <a routerLink="/admin" class="brand"><img src="logo/jc-logo-horizontal-branca.svg" alt="JC Moda" /></a>
        <nav>
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
          <a routerLink="/admin/conta" routerLinkActive="active" class="me">
            <span class="avatar">{{ myInitials() }}</span>
            <span><b>{{ auth.name() }}</b><small>Minha conta</small></span>
          </a>
          <a routerLink="/" target="_blank"><app-icon name="external" [size]="16" /> Ver loja</a>
          <button (click)="auth.logout()"><app-icon name="logout" [size]="16" /> Sair</button>
        </div>
      </aside>

      <div class="content">
        <header class="topbar">
          <img src="logo/jc-logo-horizontal.svg" alt="JC Moda" />
          <a routerLink="/admin/conta" class="top-me" aria-label="Minha conta"><span class="avatar">{{ myInitials() }}</span></a>
        </header>
        @if (!auth.mfaEnabled() && !onAccount()) {
          <a routerLink="/admin/conta" fragment="mfa" class="mfa-banner">
            <app-icon name="shield" [size]="18" />
            <span><b>Proteja o painel:</b> ative a verificação em duas etapas.
              {{ auth.mfaSetupRequired() ? 'Ela é obrigatória para usar as outras telas.' : 'Leva 1 minuto.' }}</span>
            <app-icon name="arrow" [size]="16" />
          </a>
        }
        <main><router-outlet /></main>
      </div>

      <!-- celular: barra de baixo com o dia a dia; o resto fica em "Mais" -->
      <nav class="tabbar" aria-label="Navegação principal">
        @for (tab of tabs; track tab.link) {
          <a [routerLink]="tab.link" [class.active]="activeTab() === tab.link" [attr.aria-current]="activeTab() === tab.link ? 'page' : null"
            (click)="moreOpen.set(false)">
            <app-icon [name]="tab.icon" [size]="22" [stroke]="activeTab() === tab.link ? 2.4 : 1.8" /><span>{{ tab.label }}</span>
          </a>
        }
        <button type="button" [class.active]="moreOpen() || activeTab() === 'more'" (click)="moreOpen.set(!moreOpen())"
          [attr.aria-expanded]="moreOpen()">
          <app-icon name="menu" [size]="22" [stroke]="moreOpen() || activeTab() === 'more' ? 2.4 : 1.8" /><span>Mais</span>
        </button>
      </nav>

      @if (moreOpen()) {
        <div class="sheet-backdrop more-backdrop" (click)="moreOpen.set(false)">
          <div class="sheet more" role="dialog" aria-label="Mais opções" (click)="$event.stopPropagation()"
            (touchstart)="dragFrom = $any($event).touches[0].clientY"
            (touchend)="$any($event).changedTouches[0].clientY - dragFrom > 70 && moreOpen.set(false)">
            <div class="sheet-handle" aria-hidden="true"></div>
            @for (group of more; track group.title) {
              <span class="sheet-label">{{ group.title }}</span>
              <div class="more-grid">
                @for (item of group.items; track item.link) {
                  <a [routerLink]="item.link" routerLinkActive="on" class="more-item" (click)="moreOpen.set(false)">
                    <app-icon [name]="item.icon" [size]="22" /> {{ item.label }}
                  </a>
                }
              </div>
            }
            <a routerLink="/admin/conta" class="more-me" (click)="moreOpen.set(false)">
              <span class="avatar">{{ myInitials() }}</span>
              <span><b>{{ auth.name() }}</b><small>Minha conta e segurança</small></span>
              <app-icon name="right" [size]="18" />
            </a>
            <div class="more-foot">
              <a routerLink="/" target="_blank" class="sheet-item"><app-icon name="external" [size]="20" /> Ver loja</a>
              <button type="button" class="sheet-item" (click)="auth.logout()"><app-icon name="logout" [size]="20" /> Sair</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .shell { display: grid; grid-template-columns: 248px 1fr; min-height: 100vh; }
    .side { position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; background: var(--ink); color: #d6d2cb; padding: 20px 14px; overflow-y: auto; }
    .brand img { height: 40px; margin: 4px 8px 22px; }
    .side nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    /* #a8a49d sobre #111: contraste ~7:1 */
    .group { margin: 14px 12px 6px; font-size: .72rem; font-weight: 600; text-transform: uppercase; letter-spacing: .1em; color: #a8a49d; }
    .side nav a { position: relative; display: flex; align-items: center; gap: 10px; min-height: 40px; padding: 0 12px; border-radius: 8px; font-size: .92rem; font-weight: 500;
      &:hover { background: #1f1f1f; color: #fff; }
      /* item atual: marca à esquerda + fundo sutil (não parece um botão a ser clicado) */
      &.active { background: #242424; color: #fff; font-weight: 700;
        &::before { content: ''; position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px; border-radius: 3px; background: #fff; } } }
    .foot { display: flex; flex-direction: column; gap: 2px; padding-top: 12px; border-top: 1px solid #2a2a2a;
      a, button { display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 12px; border: 0; background: none; color: inherit; font-size: .88rem; cursor: pointer; border-radius: 8px; text-align: left;
        &:hover, &.active { background: #1f1f1f; color: #fff; } } }
    .me { min-height: 52px !important; margin-bottom: 4px;
      > span:last-child { display: flex; flex-direction: column; line-height: 1.25; min-width: 0; }
      b { color: #fff; font-size: .88rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      small { color: #a8a49d; font-size: .75rem; } }
    .avatar { flex: none; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%;
      background: #2e2e2e; color: #fff; font-size: .78rem; font-weight: 700; }
    .content { min-width: 0; }
    .mfa-banner { display: flex; align-items: center; gap: 10px; margin: 16px clamp(16px, 3vw, 36px) 0; padding: 12px 16px;
      border-radius: var(--radius); background: var(--warn-soft); color: #6b4106; font-size: .9rem;
      span { flex: 1; } &:hover { text-decoration: underline; } }
    main { padding: 28px clamp(16px, 3vw, 36px) 60px; max-width: 1280px; }
    .topbar, .tabbar { display: none; }

    @media (max-width: 900px) {
      .shell { grid-template-columns: 1fr; }
      .side { display: none; }
      .topbar { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px 6px 16px;
        padding-top: calc(6px + env(safe-area-inset-top)); background: #fff; border-bottom: 1px solid var(--line);
        position: sticky; top: 0; z-index: 40;
        img { height: 30px; } }
      .top-me { display: grid; place-items: center; width: 44px; height: 44px;
        .avatar { background: var(--sand); color: var(--ink); } }
      main { padding: 18px 16px calc(100px + env(safe-area-inset-bottom)); }
      .mfa-banner { margin: 12px 16px 0; }
      .tabbar { position: fixed; z-index: 95; inset: auto 0 0; display: grid; grid-template-columns: repeat(4, 1fr);
        padding-bottom: env(safe-area-inset-bottom); background: #fff; border-top: 1px solid var(--line);
        box-shadow: 0 -4px 16px rgb(0 0 0 / .05);
        a, button { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; min-height: 60px;
          border: 0; background: none; color: var(--muted); font-size: .72rem; font-weight: 600; cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          &.active { color: var(--ink); font-weight: 800; } } }
    }

    /* folha "Mais": fica acima do conteúdo e abaixo da barra de baixo, que continua visível */
    .more-backdrop { z-index: 94; padding-bottom: calc(61px + env(safe-area-inset-bottom)); }
    .more { padding-bottom: 12px; border-radius: 20px 20px 0 0 !important; }
    .more-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .more-item { display: flex; align-items: center; gap: 10px; min-height: 56px; padding: 0 14px; border-radius: 12px;
      background: var(--bg); font-weight: 600; font-size: .95rem; -webkit-tap-highlight-color: transparent;
      &:active { background: var(--sand); }
      &.on { background: var(--ink); color: #fff; } }
    .more-me { display: flex; align-items: center; gap: 12px; min-height: 64px; margin-top: 16px; padding: 0 12px;
      border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
      > span:nth-child(2) { flex: 1; display: flex; flex-direction: column; line-height: 1.3; min-width: 0; }
      small { color: var(--muted); }
      .avatar { width: 40px; height: 40px; background: var(--sand); color: var(--ink); } }
    .more-foot { display: grid; grid-template-columns: 1fr 1fr; margin-top: 4px; }
  `,
})
export class AdminLayout {
  protected auth = inject(AuthService);
  private router = inject(Router);
  protected moreOpen = signal(false);
  protected dragFrom = 0;

  protected tabs = TABS;
  protected more = MORE;
  protected menu = [
    {
      title: 'Vendas',
      items: [
        { label: 'Início', link: '/admin', icon: 'chart' },
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
    ...MORE,
  ];

  private url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** Aba acesa na barra de baixo ('more' quando a tela atual está dentro de "Mais"). */
  protected activeTab = computed(() => {
    const path = this.url().split(/[?#]/)[0];
    if (path === '/admin') return '/admin';
    const tab = TABS.find((t) => t.link !== '/admin' && [t.link, ...(t.also ?? [])].some((l) => path.startsWith(l)));
    return tab?.link ?? 'more';
  });

  protected onAccount = computed(() => this.url().startsWith('/admin/conta'));
  protected myInitials = computed(() => initials(this.auth.name() ?? '?'));
}

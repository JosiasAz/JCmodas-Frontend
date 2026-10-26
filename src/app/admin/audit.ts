import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '../shared/icon';
import { Pager } from './pager';

interface AuditEntry {
  id: number;
  created_at: string;
  user_email: string;
  action: string;
  entity: string;
  entity_id: string;
  summary: string;
  ip: string;
}

interface AuditPage {
  items: AuditEntry[];
  total: number;
  page: number;
  pages: number;
}

const ACTIONS: Record<string, string> = {
  criou: 'Criou',
  alterou: 'Alterou',
  excluiu: 'Excluiu',
  login: 'Entrou',
  login_falhou: 'Login falhou',
  mfa_falhou: 'Código errado',
  logout: 'Saiu',
  expirou: 'Expirou',
  codigo_recuperacao_usado: 'Usou código de recuperação',
};

const ENTITIES: Record<string, string> = {
  products: 'Produto',
  categories: 'Categoria',
  promotions: 'Promoção',
  coupons: 'Cupom',
  combos: 'Combo',
  banners: 'Anúncio',
  orders: 'Pedido',
  users: 'Usuário',
  settings: 'Configurações',
  uploads: 'Imagem',
  me: 'Minha conta',
};

// eventos que merecem atenção (possível ataque ou ação sensível)
const ALERT = new Set(['login_falhou', 'mfa_falhou', 'codigo_recuperacao_usado', 'excluiu']);

@Component({
  selector: 'app-audit',
  imports: [FormsModule, DatePipe, Icon, Pager],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Atividades</h1>
        <p class="muted">Quem fez o quê no painel: alterações, logins e tentativas que falharam.</p>
      </div>
    </div>

    <div class="toolbar">
      <input class="input" placeholder="Buscar por pessoa, ação ou pedido..." [ngModel]="search()"
        (ngModelChange)="search.set($event); pageNumber.set(1)" />
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Detalhe</th><th>IP</th></tr></thead>
        <tbody>
          @for (a of page()?.items; track a.id) {
            <tr [class.alert]="isAlert(a)">
              <td class="small nowrap cell-main">{{ a.created_at + 'Z' | date: 'dd/MM/yy HH:mm' }}</td>
              <td data-label="Quem">{{ a.user_email || '—' }}</td>
              <td data-label="Ação">
                <span class="status" [class.off]="isAlert(a)">{{ actionLabel(a.action) }}</span>
                @if (a.entity) {
                  <span class="muted small"> {{ entityLabel(a.entity) }}{{ a.entity_id ? ' #' + a.entity_id : '' }}</span>
                }
              </td>
              <td class="small" data-label="Detalhe">{{ a.summary }}</td>
              <td class="small muted" data-label="IP">{{ a.ip }}</td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="empty">{{ page() ? 'Nenhuma atividade encontrada.' : 'Carregando...' }}</td></tr>
          }
        </tbody>
      </table>
    </div>
    @if (page(); as p) {
      <app-pager [page]="p.page" [pages]="p.pages" [total]="p.total" noun="atividades" (pageChange)="pageNumber.set($event)" />
    }
    <p class="muted small hint"><app-icon name="shield" [size]="14" /> Linhas em vermelho merecem atenção:
      várias tentativas de login falhando seguidas podem indicar alguém tentando adivinhar a senha.</p>
  `,
  styles: `
    .nowrap { white-space: nowrap; }
    tr.alert { background: #fff7f8; }
    .hint { display: flex; align-items: center; gap: 6px; margin-top: 14px; }
  `,
})
export class Audit {
  private http = inject(HttpClient);

  protected search = signal('');
  protected pageNumber = signal(1);
  protected page = signal<AuditPage | null>(null);

  private query = computed(() => ({
    page: this.pageNumber(),
    ...(this.search().trim() ? { q: this.search().trim() } : {}),
  }));

  constructor() {
    effect((onCleanup) => {
      const sub = this.http
        .get<AuditPage>('/api/admin/audit', { params: this.query() })
        .subscribe((p) => this.page.set(p));
      onCleanup(() => sub.unsubscribe());
    });
  }

  actionLabel(action: string) {
    return ACTIONS[action] ?? action;
  }

  entityLabel(entity: string) {
    return ENTITIES[entity] ?? entity;
  }

  isAlert(a: AuditEntry) {
    return ALERT.has(a.action);
  }
}

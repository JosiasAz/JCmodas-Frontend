import { Directive, OnInit, computed, inject, signal } from '@angular/core';
import { AdminApiService, Resource } from '../core/admin-api.service';
import { errorMessage } from '../core/auth';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';

/**
 * Base dos cadastros do painel (lista + gaveta de edição).
 * Cada página só diz qual é o recurso, como é um registro em branco e, se precisar,
 * como converter o formulário para o formato da API.
 */
@Directive()
export abstract class CrudPage<T extends { id: number }> implements OnInit {
  protected api = inject(AdminApiService);
  protected toast = inject(ToastService);
  protected confirm = inject(ConfirmService);

  protected items = signal<T[] | null>(null);
  protected draft = signal<any | null>(null);
  protected saving = signal(false);
  protected error = signal('');

  protected abstract resource: Resource;
  protected abstract blank(): any;
  protected noun = 'Registro';
  /** explicação mostrada na confirmação de exclusão (padrão: "não pode ser desfeita") */
  protected removeHint = '';

  // paginação feita na tela: a API devolve a lista inteira e aqui mostramos uma página por vez
  protected readonly pageSize = 15;
  protected pageNumber = signal(1);

  /** Lista que vai para a paginação (as páginas com busca/filtro sobrescrevem). */
  protected rows(): T[] {
    return this.items() ?? [];
  }

  private allRows = computed(() => this.rows());
  protected pages = computed(() => Math.max(1, Math.ceil(this.allRows().length / this.pageSize)));
  protected total = computed(() => this.allRows().length);
  /** Página atual (volta para a última se uma exclusão ou filtro diminuir a lista). */
  protected page = computed(() => Math.min(this.pageNumber(), this.pages()));
  protected pageRows = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.allRows().slice(start, start + this.pageSize);
  });

  /** Registro da API -> formulário. */
  protected toForm(item: T): any {
    return structuredClone(item);
  }

  /** Formulário -> corpo enviado à API. */
  protected toPayload(form: any): any {
    return form;
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.list<T>(this.resource).subscribe((list) => this.items.set(list));
  }

  open(item?: T) {
    this.error.set('');
    this.draft.set(item ? this.toForm(item) : this.blank());
  }

  close() {
    this.draft.set(null);
  }

  save() {
    const form = this.draft();
    if (!form) return;
    this.saving.set(true);
    this.error.set('');
    this.api.save<T>(this.resource, this.toPayload(form), form.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.show(`${this.noun} salvo(a) com sucesso`);
        this.close();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }

  async remove(item: T, label: string) {
    const ok = await this.confirm.ask({
      title: `Excluir "${label}"?`,
      message: this.removeHint || 'Essa ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    this.api.remove(this.resource, item.id).subscribe({
      next: () => {
        this.toast.show(`"${label}" excluído(a)`);
        this.load();
      },
      error: (err) => this.toast.error(errorMessage(err)),
    });
  }
}

/** "2026-10-25T14:30:00" -> "2026-10-25T14:30" (formato do input datetime-local) */
export const toLocalInput = (iso: string | null) => (iso ? iso.slice(0, 16) : '');
export const fromLocalInput = (value: string | null) => value || null;

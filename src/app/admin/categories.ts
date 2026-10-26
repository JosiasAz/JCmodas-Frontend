import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Category } from '../core/models';
import { Icon } from '../shared/icon';
import { CrudPage } from './crud-page';
import { ImageInput } from './image-input';
import { Pager } from './pager';
import { ImgPipe } from '../shared/img.pipe';

@Component({
  selector: 'app-categories',
  imports: [FormsModule, RouterLink, RouterLinkActive, Icon, ImageInput, Pager, ImgPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="subtabs" aria-label="Catálogo">
      <a routerLink="/admin/produtos" routerLinkActive="active">Produtos</a>
      <a routerLink="/admin/categorias" routerLinkActive="active">Categorias</a>
    </nav>
    <div class="page-head">
      <div>
        <h1>Categorias</h1>
        <p class="muted">Organizam a vitrine e os filtros da loja.</p>
      </div>
      <button class="btn" (click)="open()"><app-icon name="plus" [size]="18" /> Nova categoria</button>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead><tr><th></th><th>Nome</th><th>Produtos</th><th>Ordem</th><th>Status</th><th></th></tr></thead>
        <tbody>
          @for (c of pageRows(); track c.id) {
            <tr>
              <td class="cell-thumb">
                @if (c.image) {
                  <img class="thumb" [src]="c.image | img" alt="" style="border-radius: 50%; width: 44px; height: 44px" />
                }
              </td>
              <td class="cell-main"><b>{{ c.name }}</b><br /><span class="muted small">/loja?categoria={{ c.slug }}</span></td>
              <td data-label="Produtos">{{ c.product_count }}</td>
              <td data-label="Ordem">{{ c.sort }}</td>
              <td data-label="Status"><span class="status" [class.on]="c.active" [class.off]="!c.active">{{ c.active ? 'Visível' : 'Oculta' }}</span></td>
              <td class="actions">
                <button class="icon-btn" (click)="open(c)" aria-label="Editar"><app-icon name="edit" [size]="17" /></button>
                <button class="icon-btn" (click)="remove(c, c.name)" aria-label="Excluir"><app-icon name="trash" [size]="17" /></button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="empty">{{ items() ? 'Nenhuma categoria cadastrada.' : 'Carregando...' }}</td></tr>
          }
        </tbody>
      </table>
    </div>
    <app-pager [page]="page()" [pages]="pages()" [total]="total()" noun="categorias" (pageChange)="pageNumber.set($event)" />

    @if (draft(); as d) {
      <div class="modal-backdrop" (click)="close()">
        <form class="modal" (click)="$event.stopPropagation()" (ngSubmit)="save()">
          <div class="modal-head">
            <h2>{{ d.id ? 'Editar categoria' : 'Nova categoria' }}</h2>
            <button type="button" class="icon-btn" (click)="close()" aria-label="Fechar"><app-icon name="x" /></button>
          </div>
          <label class="field">
            <span>Nome</span>
            <input class="input" name="name" [(ngModel)]="d.name" required placeholder="Ex.: Camisetas" />
          </label>
          <label class="field">
            <span>Ordem de exibição</span>
            <input class="input" type="number" name="sort" [(ngModel)]="d.sort" />
            <small>Números menores aparecem primeiro.</small>
          </label>
          <div class="field">
            <span>Imagem</span>
            <app-image-input [(value)]="d.image" />
          </div>
          <label class="check"><input type="checkbox" name="active" [(ngModel)]="d.active" /> Mostrar na loja</label>
          @if (error()) {
            <p class="form-error">{{ error() }}</p>
          }
          <div class="modal-foot">
            <button type="button" class="btn ghost" (click)="close()">Cancelar</button>
            <button class="btn" type="submit" [disabled]="saving()">Salvar</button>
          </div>
        </form>
      </div>
    }
  `,
})
export class Categories extends CrudPage<Category> {
  protected resource = 'categories' as const;
  protected override noun = 'Categoria';

  protected blank() {
    return { id: null, name: '', image: null, sort: (this.items()?.length ?? 0) + 1, active: true };
  }
}

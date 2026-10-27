import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Category, SizeGuide } from '../core/models';
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
          <!-- aparece no produto em "Qual meu tamanho?" -->
          <div class="field guide">
            <span>Tabela de medidas <em class="opt">(opcional)</em></span>
            @if (d.size_guide; as g) {
              <small>Meça a peça deitada na mesa, em centímetros. Linhas sem medida não aparecem.</small>
              <div class="guide-grid" [style.--cols]="g.columns.length">
                @for (c of g.columns; track $index; let ci = $index) {
                  <input class="input head" [name]="'col' + ci" [(ngModel)]="g.columns[ci]" [attr.aria-label]="'Nome da coluna ' + (ci + 1)" />
                }
                <span></span>
                @for (r of g.rows; track $index; let ri = $index) {
                  @for (c of r; track $index; let ci = $index) {
                    <input class="input" [name]="'cell' + ri + '-' + ci" [(ngModel)]="r[ci]"
                      [attr.inputmode]="ci ? 'decimal' : 'text'" [placeholder]="ci ? 'cm' : 'Tam.'" [attr.aria-label]="g.columns[ci] + ', linha ' + (ri + 1)" />
                  }
                  <button type="button" class="icon-btn" (click)="g.rows.splice(ri, 1)" aria-label="Remover linha"><app-icon name="trash" [size]="16" /></button>
                }
              </div>
              <div class="guide-actions">
                <button type="button" class="btn sm outline" (click)="g.rows.push(blankRow(g))"><app-icon name="plus" [size]="15" /> Tamanho</button>
                <button type="button" class="btn sm ghost" (click)="d.size_guide = null">Tirar a tabela</button>
              </div>
            } @else {
              <small>Mostra ao cliente as medidas de cada tamanho. Escolha um modelo para começar:</small>
              <div class="guide-actions">
                @for (p of presets; track p.label) {
                  <button type="button" class="btn sm outline" (click)="d.size_guide = fromPreset(p.columns)">{{ p.label }}</button>
                }
              </div>
            }
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
  styles: `
    .opt { font-style: normal; font-weight: 400; color: var(--muted); }
    .guide-grid { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)) 44px; gap: 6px; align-items: center;
      .input { min-height: 44px; padding: 8px; text-align: center; }
      .head { font-size: .8rem; font-weight: 600; background: var(--bg); } }
    .guide-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; .btn { min-height: 40px; } }
  `,
})
export class Categories extends CrudPage<Category> {
  protected resource = 'categories' as const;
  protected override noun = 'Categoria';

  /** modelos de tabela de medidas: só as colunas; as medidas quem preenche é o lojista */
  protected readonly presets = [
    { label: 'Camisetas e camisas', columns: ['Tamanho', 'Largura (cm)', 'Comprimento (cm)'] },
    { label: 'Calças e bermudas', columns: ['Tamanho', 'Cintura (cm)', 'Quadril (cm)', 'Comprimento (cm)'] },
  ];

  protected blank() {
    return { id: null, name: '', image: null, sort: (this.items()?.length ?? 0) + 1, active: true, size_guide: null };
  }

  protected fromPreset(columns: string[]): SizeGuide {
    const guide = { columns: [...columns], rows: [] as string[][] };
    guide.rows = ['P', 'M', 'G', 'GG'].map((size) => [size, ...this.blankRow(guide).slice(1)]);
    return guide;
  }

  protected blankRow(guide: SizeGuide) {
    return guide.columns.map(() => '');
  }
}

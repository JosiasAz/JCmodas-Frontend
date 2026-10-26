import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** "Anterior · Página X de Y · Próxima" das listas do painel (com uma página só, os botões aparecem desativados). */
@Component({
  selector: 'app-pager',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (total() > 0) {
      <div class="pager">
        <button class="btn sm outline" [disabled]="page() === 1" (click)="pageChange.emit(page() - 1)">Anterior</button>
        <span class="small">Página {{ page() }} de {{ pages() }} · {{ total() }} {{ noun() }}</span>
        <button class="btn sm outline" [disabled]="page() >= pages()" (click)="pageChange.emit(page() + 1)">Próxima</button>
      </div>
    }
  `,
  styles: `
    .pager { display: flex; justify-content: center; align-items: center; gap: 14px; margin-top: 16px; }
  `,
})
export class Pager {
  readonly page = input.required<number>();
  readonly pages = input.required<number>();
  readonly total = input.required<number>();
  readonly noun = input('itens');
  readonly pageChange = output<number>();
}

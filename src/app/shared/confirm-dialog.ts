import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { ConfirmService } from '../core/confirm.service';
import { Icon } from './icon';

/** Janela de confirmação: no celular sobe de baixo (perto do polegar), no computador fica no centro. */
@Component({
  selector: 'app-confirm-dialog',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'confirm.current() && confirm.answer(false)' },
  template: `
    @if (confirm.current(); as c) {
      <div class="backdrop" (click)="confirm.answer(false)">
        <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"
          [attr.aria-describedby]="c.message ? 'confirm-message' : null" (click)="$event.stopPropagation()">
          <span class="badge-icon" [class.danger]="c.danger"><app-icon [name]="c.danger ? 'trash' : 'check'" [size]="22" /></span>
          <h2 id="confirm-title">{{ c.title }}</h2>
          @if (c.message) {
            <p id="confirm-message">{{ c.message }}</p>
          }
          <div class="actions">
            <!-- o foco começa em "Cancelar": um Enter sem querer não apaga nada -->
            <button #cancel type="button" class="btn outline lg" (click)="confirm.answer(false)">{{ c.cancelLabel || 'Cancelar' }}</button>
            <button type="button" class="btn lg" [class.danger]="c.danger" (click)="confirm.answer(true)">{{ c.confirmLabel || 'Confirmar' }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .backdrop { position: fixed; inset: 0; z-index: 200; display: flex; align-items: flex-end; justify-content: center;
      padding: 0; background: rgb(0 0 0 / .45); animation: fade .15s;
      @media (min-width: 721px) { align-items: center; padding: 20px; } }
    .dialog { width: min(440px, 100%); padding: 28px 20px calc(20px + env(safe-area-inset-bottom)); background: #fff;
      border-radius: 20px 20px 0 0; text-align: center; animation: rise .2s ease-out;
      @media (min-width: 721px) { border-radius: 18px; padding: 28px; } }
    .badge-icon { display: inline-grid; place-items: center; width: 52px; height: 52px; margin-bottom: 12px; border-radius: 50%;
      background: var(--sand); color: var(--ink);
      &.danger { background: var(--sale-soft); color: var(--sale); } }
    h2 { margin: 0; font-family: var(--font); font-size: 1.2rem; font-weight: 700; overflow-wrap: anywhere; }
    p { margin: 8px 0 0; color: var(--muted); line-height: 1.5; }
    .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 24px;
      .btn { width: 100%; padding: 0 12px; } }
  `,
})
export class ConfirmDialog {
  protected confirm = inject(ConfirmService);
  private cancel = viewChild<ElementRef<HTMLButtonElement>>('cancel');

  constructor() {
    effect(() => this.cancel()?.nativeElement.focus());
  }
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../core/toast.service';
import { Icon } from './icon';

@Component({
  selector: 'app-toasts',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toasts" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class]="t.kind">
          <app-icon [name]="t.kind === 'error' ? 'x' : 'check'" [size]="18" />
          <span>{{ t.text }}</span>
          @if (t.action) {
            <a [routerLink]="t.action.link" (click)="toast.dismiss(t.id)">{{ t.action.label }}</a>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .toasts {
      position: fixed; z-index: 200; left: 50%; bottom: var(--toast-bottom, 24px); transform: translateX(-50%);
      display: flex; flex-direction: column; gap: 8px; width: min(440px, calc(100% - 32px));
    }
    .toast {
      display: flex; align-items: center; gap: 10px; padding: 14px 16px;
      border-radius: 12px; background: var(--ink); color: #fff; box-shadow: var(--shadow);
      font-size: .92rem; animation: up .2s ease-out;
      span { flex: 1; }
      a { font-weight: 700; text-decoration: underline; text-underline-offset: 3px; white-space: nowrap; }
    }
    .toast.error { background: var(--sale); }
    @keyframes up { from { transform: translateY(12px); opacity: 0; } }
  `,
})
export class Toasts {
  protected toast = inject(ToastService);
}

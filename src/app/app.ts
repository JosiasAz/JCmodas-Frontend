import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { StoreService } from './core/store.service';
import { ConfirmDialog } from './shared/confirm-dialog';
import { Toasts } from './shared/toasts';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toasts, ConfirmDialog],
  template: `<router-outlet /><app-toasts /><app-confirm-dialog />`,
})
export class App {
  constructor() {
    inject(StoreService).load();
  }
}

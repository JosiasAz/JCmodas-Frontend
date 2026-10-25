import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { StoreService } from './core/store.service';
import { Toasts } from './shared/toasts';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toasts],
  template: `<router-outlet /><app-toasts />`,
})
export class App {
  constructor() {
    inject(StoreService).load();
  }
}

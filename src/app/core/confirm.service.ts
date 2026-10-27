import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** texto do botão de confirmar (ex.: "Excluir") */
  confirmLabel?: string;
  cancelLabel?: string;
  /** ação destrutiva: botão vermelho */
  danger?: boolean;
}

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

/** Pergunta de confirmação com o visual da loja, no lugar do confirm() do navegador. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly current = signal<Pending | null>(null);

  ask(options: ConfirmOptions): Promise<boolean> {
    this.current()?.resolve(false); // só uma pergunta por vez
    return new Promise((resolve) => this.current.set({ ...options, resolve }));
  }

  answer(ok: boolean) {
    const pending = this.current();
    this.current.set(null);
    pending?.resolve(ok);
  }
}

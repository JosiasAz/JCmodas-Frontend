import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { CartService } from '../core/cart.service';
import { Combo, Product } from '../core/models';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import { MoneyPipe } from '../shared/money.pipe';
import { ImgPipe } from '../shared/img.pipe';

/** Uma peça do combo para o cliente escolher o tamanho (combo de 3 camisetas = 3 peças). */
interface Piece {
  product: Product;
  variantId: number | null;
}

@Component({
  selector: 'app-combos',
  imports: [FormsModule, RouterLink, Icon, MoneyPipe, ImgPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <header class="intro">
        <span class="badge sale">Preço fechado</span>
        <h1>Combos</h1>
        <p class="muted">Kits montados para você economizar. Escolha o tamanho de cada peça e adicione ao carrinho.</p>
      </header>

      @if (combos(); as list) {
        @for (c of list; track c.id) {
          <article class="combo card" [id]="c.slug">
            <div class="media">
              @if (c.image) {
                <img [src]="c.image | img" [alt]="c.name" />
              }
              @if (c.savings) {
                <span class="badge sale">Economize {{ c.savings | money }}</span>
              }
            </div>

            <div class="body">
              <h2>{{ c.name }}</h2>
              <p class="muted">{{ c.description }}</p>

              <div class="pieces">
                @for (piece of pieces()[c.id]; track $index) {
                  <div class="piece">
                    <img [src]="piece.product.images[0] | img" alt="" />
                    <div class="piece-info">
                      <a [routerLink]="['/produto', piece.product.slug]">{{ piece.product.name }}</a>
                      <span class="muted small">Avulso: {{ piece.product.final_price | money }}</span>
                    </div>
                    <select class="input" [(ngModel)]="piece.variantId" [attr.aria-label]="'Tamanho de ' + piece.product.name"
                      [class.missing]="tried().has(c.id) && !piece.variantId">
                      <option [ngValue]="null" disabled>Tamanho</option>
                      @for (v of piece.product.variants; track v.id) {
                        <option [ngValue]="v.id" [disabled]="!v.stock">
                          {{ v.size }}{{ v.color ? ' · ' + v.color : '' }}{{ v.stock ? '' : ' (esgotado)' }}
                        </option>
                      }
                    </select>
                  </div>
                }
              </div>

              <div class="foot">
                <div class="price">
                  <s>{{ c.original_price | money }}</s>
                  <strong>{{ c.price | money }}</strong>
                </div>
                <button class="btn lg" (click)="add(c)"><app-icon name="bag" [size]="18" /> Adicionar combo</button>
              </div>
              @if (tried().has(c.id) && !ready(c)) {
                <p class="error">Escolha o tamanho de todas as peças</p>
              }
            </div>
          </article>
        } @empty {
          <div class="empty">
            <h3>Nenhum combo disponível agora</h3>
            <a class="btn" routerLink="/loja">Ver produtos</a>
          </div>
        }
      } @else {
        <div class="skeleton" style="height: 320px"></div>
      }
    </div>
  `,
  styles: `
    .page { padding-top: 32px; }
    .intro { max-width: 620px; margin-bottom: 28px; h1 { margin: 10px 0 6px; } }
    .combo {
      display: grid; grid-template-columns: 340px 1fr; gap: 28px; padding: 0; overflow: hidden;
      margin-bottom: 22px; scroll-margin-top: 150px;
    }
    .media { position: relative; background: var(--sand); min-height: 100%;
      img { width: 100%; height: 100%; object-fit: cover; }
      .badge { position: absolute; top: 14px; left: 14px; }
    }
    .body { padding: 26px 26px 26px 0; }
    .pieces { display: flex; flex-direction: column; gap: 10px; margin: 18px 0; }
    .piece {
      display: grid; grid-template-columns: 52px 1fr 150px; align-items: center; gap: 14px;
      padding: 10px; border: 1px solid var(--line); border-radius: var(--radius-sm); background: var(--bg);
      img { width: 52px; height: 64px; object-fit: cover; border-radius: 6px; }
      a { font-weight: 600; display: block; &:hover { text-decoration: underline; } }
      select { min-height: 42px; }
      select.missing { border-color: var(--sale); }
    }
    .foot { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .price { display: flex; align-items: baseline; gap: 10px;
      s { color: var(--muted); } strong { font-size: 1.7rem; }
    }
    .error { color: var(--sale); font-weight: 600; font-size: .88rem; margin: 10px 0 0; }
    @media (max-width: 820px) {
      .combo { grid-template-columns: 1fr; }
      .media { aspect-ratio: 16 / 10; }
      .body { padding: 0 18px 22px; }
      .piece { grid-template-columns: 44px 1fr; select { grid-column: 1 / -1; } }
    }
  `,
})
export class Combos {
  private cart = inject(CartService);
  private toast = inject(ToastService);

  protected combos = signal<Combo[] | null>(null);
  protected pieces = signal<Record<number, Piece[]>>({});
  protected tried = signal(new Set<number>());

  constructor() {
    inject(ApiService)
      .combos()
      .subscribe((list) => {
        const pieces: Record<number, Piece[]> = {};
        for (const c of list) {
          pieces[c.id] = c.items.flatMap((i) =>
            Array.from({ length: i.quantity }, () => ({ product: i.product, variantId: null })),
          );
        }
        this.pieces.set(pieces);
        this.combos.set(list);
        // rolar até o combo do link (#kit-3-camisetas...)
        const hash = location.hash.slice(1);
        if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' }));
      });
  }

  ready(c: Combo) {
    return this.pieces()[c.id].every((p) => p.variantId);
  }

  add(c: Combo) {
    this.tried.update((s) => new Set(s).add(c.id));
    if (!this.ready(c)) return;
    this.cart.addCombo({
      combo_id: c.id,
      quantity: 1,
      variant_ids: this.pieces()[c.id].map((p) => p.variantId!),
      name: c.name,
    });
    this.toast.show(`${c.name} adicionado ao carrinho`, 'ok', { label: 'Ver carrinho', link: '/carrinho' });
  }
}

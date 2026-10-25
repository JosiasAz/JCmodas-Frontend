import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../core/models';
import { StoreService } from '../core/store.service';
import { MoneyPipe } from './money.pipe';

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = product();
    <a class="card" [routerLink]="['/produto', p.slug]" [class.soldout]="p.stock === 0">
      <div class="media">
        <img [src]="p.images[0]" [alt]="p.name" loading="lazy" />
        @if (p.images[1]) {
          <img class="alt" [src]="p.images[1]" alt="" loading="lazy" />
        }
        <div class="badges">
          @if (p.discount_percent) {
            <span class="badge sale">-{{ p.discount_percent }}%</span>
          }
          @for (b of extraBadges(); track b) {
            <span class="badge" [class.new]="b === 'Novo'">{{ b }}</span>
          }
        </div>
        @if (p.stock === 0) {
          <span class="soldout-tag">Esgotado</span>
        }
      </div>
      <div class="info">
        <h3>{{ p.name }}</h3>
        <div class="price">
          @if (p.old_price) {
            <s>{{ p.old_price | money }}</s>
          }
          <strong [class.sale]="p.old_price">{{ p.final_price | money }}</strong>
        </div>
        @if (store.pixPercent()) {
          <p class="pix">{{ store.pixPrice(p.final_price) | money }} no Pix</p>
        }
      </div>
    </a>
  `,
  styles: `
    .card { display: block; color: inherit; padding: 12px; transition: box-shadow .2s; }
    .card:hover { box-shadow: var(--shadow); }
    @media (max-width: 720px) { .card { padding: 8px; } }
    .media {
      position: relative;
      aspect-ratio: 4 / 5;
      border-radius: var(--radius);
      overflow: hidden;
      background: var(--sand);
      img { width: 100%; height: 100%; object-fit: cover; transition: opacity .35s, transform .5s; }
      .alt { position: absolute; inset: 0; opacity: 0; }
    }
    .card:hover .media img { transform: scale(1.03); }
    .card:hover .media .alt { opacity: 1; }
    .badges { position: absolute; top: 10px; left: 10px; display: flex; flex-wrap: wrap; gap: 6px; }
    .soldout-tag {
      position: absolute; inset: auto 10px 10px; padding: 6px; text-align: center;
      background: rgb(255 255 255 / .92); border-radius: 8px; font-size: .8rem; font-weight: 600;
    }
    .soldout img { filter: grayscale(.7); opacity: .7; }
    .info { padding: 12px 2px 0; }
    h3 {
      font-family: var(--font); font-size: .95rem; font-weight: 500; margin: 0 0 6px;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .price { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
    .price s { color: var(--muted); font-size: .85rem; }
    .price strong { font-size: 1.08rem; }
    .price strong.sale { color: var(--sale); }
    .pix { margin: 2px 0 0; font-size: .8rem; color: var(--ok); font-weight: 500; }
  `,
})
export class ProductCard {
  protected store = inject(StoreService);
  readonly product = input.required<Product>();
  // a porcentagem já aparece no selo vermelho; os demais selos (Leve 3 Pague 2, Novo...) vêm aqui
  protected extraBadges = computed(() =>
    this.product().badges.filter((b) => !(this.product().discount_percent && /%/.test(b))).slice(0, 2),
  );
}

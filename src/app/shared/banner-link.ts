import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Link de anúncio: os banners guardam o destino como texto ("/loja?categoria=polos" ou
 * "https://instagram.com/..."). Aqui separamos rota e parâmetros para o RouterLink.
 */
@Component({
  selector: 'app-banner-link',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (external()) {
      <a [href]="link()" target="_blank" rel="noopener" [class]="cls()"><ng-content /></a>
    } @else {
      <a [routerLink]="path()" [queryParams]="query()" [class]="cls()"><ng-content /></a>
    }
  `,
  styles: `:host { display: contents; }`,
})
export class BannerLink {
  readonly link = input.required<string>();
  readonly cls = input('');

  protected external = computed(() => /^https?:\/\//.test(this.link()));
  protected path = computed(() => this.link().split('?')[0] || '/');
  protected query = computed(() => {
    const [, search] = this.link().split('?');
    return search ? Object.fromEntries(new URLSearchParams(search)) : null;
  });
}

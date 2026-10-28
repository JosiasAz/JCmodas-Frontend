import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../environments/environment';

/** Fotos enviadas pelo painel ficam na API ("/static/..."): com a API em outro domínio, aponta para ela. */
@Pipe({ name: 'img' })
export class ImgPipe implements PipeTransform {
  /** Com `width`, usa a versão WebP reduzida que a API gera (GET /api/img/<largura>/<nome>). */
  transform(value: string | null | undefined, width?: 400 | 800 | 1200): string {
    if (!value) return '';
    const photo = width && /^\/static\/uploads\/([0-9a-f]{32}\.(jpg|png|webp))$/.exec(value);
    if (photo) return `${environment.apiUrl}/api/img/${width}/${photo[1]}`;
    return environment.apiUrl && value.startsWith('/static/') ? environment.apiUrl + value : value;
  }
}

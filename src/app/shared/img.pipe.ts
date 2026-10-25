import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../environments/environment';

/** Fotos enviadas pelo painel ficam na API ("/static/..."): com a API em outro domínio, aponta para ela. */
@Pipe({ name: 'img' })
export class ImgPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    return environment.apiUrl && value.startsWith('/static/') ? environment.apiUrl + value : value;
  }
}

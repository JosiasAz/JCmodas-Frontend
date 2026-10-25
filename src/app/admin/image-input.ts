import { ChangeDetectionStrategy, Component, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../core/admin-api.service';
import { errorMessage } from '../core/auth';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import { ImgPipe } from '../shared/img.pipe';

/** Envio de imagem do computador/celular ou URL colada. */
@Component({
  selector: 'app-image-input',
  imports: [FormsModule, Icon, ImgPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="image-input">
      @if (value() && !multiple()) {
        <div class="preview">
          <img [src]="value() | img" alt="" />
          <button type="button" class="icon-btn" (click)="value.set(null)" aria-label="Remover imagem"><app-icon name="x" [size]="16" /></button>
        </div>
      }
      <div class="actions">
        <label class="btn outline sm">
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden (change)="upload($event)" [multiple]="multiple()" />
          <app-icon name="upload" [size]="16" /> {{ uploading() ? 'Enviando...' : label() }}
        </label>
        @if (!multiple()) {
          <input class="input" [ngModel]="value()" (ngModelChange)="value.set($event || null)" placeholder="ou cole o link da imagem" />
        }
      </div>
    </div>
  `,
  styles: `
    .image-input { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .preview { position: relative; width: 84px; height: 100px; border-radius: 8px; overflow: hidden; background: var(--sand);
      img { width: 100%; height: 100%; object-fit: cover; }
      button { position: absolute; top: 4px; right: 4px; width: 26px; height: 26px; background: #fff; } }
    .actions { flex: 1; display: flex; gap: 8px; align-items: center; min-width: 220px;
      .input { min-height: 38px; font-size: .85rem; } label { cursor: pointer; } }
  `,
})
export class ImageInput {
  private api = inject(AdminApiService);
  private toast = inject(ToastService);

  readonly value = model<string | null>(null);
  readonly multiple = input(false);
  readonly label = input('Enviar imagem');
  /** No modo múltiplo, cada imagem enviada sai por aqui. */
  readonly uploaded = output<string>();
  protected uploading = signal(false);

  upload(event: Event) {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    (event.target as HTMLInputElement).value = '';
    for (const file of files) {
      this.uploading.set(true);
      this.api.upload(file).subscribe({
        next: ({ url }) => {
          this.uploading.set(false);
          if (this.multiple()) this.uploaded.emit(url);
          else this.value.set(url);
        },
        error: (err) => {
          this.uploading.set(false);
          this.toast.error(errorMessage(err));
        },
      });
    }
  }
}

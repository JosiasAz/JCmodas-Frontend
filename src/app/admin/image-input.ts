import { ChangeDetectionStrategy, Component, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../core/admin-api.service';
import { errorMessage } from '../core/auth';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { Icon } from '../shared/icon';
import { ImgPipe } from '../shared/img.pipe';
import { ImageCropper } from './image-cropper';

/**
 * Envio de imagem do computador/celular (inclusive direto da câmera) ou URL colada.
 * Com [aspect], a foto passa pelo recorte antes de subir, já no formato em que aparece na loja.
 */
@Component({
  selector: 'app-image-input',
  imports: [FormsModule, Icon, ImgPipe, ImageCropper],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="image-input">
      @if (value() && !multiple()) {
        <div class="preview-wrap">
          <div class="preview" [class.round]="round()" [style.aspect-ratio]="aspect() ?? '84 / 100'">
            <img [src]="value() | img" alt="" />
            <button type="button" class="icon-btn" (click)="value.set(null)" aria-label="Remover imagem"><app-icon name="x" [size]="16" /></button>
          </div>
          @if (aspect()) {
            <button type="button" class="btn sm ghost" (click)="adjust()"><app-icon name="edit" [size]="14" /> Ajustar</button>
          }
        </div>
      }
      <div class="actions">
        <!-- capture: no celular abre a câmera traseira direto (no computador o botão nem aparece) -->
        <label class="btn sm camera">
          <input type="file" accept="image/*" capture="environment" hidden (change)="upload($event)" />
          <app-icon name="camera" [size]="16" /> Tirar foto
        </label>
        <label class="btn outline sm">
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden (change)="upload($event)" [multiple]="multiple()" />
          <app-icon name="upload" [size]="16" /> {{ label() }}
        </label>
        <button type="button" class="btn outline sm" (click)="openSaved()">
          <app-icon name="grid" [size]="16" /> Fotos salvas
        </button>
        @if (pending()) {
          <span class="sending small muted">Enviando {{ pending() }} foto{{ pending() > 1 ? 's' : '' }}...</span>
        }
        @if (!multiple()) {
          <input class="input" [ngModel]="value()" (ngModelChange)="value.set($event || null)" placeholder="ou cole o link da imagem" />
        }
      </div>
    </div>
    @if (saved(); as photos) {
      <div class="modal-backdrop saved-backdrop" (click)="saved.set(null)">
        <div class="modal" role="dialog" aria-label="Fotos salvas" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h2>Fotos salvas</h2>
            <button type="button" class="icon-btn" (click)="saved.set(null)" aria-label="Fechar"><app-icon name="x" /></button>
          </div>
          <p class="small muted">Fotos que já estão guardadas no banco. {{ multiple() ? 'Toque nas que quiser usar.' : 'Toque na foto para usar.' }}</p>
          @if (!photos.length) {
            <p class="muted">Nenhuma foto salva ainda.</p>
          }
          <div class="saved-grid">
            @for (p of photos; track p.url) {
              <div class="saved-cell">
                <button type="button" class="saved-item" [class.on]="chosen().includes(p.url)" (click)="pick(p.url)"
                  [attr.aria-pressed]="multiple() ? chosen().includes(p.url) : null">
                  <img [src]="p.url | img: 400" alt="" loading="lazy" />
                  @if (p.in_use) { <span class="tag">em uso</span> }
                  @if (chosen().includes(p.url)) { <span class="check"><app-icon name="check" [size]="14" /></span> }
                </button>
                @if (!p.in_use) {
                  <button type="button" class="icon-btn trash" (click)="removeSaved(p.url)" aria-label="Apagar foto">
                    <app-icon name="trash" [size]="15" />
                  </button>
                }
              </div>
            }
          </div>
          @if (multiple()) {
            <div class="modal-foot">
              <button type="button" class="btn ghost" (click)="saved.set(null)">Cancelar</button>
              <button type="button" class="btn" [disabled]="!chosen().length" (click)="useChosen()">
                Usar {{ chosen().length }} foto{{ chosen().length === 1 ? '' : 's' }}
              </button>
            </div>
          }
        </div>
      </div>
    }
    @if (cropping(); as source) {
      <app-image-cropper [source]="source" [aspect]="aspect()!" [round]="round()"
        (done)="cropping.set(null); send($event)" (cancel)="cropping.set(null)" />
    }
  `,
  styles: `
    .image-input { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .preview-wrap { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .preview { position: relative; width: 84px; max-height: 100px; border-radius: 8px; overflow: hidden; background: var(--sand);
      &.round { border-radius: 50%; button { top: 50%; right: 50%; transform: translate(50%, -50%); opacity: 0; } &:hover button { opacity: 1; } }
      img { width: 100%; height: 100%; object-fit: cover; }
      button { position: absolute; top: 4px; right: 4px; width: 26px; height: 26px; background: #fff; } }
    .actions { flex: 1; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; min-width: 220px;
      .input { flex: 1; min-width: 200px; min-height: 38px; font-size: .85rem; } label { cursor: pointer; } }
    .camera { display: none; }
    .saved-backdrop { z-index: 110; } /* abre por cima do formulário do produto */
    .saved-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 10px; margin: 14px 0; }
    .saved-cell { position: relative;
      .trash { position: absolute; top: 4px; left: 4px; width: 30px; height: 30px; background: #fff; color: var(--sale); } }
    .saved-item { position: relative; width: 100%; aspect-ratio: 84 / 100; padding: 0; border: 2px solid transparent; border-radius: 8px;
      overflow: hidden; background: var(--sand); cursor: pointer;
      img { width: 100%; height: 100%; object-fit: cover; display: block; }
      &.on { border-color: var(--ink, #111); }
      .tag { position: absolute; left: 4px; bottom: 4px; font-size: .7rem; padding: 1px 6px; border-radius: 6px; background: #fff; }
      .check { position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border-radius: 50%; display: grid;
        place-items: center; background: var(--ink, #111); color: #fff; } }
    @media (pointer: coarse) {
      .camera { display: inline-flex; }
      .actions label { flex: 1; min-height: 44px; }
    }
  `,
})
export class ImageInput {
  private api = inject(AdminApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  readonly value = model<string | null>(null);
  readonly multiple = input(false);
  readonly label = input('Enviar imagem');
  /** largura / altura da imagem na loja; sem ele, envia a foto como veio */
  readonly aspect = input<number | null>(null);
  /** moldura redonda (categorias) */
  readonly round = input(false);
  /** No modo múltiplo, cada imagem enviada sai por aqui. */
  readonly uploaded = output<string>();
  /** Quantas imagens ainda estão subindo. */
  protected pending = signal(0);
  /** foto aberta no recorte */
  protected cropping = signal<Blob | null>(null);
  /** galeria de fotos já salvas no banco (null = fechada) */
  protected saved = signal<{ url: string; in_use: boolean }[] | null>(null);
  protected chosen = signal<string[]>([]);

  openSaved() {
    this.chosen.set([]);
    this.api.savedUploads().subscribe({
      next: (photos) => this.saved.set(photos),
      error: (err) => this.toast.error(errorMessage(err)),
    });
  }

  pick(url: string) {
    if (!this.multiple()) {
      this.saved.set(null);
      this.value.set(url);
      return;
    }
    this.chosen.update((list) => (list.includes(url) ? list.filter((u) => u !== url) : [...list, url]));
  }

  async removeSaved(url: string) {
    const ok = await this.confirm.ask({
      title: 'Apagar esta foto?',
      message: 'Ela sai do banco de vez. Fotos em uso na loja não aparecem com a lixeira.',
      confirmLabel: 'Apagar',
      danger: true,
    });
    if (!ok) return;
    this.api.deleteUpload(url).subscribe({
      next: () => {
        this.saved.update((list) => list?.filter((p) => p.url !== url) ?? null);
        this.chosen.update((list) => list.filter((u) => u !== url));
        this.toast.show('Foto apagada');
      },
      error: (err) => this.toast.error(errorMessage(err)),
    });
  }

  useChosen() {
    this.chosen().forEach((url) => this.uploaded.emit(url));
    this.saved.set(null);
  }

  upload(event: Event) {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    (event.target as HTMLInputElement).value = '';
    if (this.aspect() && !this.multiple() && files[0]) {
      this.cropping.set(files[0]);
      return;
    }
    files.forEach((file) => this.send(file));
  }

  /** reabre a imagem atual no recorte */
  async adjust() {
    try {
      const res = await fetch(new ImgPipe().transform(this.value()));
      if (!res.ok) throw new Error();
      this.cropping.set(await res.blob());
    } catch {
      this.toast.error('Não deu para abrir esta imagem. Envie a foto de novo para ajustar.');
    }
  }

  send(file: File) {
    this.pending.update((n) => n + 1);
    this.api.upload(file).subscribe({
      next: ({ url }) => {
        this.pending.update((n) => n - 1);
        if (this.multiple()) this.uploaded.emit(url);
        else this.value.set(url);
      },
      error: (err) => {
        this.pending.update((n) => n - 1);
        this.toast.error(errorMessage(err));
      },
    });
  }
}

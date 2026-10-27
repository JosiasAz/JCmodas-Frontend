import { ChangeDetectionStrategy, Component, computed, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { Icon } from '../shared/icon';

const OUTPUT_SIDE = 1200; // maior lado da imagem final, em px
const MAX_ZOOM = 4;

/**
 * Recorte antes do envio: a moldura tem o mesmo formato que a imagem terá na loja
 * (círculo nas categorias, retângulo nos anúncios e combos). Arrasta para posicionar e
 * aproxima/afasta no controle; afastando além da borda, o espaço que sobra fica branco.
 */
@Component({
  selector: 'app-image-cropper',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="crop-backdrop" (click)="cancel.emit()">
      <div class="crop" (click)="$event.stopPropagation()" role="dialog" aria-label="Ajustar imagem">
        <div class="modal-head">
          <h2>Ajustar imagem</h2>
          <button type="button" class="icon-btn" (click)="cancel.emit()" aria-label="Fechar"><app-icon name="x" /></button>
        </div>
        <p class="muted small">Arraste a foto para posicionar. A moldura mostra exatamente como ela vai aparecer no site.</p>

        <div class="frame" [class.round]="round()" [style.width.px]="frame().w" [style.height.px]="frame().h"
          (pointerdown)="grab($event)" (pointermove)="drag($event)" (pointerup)="drop()" (pointercancel)="drop()"
          (wheel)="wheel($event)">
          @if (img(); as i) {
            <img [src]="i.src" alt="" draggable="false"
              [style.width.px]="i.naturalWidth * scale()" [style.height.px]="i.naturalHeight * scale()"
              [style.transform]="'translate(' + x() + 'px, ' + y() + 'px)'" />
          } @else {
            <span class="muted small">Carregando...</span>
          }
        </div>

        <div class="zoom">
          <app-icon name="minus" [size]="16" />
          <input type="range" [min]="minZoom()" [max]="maxZoom" step="0.01" [value]="zoom()"
            (input)="setZoom(+$any($event.target).value)" aria-label="Aproximar ou afastar" />
          <app-icon name="plus" [size]="16" />
        </div>
        <div class="presets">
          <button type="button" class="btn sm outline" (click)="center(1)">Preencher</button>
          <button type="button" class="btn sm outline" (click)="center(minZoom())">Foto inteira</button>
          <button type="button" class="btn sm outline" (click)="center(zoom())">Centralizar</button>
        </div>

        <div class="modal-foot">
          <button type="button" class="btn ghost" (click)="cancel.emit()">Cancelar</button>
          <button type="button" class="btn" [disabled]="!img()" (click)="confirm()"><app-icon name="check" [size]="16" /> Usar imagem</button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .crop-backdrop { position: fixed; inset: 0; z-index: 200; display: grid; place-items: center; padding: 16px;
      background: rgb(0 0 0 / 0.5); animation: fade 0.15s; }
    .crop { width: min(420px, 100%); max-height: 100%; overflow-y: auto; background: var(--bg); border-radius: 16px; padding: 20px;
      .modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; h2 { font-size: 1.2rem; } } }
    .frame { position: relative; margin: 16px auto; overflow: hidden; background: #fff; border-radius: 12px; cursor: grab;
      touch-action: none; user-select: none; box-shadow: 0 0 0 1px var(--line);
      &.round { border-radius: 50%; }
      &:active { cursor: grabbing; }
      img { position: absolute; top: 0; left: 0; max-width: none; pointer-events: none; }
      span { position: absolute; inset: 0; display: grid; place-items: center; } }
    .zoom { display: flex; align-items: center; gap: 10px; color: var(--muted);
      input { flex: 1; accent-color: var(--ink); } }
    .presets { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 12px; }
    .modal-foot { margin-top: 18px; }
  `,
})
export class ImageCropper implements OnInit, OnDestroy {
  /** Arquivo escolhido ou imagem já salva (blob) */
  readonly source = input.required<Blob>();
  /** largura / altura da imagem na loja */
  readonly aspect = input(1);
  readonly round = input(false);
  readonly done = output<File>();
  readonly cancel = output<void>();

  protected readonly maxZoom = MAX_ZOOM;
  protected img = signal<HTMLImageElement | null>(null);
  /** 1 = a foto cobre a moldura toda; menor que 1 = sobra espaço branco */
  protected zoom = signal(1);
  protected x = signal(0);
  protected y = signal(0);

  protected frame = computed(() => {
    const max = Math.min(320, window.innerWidth - 72);
    return this.aspect() >= 1 ? { w: max, h: max / this.aspect() } : { w: max * this.aspect(), h: max };
  });
  private cover = computed(() => {
    const i = this.img();
    return i ? Math.max(this.frame().w / i.naturalWidth, this.frame().h / i.naturalHeight) : 1;
  });
  protected minZoom = computed(() => {
    const i = this.img();
    return i ? Math.min(this.frame().w / i.naturalWidth, this.frame().h / i.naturalHeight) / this.cover() : 1;
  });
  protected scale = computed(() => this.cover() * this.zoom());

  private url = '';
  private start: { px: number; py: number; x: number; y: number } | null = null;

  async ngOnInit() {
    this.url = URL.createObjectURL(this.source());
    const img = new Image();
    img.src = this.url;
    await img.decode();
    this.img.set(img);
    this.center(1);
  }

  ngOnDestroy() {
    URL.revokeObjectURL(this.url);
  }

  center(zoom: number) {
    const i = this.img();
    if (!i) return;
    this.zoom.set(zoom);
    this.x.set((this.frame().w - i.naturalWidth * this.scale()) / 2);
    this.y.set((this.frame().h - i.naturalHeight * this.scale()) / 2);
  }

  /** muda o zoom mantendo fixo o ponto da foto que está no meio da moldura */
  setZoom(zoom: number) {
    const i = this.img();
    if (!i) return;
    zoom = Math.min(MAX_ZOOM, Math.max(this.minZoom(), zoom));
    const { w, h } = this.frame();
    const cx = (w / 2 - this.x()) / this.scale();
    const cy = (h / 2 - this.y()) / this.scale();
    this.zoom.set(zoom);
    this.place(w / 2 - cx * this.scale(), h / 2 - cy * this.scale());
  }

  wheel(event: WheelEvent) {
    event.preventDefault();
    this.setZoom(this.zoom() * (event.deltaY < 0 ? 1.08 : 1 / 1.08));
  }

  grab(event: PointerEvent) {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.start = { px: event.clientX, py: event.clientY, x: this.x(), y: this.y() };
  }

  drag(event: PointerEvent) {
    if (!this.start) return;
    this.place(this.start.x + event.clientX - this.start.px, this.start.y + event.clientY - this.start.py);
  }

  drop() {
    this.start = null;
  }

  /** a foto não sai da moldura: maior que ela, cobre tudo; menor, fica dentro */
  private place(x: number, y: number) {
    const i = this.img()!;
    const dx = this.frame().w - i.naturalWidth * this.scale();
    const dy = this.frame().h - i.naturalHeight * this.scale();
    this.x.set(Math.min(Math.max(x, Math.min(0, dx)), Math.max(0, dx)));
    this.y.set(Math.min(Math.max(y, Math.min(0, dy)), Math.max(0, dy)));
  }

  async confirm() {
    const i = this.img()!;
    const out = this.aspect() >= 1
      ? { w: OUTPUT_SIDE, h: Math.round(OUTPUT_SIDE / this.aspect()) }
      : { w: Math.round(OUTPUT_SIDE * this.aspect()), h: OUTPUT_SIDE };
    const k = out.w / this.frame().w;
    const canvas = document.createElement('canvas');
    canvas.width = out.w;
    canvas.height = out.h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, out.w, out.h);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(i, this.x() * k, this.y() * k, i.naturalWidth * this.scale() * k, i.naturalHeight * this.scale() * k);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    if (blob) this.done.emit(new File([blob], 'imagem.jpg', { type: 'image/jpeg' }));
  }
}

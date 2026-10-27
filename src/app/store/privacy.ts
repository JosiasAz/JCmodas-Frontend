import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { ApiService } from '../core/api.service';

/** Bloco do texto da política: "## título", "- item" ou parágrafo. */
interface Block {
  kind: 'h2' | 'ul' | 'p';
  lines: string[];
}

@Component({
  selector: 'app-privacy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="container page">
      <h1>{{ kind() === 'trocas' ? 'Trocas e devoluções' : 'Política de privacidade' }}</h1>
      @if (blocks(); as list) {
        @for (b of list; track $index) {
          @switch (b.kind) {
            @case ('h2') {
              <h2>{{ b.lines[0] }}</h2>
            }
            @case ('ul') {
              <ul>
                @for (item of b.lines; track $index) {
                  <li>{{ item }}</li>
                }
              </ul>
            }
            @default {
              <p>{{ b.lines.join(' ') }}</p>
            }
          }
        }
      } @else {
        <div class="skeleton" style="height: 300px"></div>
      }
    </article>
  `,
  styles: `
    .page { max-width: 760px; padding-top: 36px; }
    h2 { font-size: 1.25rem; margin-top: 28px; }
    p, li { color: var(--ink-2); line-height: 1.7; }
    ul { padding-left: 20px; }
  `,
})
/** Página de política (privacidade ou trocas): o texto vem da API, escrito no painel ou o modelo automático. */
export class Privacy {
  /** vem do `data` da rota */
  readonly kind = input<'privacidade' | 'trocas'>('privacidade');
  private api = inject(ApiService);
  private text = signal<string | null>(null);

  // texto simples escrito no painel: "## " vira subtítulo, "- " vira lista (sem HTML, nada é interpretado)
  protected blocks = computed<Block[] | null>(() => {
    const text = this.text();
    if (text === null) return null;
    const blocks: Block[] = [];
    for (const raw of text.split('\n')) {
      const line = raw.trim();
      const last = blocks.at(-1);
      if (!line) {
        blocks.push({ kind: 'p', lines: [] });
      } else if (line.startsWith('## ')) {
        blocks.push({ kind: 'h2', lines: [line.slice(3)] });
      } else if (line.startsWith('- ')) {
        if (last?.kind === 'ul') last.lines.push(line.slice(2));
        else blocks.push({ kind: 'ul', lines: [line.slice(2)] });
      } else if (last?.kind === 'p') {
        last.lines.push(line);
      } else {
        blocks.push({ kind: 'p', lines: [line] });
      }
    }
    return blocks.filter((b) => b.lines.length);
  });

  constructor() {
    effect(() => {
      const request = this.kind() === 'trocas' ? this.api.exchange() : this.api.privacy();
      this.text.set(null);
      request.subscribe((p) => this.text.set(p.text));
    });
  }
}

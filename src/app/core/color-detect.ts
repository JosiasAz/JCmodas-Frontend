// Reconhece a cor da peça na foto, no próprio aparelho (sem enviar a foto para ninguém).
// Olha o miolo da imagem, descarta o que parece fundo (cor parecida com a das bordas)
// e dá o nome da cor mais comum entre o que sobrou.
const SIDE = 64;

/** Nome em português para uma cor RGB (0-255). */
export function colorName(r: number, g: number, b: number): string {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) {
    const [rn, gn, bn] = [r / 255, g / 255, b / 255];
    if (max === rn) h = 60 * (((gn - bn) / d) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / d + 2);
    else h = 60 * ((rn - gn) / d + 4);
    if (h < 0) h += 360;
  }
  if (l < 0.16) return 'Preto';
  if (s < 0.14) return l > 0.82 ? 'Branco' : l < 0.22 ? 'Preto' : 'Cinza';
  if (l > 0.9) return 'Branco';
  if (h < 15 || h >= 345) return l < 0.3 ? 'Vinho' : l > 0.72 ? 'Rosa' : 'Vermelho';
  if (h < 45) return l < 0.4 ? 'Marrom' : s < 0.5 && l > 0.55 ? 'Bege' : 'Laranja';
  if (h < 65) return s < 0.45 ? 'Bege' : l < 0.35 ? 'Verde' : 'Amarelo';
  if (h < 170) return 'Verde';
  if (h < 255) return l < 0.3 ? 'Azul-marinho' : 'Azul';
  if (h < 290) return 'Roxo';
  return l < 0.28 ? 'Vinho' : 'Rosa';
}

/** Cor principal da peça na foto, ou null se não der para ler a imagem. */
export async function detectColor(file: Blob): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file, { resizeWidth: SIDE, resizeHeight: SIDE, resizeQuality: 'medium' });
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIDE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const px = ctx.getImageData(0, 0, SIDE, SIDE).data;
    const at = (x: number, y: number) => {
      const i = (y * SIDE + x) * 4;
      return [px[i], px[i + 1], px[i + 2]];
    };

    // fundo = média das bordas (mesa, parede, cabide branco...)
    const border: number[][] = [];
    for (let i = 0; i < SIDE; i++) border.push(at(i, 0), at(i, SIDE - 1), at(0, i), at(SIDE - 1, i));
    const bg = [0, 1, 2].map((c) => border.reduce((sum, p) => sum + p[c], 0) / border.length);
    const far = (p: number[]) => Math.hypot(p[0] - bg[0], p[1] - bg[1], p[2] - bg[2]) > 48;

    const center: number[][] = [];
    for (let y = Math.floor(SIDE * 0.2); y < SIDE * 0.85; y++)
      for (let x = Math.floor(SIDE * 0.25); x < SIDE * 0.75; x++) center.push(at(x, y));
    const piece = center.filter(far);
    // peça da mesma cor do fundo (camiseta branca na mesa branca): usa o miolo inteiro
    const pixels = piece.length > center.length * 0.15 ? piece : center;

    const votes = new Map<string, number>();
    for (const [r, g, b] of pixels) {
      const name = colorName(r, g, b);
      votes.set(name, (votes.get(name) ?? 0) + 1);
    }
    return [...votes].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  } catch {
    return null;
  }
}

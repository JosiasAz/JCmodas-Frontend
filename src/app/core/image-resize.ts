// Foto de câmera de celular tem 3 a 12 MB; a API aceita até 4 MB.
// Aqui a imagem é reduzida no próprio aparelho antes do envio (também deixa o upload bem mais rápido no 4G).
const MAX_SIDE = 1600;
const QUALITY = 0.85;
const KEEP_BELOW = 1.5 * 1024 * 1024; // arquivos pequenos vão como estão (sem perder qualidade nem transparência)

/** Reduz a foto para no máximo 1600px no maior lado, em JPEG. Se não der para ler, devolve o arquivo original. */
export async function shrinkImage(file: File): Promise<File> {
  if (file.type === 'image/gif' || file.size <= KEEP_BELOW) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode(); // o navegador já aplica a rotação EXIF (foto "em pé" continua em pé)
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff'; // PNG transparente não fica com fundo preto no JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

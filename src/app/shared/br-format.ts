/** Máscaras brasileiras para os campos da loja e do checkout. */

export function onlyDigits(text: string, max?: number): string {
  const digits = text.replace(/\D/g, '');
  return max ? digits.slice(0, max) : digits;
}

/** "11222333000181" -> "11.222.333/0001-81". Formata também enquanto a pessoa digita. */
export function formatCnpj(text: string): string {
  const raw = text.replace(/[^0-9a-z]/gi, '').toUpperCase().slice(0, 14);
  if (!raw) return '';
  let out = raw.slice(0, 2);
  if (raw.length > 2) out += '.' + raw.slice(2, 5);
  if (raw.length > 5) out += '.' + raw.slice(5, 8);
  if (raw.length > 8) out += '/' + raw.slice(8, 12);
  if (raw.length > 12) out += '-' + raw.slice(12);
  return out;
}

export function formatCpf(text: string): string {
  const d = onlyDigits(text, 11);
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
  return d;
}

export function formatCep(text: string): string {
  const d = onlyDigits(text, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** "(92) 99329-9773" — celular (11) ou fixo (10). */
export function formatPhoneBR(text: string): string {
  const d = onlyDigits(text, 11);
  if (d.length > 10) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length > 6) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return d;
}

/**
 * Chave Pix: e-mail fica como está; CPF/CNPJ/celular ganham pontuação;
 * chave aleatória (UUID) não se mexe.
 */
export function formatPixKey(text: string): string {
  const raw = text.trim();
  if (!raw) return '';
  if (raw.includes('@')) return raw;
  if (/[a-f]/i.test(raw) && raw.replace(/-/g, '').length >= 32) return raw;
  const d = onlyDigits(raw);
  if (d.length === 14) return formatCnpj(d);
  if (d.length === 11) return formatCpf(d);
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) return formatPhoneBR(d.slice(2));
  if (d.length === 10) return formatPhoneBR(d);
  return raw;
}

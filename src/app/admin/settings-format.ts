/** Conversões dos campos da tela de Configurações: o lojista preenche campos simples e a loja guarda texto. */

// ------------------------------------------------------------------ WhatsApp

/** "+55 92 99329-9773", "(92) 99329-9773" ou "092..." viram "5592993299773" (mesma regra da API). */
export function normalizeWhatsapp(text: string): string {
  let digits = text.replace(/\D/g, '').replace(/^0+/, '');
  // colou sem o 55 (com "+" na frente o DDI já veio, ex.: +1 de outro país)
  if (!text.trim().startsWith('+') && (digits.length === 10 || digits.length === 11)) digits = '55' + digits;
  return digits;
}

export function isValidWhatsapp(digits: string): boolean {
  return digits.length >= 10 && digits.length <= 15;
}

/** "5592993299773" -> "+55 (92) 99329-9773". */
export function formatWhatsapp(digits: string): string {
  if (!digits) return '';
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    const num = digits.slice(4);
    return `+55 (${digits.slice(2, 4)}) ${num.slice(0, -4)}-${num.slice(-4)}`;
  }
  return '+' + digits;
}

/** "@perfil", "perfil" ou o link do perfil viram "perfil". */
export function normalizeInstagram(text: string): string {
  return text
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, '')
    .split('?')[0]
    .replace(/^\/+|\/+$/g, '')
    .replace(/^@+/, '');
}

// ------------------------------------------------------------------ horário

export const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export interface DayHours {
  open: boolean;
  from: string; // "08:00"
  to: string;
}

const DEFAULT_FROM = '08:00';
const DEFAULT_TO = '18:00';

function closedWeek(): DayHours[] {
  return WEEKDAYS.map(() => ({ open: false, from: DEFAULT_FROM, to: DEFAULT_TO }));
}

/** "08:00" -> "8h", "08:30" -> "8h30". */
function shortTime(time: string): string {
  const [h, m] = time.split(':');
  return `${Number(h)}h${m && m !== '00' ? m : ''}`;
}

/** "8h30" -> "08:30". */
function inputTime(hours: string, minutes?: string): string {
  return `${hours.padStart(2, '0')}:${minutes ?? '00'}`;
}

/** Junta dias seguidos com o mesmo horário: "Seg a Sex: 8h às 18h · Sáb: 8h às 12h". */
export function formatHours(week: DayHours[]): string {
  const groups: { first: number; last: number; from: string; to: string }[] = [];
  week.forEach((d, i) => {
    if (!d.open) return;
    const prev = groups.at(-1);
    if (prev && prev.last === i - 1 && prev.from === d.from && prev.to === d.to) prev.last = i;
    else groups.push({ first: i, last: i, from: d.from, to: d.to });
  });
  return groups
    .map((g) => {
      const days =
        g.last - g.first === 6 ? 'Todos os dias'
        : g.first === g.last ? WEEKDAYS[g.first]
        : `${WEEKDAYS[g.first]} ${g.last - g.first === 1 ? 'e' : 'a'} ${WEEKDAYS[g.last]}`;
      return `${days}: ${shortTime(g.from)} às ${shortTime(g.to)}`;
    })
    .join(' · ');
}

const TIME_RANGE = /(\d{1,2})\s*(?:h|:)\s*(\d{2})?\s*(?:às|as|a|-|–|até)\s*(\d{1,2})\s*(?:h|:)?\s*(\d{2})?/i;

/** Lê o texto salvo de volta para a semana. Texto antigo escrito à mão: usa o horário dele de segunda a sábado. */
export function parseHours(text: string): DayHours[] {
  const week = closedWeek();
  if (!text.trim()) return week;
  const ok = text.split(' · ').every((part) => {
    const m = part.match(/^(.+): (\d{1,2})h(\d{2})? às (\d{1,2})h(\d{2})?$/);
    if (!m) return false;
    const days = dayRange(m[1]);
    if (!days) return false;
    for (const i of days) week[i] = { open: true, from: inputTime(m[2], m[3]), to: inputTime(m[4], m[5]) };
    return true;
  });
  if (ok) return week;

  const legacy = closedWeek();
  const m = text.match(TIME_RANGE);
  if (m) for (let i = 0; i < 6; i++) legacy[i] = { open: true, from: inputTime(m[1], m[2]), to: inputTime(m[3], m[4]) };
  return legacy;
}

function dayRange(label: string): number[] | null {
  if (label === 'Todos os dias') return [0, 1, 2, 3, 4, 5, 6];
  const m = label.match(/^(\S+) (a|e) (\S+)$/);
  const first = WEEKDAYS.indexOf(m ? m[1] : label);
  const last = m ? WEEKDAYS.indexOf(m[3]) : first;
  if (first < 0 || last < first) return null;
  return Array.from({ length: last - first + 1 }, (_, k) => first + k);
}

// ------------------------------------------------------------------ endereço

export interface AddressParts {
  cep: string; // "69085-000"
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
}

export function emptyAddress(): AddressParts {
  return { cep: '', street: '', number: '', complement: '', district: '', city: '', state: '' };
}

/** "Rua Massapê, 40 (Loja 2) - São José Operário, Manaus/AM - CEP 69085-000". */
export function formatAddress(a: AddressParts): string {
  const complement = a.complement.trim() ? ` (${a.complement.trim()})` : '';
  const district = a.district.trim() ? `${a.district.trim()}, ` : '';
  return `${a.street.trim()}, ${a.number.trim() || 's/n'}${complement} - ${district}${a.city}/${a.state} - CEP ${a.cep}`;
}

const ADDRESS = /^(.+), ([^,()]+?)(?: \(([^)]*)\))? - (?:(.+), )?([^,]+)\/([A-Z]{2}) - CEP (\d{5}-\d{3})$/;

/** Lê o endereço salvo por esta tela; null se foi escrito à mão antes (formato livre). */
export function parseAddress(text: string): AddressParts | null {
  const m = text.match(ADDRESS);
  if (!m) return null;
  return {
    street: m[1],
    number: m[2] === 's/n' ? '' : m[2],
    complement: m[3] ?? '',
    district: m[4] ?? '',
    city: m[5],
    state: m[6],
    cep: m[7],
  };
}

export function isAddressComplete(a: AddressParts): boolean {
  return /^\d{5}-\d{3}$/.test(a.cep) && !!a.street.trim() && !!a.city && !!a.state;
}

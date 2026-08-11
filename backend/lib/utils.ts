import { clsx } from 'clsx';

export function cn(...classes: Array<string | false | null | undefined>) {
  return clsx(classes);
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Diferença de dias sem piso — pode ser 0 ou negativa. Usada para calcular
// deslocamentos (ex.: posição de um bloco na grade do calendário), onde um
// resultado de "no mínimo 1" deslocaria incorretamente eventos que começam
// no próprio dia de referência (ou antes dele).
export function daysBetween(start: Date, end: Date) {
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((end.getTime() - start.getTime()) / millisecondsPerDay);
}

export function differenceInDays(start: Date, end: Date) {
  return Math.max(1, daysBetween(start, end));
}

export function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

export function extractDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function formatCurrencyInput(value: string, currency = 'BRL', locale = 'pt-BR') {
  const digits = extractDigits(value);
  const amount = Number(digits || '0') / 100;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function parseCurrencyInput(value: string) {
  return Number(extractDigits(value) || '0') / 100;
}

export function formatCpfInput(value: string) {
  const digits = extractDigits(value).slice(0, 11);

  if (digits.length > 9) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  }
  if (digits.length > 6) {
    return digits.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
  }
  if (digits.length > 3) {
    return digits.replace(/(\d{3})(\d{1,3})/, '$1.$2');
  }
  return digits;
}

export function formatPhoneInput(value: string) {
  const digits = extractDigits(value).slice(0, 11);

  if (digits.length > 10) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (digits.length > 6) {
    return digits.replace(/(\d{2})(\d{4})(\d{1,4})/, '($1) $2-$3');
  }
  if (digits.length > 2) {
    return digits.replace(/(\d{2})(\d{1,4})/, '($1) $2');
  }
  if (digits.length > 0) {
    return digits.replace(/(\d{1,2})/, '($1');
  }
  return digits;
}

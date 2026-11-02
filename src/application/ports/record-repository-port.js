/**
 * Porta de Saída (Driven Port) para Persistência de Recordes de Fuga.
 * Público-alvo: Desenvolvedores que implementam novos adaptadores de persistência
 * (ex.: LocalStorage, IndexedDB, API REST em localhost) respeitando a Inversão de Dependência (DIP).
 */

export const RECORDS_STORAGE_KEY = 'fuga_do_pacoca_records';

export function formatEscapeTime(seconds) {
  const numericSeconds = Number(seconds);
  if (!Number.isFinite(numericSeconds) || numericSeconds < 0) return '--';
  return `${numericSeconds.toFixed(2)}s`;
}

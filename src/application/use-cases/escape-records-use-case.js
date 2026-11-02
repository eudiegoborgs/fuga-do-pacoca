/**
 * Caso de Uso: Registro e Ranking dos Tempos de Fuga Concluída.
 * Regra de Negócio Invariante: O tempo só vira recorde quando o Paçoca realmente foge pelo Portão
 * (`status === EstadoDaPartida.FUGA_CONCLUIDA`). Capturas ou banhos nunca geram recorde.
 */
import { EstadoDaPartida } from '../../domain/ubiquitous-language.js';
import { RECORDS_STORAGE_KEY } from '../ports/record-repository-port.js';

let memoryRecordsFallback = [];

export function loadEscapeRecords(storage = globalThis?.localStorage) {
  try {
    if (storage && typeof storage.getItem === 'function') {
      const rawJson = storage.getItem(RECORDS_STORAGE_KEY);
      if (!rawJson) return [];
      const parsedRecords = JSON.parse(rawJson);
      return Array.isArray(parsedRecords) ? parsedRecords : [];
    }
  } catch {
    // Fallback em memória para ambientes sem Web Storage (ex.: testes Node.js)
  }
  return [...memoryRecordsFallback];
}

export function clearEscapeRecords(storage = globalThis?.localStorage) {
  memoryRecordsFallback = [];
  try {
    if (storage && typeof storage.removeItem === 'function') {
      storage.removeItem(RECORDS_STORAGE_KEY);
    }
  } catch {
    // Ignora falha de acesso ao storage
  }
}

export function recordEscapeWin(
  timeSeconds,
  layoutId = 'planta_01',
  storage = globalThis?.localStorage,
  status = EstadoDaPartida.FUGA_CONCLUIDA,
  onPersistRemote = null
) {
  if (status !== EstadoDaPartida.FUGA_CONCLUIDA) {
    return null;
  }

  const sanitizedTime = Math.max(0.01, Number(Number(timeSeconds || 0).toFixed(2)));
  const existingRecords = loadEscapeRecords(storage);
  const previousBestTime = existingRecords.length > 0 ? existingRecords[0].time : Infinity;
  const newRecordEntry = {
    time: sanitizedTime,
    layoutId: layoutId || 'planta_01',
    status: EstadoDaPartida.FUGA_CONCLUIDA,
    date: new Date().toISOString(),
  };

  const rankedRecords = [...existingRecords, newRecordEntry]
    .sort((first, second) => first.time - second.time)
    .slice(0, 10);

  memoryRecordsFallback = rankedRecords;
  try {
    if (storage && typeof storage.setItem === 'function') {
      storage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(rankedRecords));
    }
  } catch {
    // Ignora falha de escrita em storage restrito
  }

  if (typeof onPersistRemote === 'function') {
    onPersistRemote(newRecordEntry);
  } else if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    window
      .fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecordEntry),
      })
      .catch(() => {});
  }

  const rankPosition = rankedRecords.findIndex((record) => record === newRecordEntry) + 1;
  return {
    entry: newRecordEntry,
    bestTime: rankedRecords[0].time,
    isNewRecord: sanitizedTime <= previousBestTime,
    rank: rankPosition || rankedRecords.length,
    records: rankedRecords,
  };
}

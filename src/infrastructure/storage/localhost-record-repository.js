/**
 * Adaptador de Infraestrutura: Persistência e Sincronização de Recordes em Localhost
 * (`localStorage` + endpoint HTTP `/api/records`).
 */
import { GAME_CONFIG } from '../../config/game-config.js';
import { RECORDS_STORAGE_KEY } from '../../application/ports/record-repository-port.js';
import { loadEscapeRecords } from '../../application/use-cases/escape-records-use-case.js';

export function syncRecordsWithLocalhostServer(onSyncedCallback) {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
    return;
  }

  window
    .fetch(GAME_CONFIG.environment.recordsApiEndpoint)
    .then((response) => (response.ok ? response.json() : null))
    .then((serverRecords) => {
      if (Array.isArray(serverRecords) && serverRecords.length > 0) {
        const localRecords = loadEscapeRecords();
        const mergedRecords = [...localRecords, ...serverRecords]
          .sort((first, second) => first.time - second.time)
          .slice(0, GAME_CONFIG.environment.maxSavedRecords);
        try {
          localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(mergedRecords));
        } catch {
          // Ignora falha de escrita em storage restrito
        }
        if (typeof onSyncedCallback === 'function') {
          onSyncedCallback(mergedRecords);
        }
      }
    })
    .catch(() => {});
}

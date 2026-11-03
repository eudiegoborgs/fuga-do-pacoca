/**
 * Fachada Pública de Entidades, Regras de Domínio e Casos de Uso da Partida.
 * Mantém a API pública coesa enquanto delega às camadas `src/domain/` e `src/application/`.
 */
export {
  GAME_CONFIG,
  BASE_SPEED,
  HUMAN_VISION_RANGE,
  MEGGIE_VISION_RANGE,
  SPIKE_DOMAIN_RADIUS,
} from './config/game-config.js';

export {
  EstadoDaPartida,
  ModoDoHumano,
  ModoDoCao,
  EventoSonoro,
} from './domain/partida-states.js';

export {
  alertHumans,
  alertHumansInSameRoom,
} from './domain/rules/stealth-and-pee-rules.js';

export {
  RECORDS_STORAGE_KEY,
  formatEscapeTime,
} from './application/ports/record-repository-port.js';

export {
  loadEscapeRecords,
  clearEscapeRecords,
  recordEscapeWin,
} from './application/use-cases/escape-records-use-case.js';

export {
  createInitialState,
  stepGame,
} from './application/use-cases/escape-simulation-use-case.js';

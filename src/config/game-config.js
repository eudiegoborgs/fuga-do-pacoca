/**
 * Configuração Centralizada com Contexto (Variáveis de Ambiente e Constantes do Jogo).
 * Substitui "números mágicos" espalhados pelo código por parâmetros agrupados por contexto
 * e permite sobrescrita via variáveis de ambiente (`process.env` no Node/CI ou `globalThis.__ENV__` no browser).
 */

const rawEnv =
  (typeof process !== 'undefined' && process?.env) ||
  globalThis?.__ENV__ ||
  {};

function readEnvNumber(key, fallbackValue) {
  const rawValue = rawEnv[key];
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return fallbackValue;
  }
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
}

function readEnvString(key, fallbackValue) {
  const rawValue = rawEnv[key];
  return typeof rawValue === 'string' && rawValue.trim().length > 0
    ? rawValue.trim()
    : fallbackValue;
}

const humanVisionRangePx = readEnvNumber('PACOCA_HUMAN_VISION_RANGE_PX', 190);
const meggieVisionRangePx = readEnvNumber(
  'PACOCA_MEGGIE_VISION_RANGE_PX',
  humanVisionRangePx / 2
);

export const GAME_CONFIG = Object.freeze({
  environment: Object.freeze({
    nodeEnv: readEnvString('NODE_ENV', 'development'),
    serverHost: readEnvString('HOST', '127.0.0.1'),
    serverPort: readEnvNumber('PORT', 8080),
    recordsApiEndpoint: readEnvString('PACOCA_RECORDS_API_ENDPOINT', '/api/records'),
    recordsStorageKey: readEnvString(
      'PACOCA_RECORDS_STORAGE_KEY',
      'fuga_do_pacoca_records'
    ),
    maxSavedRecords: readEnvNumber('PACOCA_MAX_SAVED_RECORDS', 10),
    leaderboardDisplayLimit: readEnvNumber('PACOCA_LEADERBOARD_DISPLAY_LIMIT', 5),
  }),

  movement: Object.freeze({
    baseSpeedPxPerSec: readEnvNumber('PACOCA_BASE_SPEED_PX_PER_SEC', 210),
    maxFrameDeltaSeconds: readEnvNumber('PACOCA_MAX_FRAME_DELTA_SECONDS', 0.05),
  }),

  vision: Object.freeze({
    humanVisionRangePx,
    meggieVisionRangePx,
    spikeDomainRadiusPx: readEnvNumber(
      'PACOCA_SPIKE_DOMAIN_RADIUS_PX',
      meggieVisionRangePx
    ),
    cameraDetectionSeconds: readEnvNumber('PACOCA_CAMERA_DETECTION_SECONDS', 0.35),
  }),

  gameplay: Object.freeze({
    pacocaMaxHearts: readEnvNumber('PACOCA_MAX_HEARTS', 3),
    peeCooldownSeconds: readEnvNumber('PACOCA_PEE_COOLDOWN_SECONDS', 5.0),
    spikeFightFreezeSeconds: readEnvNumber('PACOCA_SPIKE_FIGHT_FREEZE_SECONDS', 0.5),
    spikeFightCooldownSeconds: readEnvNumber('PACOCA_SPIKE_FIGHT_COOLDOWN_SECONDS', 2.4),
    meggieBarkCooldownSeconds: readEnvNumber('PACOCA_MEGGIE_BARK_COOLDOWN_SECONDS', 3.0),
    houseAlertDurationSeconds: readEnvNumber('PACOCA_HOUSE_ALERT_DURATION_SECONDS', 3.2),
    diegoWorkCallIntervalSeconds: readEnvNumber('PACOCA_DIEGO_CALL_INTERVAL_SECONDS', 16.0),
    diegoWorkCallDurationSeconds: readEnvNumber('PACOCA_DIEGO_CALL_DURATION_SECONDS', 5.0),
    stefannyDistractionSeconds: readEnvNumber('PACOCA_STEFANNY_DISTRACTION_SECONDS', 4.5),
  }),
});

export const BASE_SPEED = GAME_CONFIG.movement.baseSpeedPxPerSec;
export const HUMAN_VISION_RANGE = GAME_CONFIG.vision.humanVisionRangePx;
export const MEGGIE_VISION_RANGE = GAME_CONFIG.vision.meggieVisionRangePx;
export const SPIKE_DOMAIN_RADIUS = GAME_CONFIG.vision.spikeDomainRadiusPx;
export const PEE_COOLDOWN_SECONDS = GAME_CONFIG.gameplay.peeCooldownSeconds;
export const RECORDS_STORAGE_KEY = GAME_CONFIG.environment.recordsStorageKey;

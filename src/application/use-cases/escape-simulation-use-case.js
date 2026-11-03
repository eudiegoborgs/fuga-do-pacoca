/**
 * Caso de Uso Principal: Orquestração da Partida "A Fuga do Paçoca" (`createInitialState` e `stepGame`).
 * Compõe as fábricas e regras de domínio mantendo coesão alta e baixo acoplamento.
 */
import { BASE_SPEED } from '../../config/game-config.js';
import {
  EstadoDaPartida,
  EventoSonoro,
} from '../../domain/partida-states.js';
import {
  circleIntersectsRect,
  resolveWallCollisions,
  isPointInCone,
} from '../../domain/geometry/spatial-vision.js';
import {
  MAP_CONFIG,
  generateHouseLayout,
} from '../../domain/house/house-layout-generator.js';
import {
  createPacocaEntity,
  createSecurityCameras,
  createHouseDogs,
  createFamilyHumans,
} from '../../domain/family/family-roster-factory.js';
import { isPacocaInStartSafeBlindSpot } from '../../domain/rules/house-zones.js';
import {
  alertHumans,
  applyWaterDamage,
  tryCreatePeePuddle,
} from '../../domain/rules/stealth-and-pee-rules.js';
import {
  updateSpikeTerritoryDomain,
  updateMeggieHousePatrol,
} from '../../domain/rules/dog-behavior-rules.js';
import { updateHumanEntity } from '../../domain/rules/human-behavior-rules.js';
import { recordEscapeWin } from './escape-records-use-case.js';

export function createInitialState() {
  const floorplan = generateHouseLayout();
  const { spike, meggie, dogs } = createHouseDogs(floorplan);

  return {
    status: EstadoDaPartida.EM_ANDAMENTO,
    time: 0,
    escapeTime: null,
    recordSummary: null,
    map: floorplan,
    capturedBy: null,
    houseAlertTimer: 0,
    lastAlertSource: '',
    soundEvents: [],
    puddles: [],
    peePuddles: [],
    spike,
    meggie,
    dogs,
    pacoca: createPacocaEntity(floorplan.spawn),
    cameras: createSecurityCameras(floorplan.cameras),
    humans: createFamilyHumans(floorplan),
  };
}

function updatePacocaMovementAndCooldowns(state, input, dt) {
  const pacoca = state.pacoca;
  const walls = (state.map || MAP_CONFIG).walls;

  if (pacoca.invulnTimer > 0) pacoca.invulnTimer = Math.max(0, pacoca.invulnTimer - dt);
  if (pacoca.slowTimer > 0) pacoca.slowTimer = Math.max(0, pacoca.slowTimer - dt);
  if (pacoca.fightTimer > 0) pacoca.fightTimer = Math.max(0, pacoca.fightTimer - dt);
  if (pacoca.peeCooldown > 0) pacoca.peeCooldown = Math.max(0, pacoca.peeCooldown - dt);
  if (pacoca.peeingTimer > 0) pacoca.peeingTimer = Math.max(0, pacoca.peeingTimer - dt);

  if (input?.pee && pacoca.peeCooldown <= 0) {
    tryCreatePeePuddle(state);
  }

  const rawDx = Number(input?.dx || 0);
  const rawDy = Number(input?.dy || 0);
  const inputMagnitude = Math.hypot(rawDx, rawDy);

  if (inputMagnitude > 1e-4 && !(pacoca.fightTimer > 0)) {
    const normalizedDx = rawDx / inputMagnitude;
    const normalizedDy = rawDy / inputMagnitude;
    const speedFactor = pacoca.slowTimer > 0 ? 0.65 : 1.0;
    const stepDistance = BASE_SPEED * speedFactor * Math.min(1, inputMagnitude) * dt;
    const nextPosition = resolveWallCollisions(
      pacoca.x + normalizedDx * stepDistance,
      pacoca.y + normalizedDy * stepDistance,
      pacoca.radius,
      walls
    );
    pacoca.x = nextPosition.x;
    pacoca.y = nextPosition.y;
    pacoca.angle = Math.atan2(normalizedDy, normalizedDx);
    pacoca.isMoving = true;
    pacoca.furShakePhase += dt * 14;
  } else {
    pacoca.isMoving = false;
  }
}

function updateSecurityCameras(state, dt) {
  const pacoca = state.pacoca;
  const walls = (state.map || MAP_CONFIG).walls;

  for (const camera of state.cameras) {
    camera.angle =
      camera.baseAngle + Math.sin(state.time * camera.sweepSpeed) * camera.sweepAngle;
    if (camera.alertCooldown > 0) {
      camera.alertCooldown = Math.max(0, camera.alertCooldown - dt);
    }

    const seesPacoca = isPointInCone(
      pacoca.x,
      pacoca.y,
      camera.x,
      camera.y,
      camera.angle,
      camera.fov,
      camera.range,
      walls
    );

    if (seesPacoca) {
      camera.exposure += dt;
      if (camera.exposure >= 0.35) {
        camera.alerted = true;
        if (camera.alertCooldown <= 0) {
          camera.alertCooldown = 3.0;
          state.soundEvents.push(EventoSonoro.BIP_CAMERA);
          alertHumans(state, pacoca.x, pacoca.y, camera.label);
        }
      }
    } else {
      camera.exposure = Math.max(0, camera.exposure - dt * 1.5);
      if (camera.exposure === 0 && camera.alertCooldown === 0) {
        camera.alerted = false;
      }
    }
  }
}

function updateWaterPuddles(state, dt) {
  const pacoca = state.pacoca;
  for (let index = state.puddles.length - 1; index >= 0; index--) {
    const puddle = state.puddles[index];
    puddle.ttl -= dt;
    if (puddle.ttl <= 0) {
      state.puddles.splice(index, 1);
      continue;
    }
    const distanceToPuddle = Math.hypot(pacoca.x - puddle.x, pacoca.y - puddle.y);
    if (distanceToPuddle < pacoca.radius + puddle.radius) {
      applyWaterDamage(state);
      if (state.status !== EstadoDaPartida.EM_ANDAMENTO) return;
    }
  }
}

export function stepGame(state, input, dt) {
  if (state.status !== EstadoDaPartida.EM_ANDAMENTO) return state;

  state.time += dt;
  state.soundEvents = [];

  if (state.houseAlertTimer > 0) {
    state.houseAlertTimer = Math.max(0, state.houseAlertTimer - dt);
  }

  updatePacocaMovementAndCooldowns(state, input, dt);

  const exitGate = (state.map || MAP_CONFIG).exitGate;
  if (circleIntersectsRect(state.pacoca.x, state.pacoca.y, state.pacoca.radius, exitGate)) {
    state.status = EstadoDaPartida.FUGA_CONCLUIDA;
    state.escapeTime = Math.max(0.01, Number(state.time.toFixed(2)));
    state.recordSummary = recordEscapeWin(
      state.escapeTime,
      state.map?.layoutId,
      undefined,
      state.status
    );
    state.soundEvents.push(EventoSonoro.PORTAO_ALCANCADO);
    return state;
  }

  const isPacocaInSafeBlindSpot = isPacocaInStartSafeBlindSpot(state);

  updateSpikeTerritoryDomain(state, dt, isPacocaInSafeBlindSpot);
  if (state.status !== EstadoDaPartida.EM_ANDAMENTO) return state;

  updateMeggieHousePatrol(state, dt, isPacocaInSafeBlindSpot);
  updateSecurityCameras(state, dt);
  updateWaterPuddles(state, dt);
  if (state.status !== EstadoDaPartida.EM_ANDAMENTO) return state;

  for (const human of state.humans) {
    updateHumanEntity(human, state, dt, isPacocaInSafeBlindSpot);
    if (state.status !== EstadoDaPartida.EM_ANDAMENTO) return state;
  }

  return state;
}

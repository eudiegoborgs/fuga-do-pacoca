/**
 * Regras de Furtividade, Alertas da Casa, Jatos de Água e Habilidade de Xixi do Paçoca.
 */
import {
  BASE_SPEED,
  EstadoDaPartida,
  ModoDoHumano,
  EventoSonoro,
} from '../ubiquitous-language.js';
import { isPointInCone } from '../geometry/spatial-vision.js';
import { MAP_CONFIG } from '../house/house-layout-generator.js';
import {
  isInYard,
  isInGarage,
  isInsideHouse,
  countOtherActiveIndoorHumans,
  moveEntityToward,
} from './house-zones.js';

export function triggerStefannyDistraction(state, reasonSpeech) {
  const stefanny = state.humans.find((human) => human.id === 'stefanny');
  if (!stefanny) return;
  stefanny.mode = ModoDoHumano.DISTRAIDA;
  stefanny.distractionTimer = 4.5;
  stefanny.distractionCooldown = 10.5;
  stefanny.waterActive = false;
  stefanny.statusLabel = 'Distraída (TDAH/Filhos) 💭';
  stefanny.speech = reasonSpeech || 'Espera, o que eu vim fazer aqui mesmo?';
  stefanny.speechTimer = 4.2;
  state.soundEvents.push(EventoSonoro.DISTRACAO);
}

export function applyWaterDamage(state) {
  const pacoca = state.pacoca;
  if (pacoca.invulnTimer > 0) return;
  pacoca.hearts = Math.max(0, pacoca.hearts - 1);
  pacoca.invulnTimer = 1.2;
  pacoca.slowTimer = 0.8;
  state.soundEvents.push(EventoSonoro.JATO_AGUA);
  if (pacoca.hearts <= 0) {
    state.status = EstadoDaPartida.ENCHARCADO_DE_BANHO;
  }
}

function wakeDistractedHumanOnCameraAlert(human, state) {
  if (human.id === 'diego' && human.inCall) {
    human.inCall = false;
    human.callTimer = 0;
    human.callCooldown = 13.0;
    human.mode = ModoDoHumano.PATRULHA;
    human.statusLabel = 'Alerta da Câmera! 👀';
    human.speech = 'Alarme da câmera! Desligando a call!';
    human.speechTimer = 2.0;
  }
  if (human.id === 'stefanny' && human.mode === ModoDoHumano.DISTRAIDA) {
    human.mode = ModoDoHumano.PATRULHA;
    human.distractionTimer = 0;
    human.distractionCooldown = 10.0;
    human.waterActive = true;
    human.statusLabel = 'Rondando a Garagem 💦';
    human.speech = 'A câmera apitou! Foco total!';
    human.speechTimer = 2.0;
  }
  if (human.id === 'emily' && human.mode === ModoDoHumano.PIRUETA_DE_BALE) {
    human.mode = ModoDoHumano.PATRULHA;
    human.pirouetteDuration = 0;
    human.pirouetteTimer = 5.5;
    human.statusLabel = 'Patinando 🛼';
  }
  if (human.id === 'arthur' && human.mode === ModoDoHumano.MANOBRA_DE_SKATE) {
    human.mode = ModoDoHumano.PATRULHA;
    human.trickTimer = 0;
    human.trickCooldown = 7.0;
    human.statusLabel = 'Skate no Quintal 🛹';
  }
  if (human.mode === ModoDoHumano.LIMPANDO_XIXI) {
    if (human.targetPee) {
      const puddleIndex = state.peePuddles.indexOf(human.targetPee);
      if (puddleIndex !== -1) state.peePuddles.splice(puddleIndex, 1);
      human.targetPee = null;
    }
    human.cleanTimer = 0;
    human.mode = ModoDoHumano.PATRULHA;
    if (human.id === 'stefanny') human.waterActive = true;
    if (human.id === 'bryan') human.isHumming = true;
    human.speech = 'A câmera apitou! Depois eu limpo!';
    human.speechTimer = 2.0;
  }
}

export function alertHumans(state, targetX, targetY, sourceName) {
  state.houseAlertTimer = 4.5;
  state.lastAlertSource = sourceName;
  const isCameraAlert = String(sourceName || '').startsWith('Câm');

  for (const human of state.humans) {
    if (isCameraAlert) {
      wakeDistractedHumanOnCameraAlert(human, state);
    }

    if (human.id === 'diego' && human.inCall) continue;
    if (human.id === 'stefanny' && human.mode === ModoDoHumano.DISTRAIDA) continue;
    if (
      human.mode === ModoDoHumano.PERSEGUICAO ||
      human.mode === ModoDoHumano.GRITANDO ||
      human.mode === ModoDoHumano.REAGINDO
    ) {
      continue;
    }
    if (human.stayInYard && !isInYard(targetX, targetY)) continue;
    if (human.stayInGarage && !isInGarage(targetX, targetY)) continue;
    if (
      isInsideHouse(human.x, human.y) &&
      !isInsideHouse(targetX, targetY) &&
      countOtherActiveIndoorHumans(state, human.id) === 0
    ) {
      continue;
    }

    const distanceToAlert = Math.hypot(human.x - targetX, human.y - targetY);
    if (distanceToAlert <= 500) {
      human.mode = ModoDoHumano.INVESTIGACAO;
      human.investigateTarget = { x: targetX, y: targetY, timer: 4.5 };
      human.speech = `O que foi isso?! (${sourceName})`;
      human.speechTimer = 2.0;
    }
  }
}

export function alertHumansInSameRoom(state, targetX, targetY, sourceName) {
  state.houseAlertTimer = 4.5;
  state.lastAlertSource = sourceName;
  const rooms = (state.map || MAP_CONFIG).rooms || [];
  const targetRooms = rooms.filter(
    (room) =>
      targetX >= room.x &&
      targetX <= room.x + room.w &&
      targetY >= room.y &&
      targetY <= room.y + room.h
  );

  for (const human of state.humans) {
    if (human.id === 'diego' && human.inCall) continue;
    if (human.id === 'stefanny' && human.mode === ModoDoHumano.DISTRAIDA) continue;
    if (
      human.mode === ModoDoHumano.PERSEGUICAO ||
      human.mode === ModoDoHumano.GRITANDO ||
      human.mode === ModoDoHumano.REAGINDO
    ) {
      continue;
    }

    const inSameRoom = targetRooms.some(
      (room) =>
        human.x >= room.x &&
        human.x <= room.x + room.w &&
        human.y >= room.y &&
        human.y <= room.y + room.h
    );
    if (inSameRoom) {
      human.mode = ModoDoHumano.INVESTIGACAO;
      human.investigateTarget = { x: targetX, y: targetY, timer: 4.5 };
      human.speech = `Eita! Que briga é essa?! (${sourceName})`;
      human.speechTimer = 2.0;
    }
  }
}

export function tryCreatePeePuddle(state) {
  const pacoca = state.pacoca;
  const walls = (state.map || MAP_CONFIG).walls;

  const isWatchedByAnyHuman = state.humans.some((human) => {
    if (human.id === 'diego' && human.inCall) return false;
    if (human.id === 'stefanny' && human.mode === ModoDoHumano.DISTRAIDA) return false;
    if (human.mode === ModoDoHumano.LIMPANDO_XIXI) return false;
    return isPointInCone(
      pacoca.x,
      pacoca.y,
      human.x,
      human.y,
      human.angle,
      human.fov,
      human.visionRange,
      walls
    );
  });

  if (!isWatchedByAnyHuman) {
    state.peePuddles.push({
      id: `pee_${state.time.toFixed(3)}_${state.peePuddles.length}`,
      x: pacoca.x,
      y: pacoca.y,
      radius: 14,
      cleanerId: null,
    });
    pacoca.peeCooldown = pacoca.peeMaxCooldown;
    pacoca.peeingTimer = 0.45;
    state.soundEvents.push(EventoSonoro.XIXI_NO_CHAO);
  } else {
    state.soundEvents.push(EventoSonoro.XIXI_BLOQUEADO);
  }
}

export function updateHumanPeeCleaning(human, state, dt) {
  if (human.id === 'diego' && human.inCall) return false;

  if (human.mode === ModoDoHumano.LIMPANDO_XIXI && human.targetPee) {
    if (human.id === 'stefanny') human.waterActive = false;
    if (human.id === 'bryan') human.isHumming = false;
    const reachedPee = moveEntityToward(
      human,
      human.targetPee.x,
      human.targetPee.y,
      BASE_SPEED * 0.85,
      dt,
      state
    );
    if (reachedPee || Math.hypot(human.x - human.targetPee.x, human.y - human.targetPee.y) <= 18) {
      human.cleanTimer -= dt;
      human.statusLabel = `Limpando Xixi (${Math.ceil(Math.max(0, human.cleanTimer))}s) 🧻`;
      if (human.cleanTimer <= 0) {
        const puddleIndex = state.peePuddles.indexOf(human.targetPee);
        if (puddleIndex !== -1) state.peePuddles.splice(puddleIndex, 1);
        human.targetPee = null;
        human.mode = ModoDoHumano.PATRULHA;
        if (human.id === 'stefanny') human.waterActive = true;
        if (human.id === 'bryan') human.isHumming = true;
        human.speech = 'Pronto, xixi limpo! 🧼';
        human.speechTimer = 1.8;
      }
    } else {
      human.statusLabel = 'Indo limpar xixi! 🧻';
    }
    return true;
  }

  const walls = (state.map || MAP_CONFIG).walls;
  const visiblePeePuddle = state.peePuddles.find((pee) => {
    if (pee.cleanerId) return false;
    if (human.stayInYard && !isInYard(pee.x, pee.y)) return false;
    if (human.stayInGarage && !isInGarage(pee.x, pee.y)) return false;
    if (
      isInsideHouse(human.x, human.y) &&
      !isInsideHouse(pee.x, pee.y) &&
      countOtherActiveIndoorHumans(state, human.id) === 0
    ) {
      return false;
    }
    return isPointInCone(
      pee.x,
      pee.y,
      human.x,
      human.y,
      human.angle,
      human.fov,
      human.visionRange,
      walls
    );
  });

  if (visiblePeePuddle) {
    visiblePeePuddle.cleanerId = human.id;
    human.mode = ModoDoHumano.LIMPANDO_XIXI;
    human.targetPee = visiblePeePuddle;
    human.cleanTimer = 3.0;
    if (human.id === 'stefanny') human.waterActive = false;
    if (human.id === 'bryan') human.isHumming = false;
    human.statusLabel = 'Indo limpar xixi! 🧻';
    human.speech = 'EITA! O Paçoca fez xixi aqui! Vou limpar! 🧻';
    human.speechTimer = 3.0;
    state.soundEvents.push(EventoSonoro.DISTRACAO);
    return true;
  }

  return false;
}
